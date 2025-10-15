import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { InventoryItem } from '../models/InventoryItem';
import { createInventorySchema, updateInventorySchema, inventoryQuerySchema, type InventoryQuery } from '../schemas';
import { uploadToCloudinary } from '../config/cloudinary';
import { mirrorInventoryItem } from '../utils/mirrorHelper';

interface AuthRequest extends Request {
  user?: any;
}

export const getInventory = async (req: Request, res: Response) => {
  try {
    logger.debug('=== INVENTORY GET REQUEST ===');
    logger.debug('Raw query params:', req.query);
    
    const query: InventoryQuery = inventoryQuerySchema.parse(req.query);
    logger.debug('Parsed query:', query);
    
    const filter: any = {};
    
    if (query.finalCode) {
      filter.finalCode = new RegExp(query.finalCode, 'i');
    }
    
    if (query.pid) {
      filter.pid = query.pid;
    }
    
    if (query.color) {
      filter.color = new RegExp(query.color, 'i');
    }
    
    if (query.description) {
      filter.description = new RegExp(query.description, 'i');
    }
    
    if (query.priceGte || query.priceLte) {
      filter.buyPrice = {};
      if (query.priceGte) filter.buyPrice.$gte = query.priceGte;
      if (query.priceLte) filter.buyPrice.$lte = query.priceLte;
    }
    
    if (query.inStockOnly) {
      filter.totalQty = { $gt: 0 };
    }

    // Size availability filter - show products that have stock in specific size
    if (query.size || query.sizeFilter) {
      const sizeToFilter = query.size || query.sizeFilter;
      
      // Handle special case for M_L_XL filter (products that have all three sizes available)
      if (sizeToFilter === 'M_L_XL') {
        filter.$and = [
          { 'sizes.M': { $gt: 0 } },
          { 'sizes.L': { $gt: 0 } },
          { 'sizes.XL': { $gt: 0 } }
        ];
      } else {
        // Regular single size filter
        if (query.qtyGte) {
          filter[`sizes.${sizeToFilter}`] = { $gte: query.qtyGte };
        } else {
          // Just check if the size is available (> 0)
          filter[`sizes.${sizeToFilter}`] = { $gt: 0 };
        }
      }
    }
    
    // Zero stock filters for specific sizes
    if ((query as any).zeroStockSizes) {
      const zeroSizes = Array.isArray((query as any).zeroStockSizes) ? (query as any).zeroStockSizes : [(query as any).zeroStockSizes];
      const zeroFilters = zeroSizes.map((size: string) => ({ [`sizes.${size}`]: 0 }));
      if (zeroFilters.length > 0) {
        filter.$or = zeroFilters;
      }
    }
    
    // Low stock filters for specific sizes (1-5 units)
    if ((query as any).lowStockSizes) {
      const lowSizes = Array.isArray((query as any).lowStockSizes) ? (query as any).lowStockSizes : [(query as any).lowStockSizes];
      const lowFilters = lowSizes.map((size: string) => ({ 
        [`sizes.${size}`]: { $gte: 1, $lte: 5 } 
      }));
      if (lowFilters.length > 0) {
        filter.$or = [...(filter.$or || []), ...lowFilters];
      }
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;
    
    let sortOptions: any = { createdAt: -1 };
    if (query.sort) {
      const sortField = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
      const sortOrder = query.sort.startsWith('-') ? -1 : 1;
      sortOptions = { [sortField]: sortOrder };
    }

    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize),
      InventoryItem.countDocuments(filter)
    ]);

    logger.debug('Filter applied:', JSON.stringify(filter, null, 2));
    logger.debug('Found items:', items.length);
    logger.debug('Total count:', total);

    res.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors
        }
      });
    }

    logger.error('Error in getInventory:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const createInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('=== CREATE INVENTORY ITEM REQUEST ===');
    logger.debug('Request body:', JSON.stringify(req.body, null, 2));
    logger.debug('User:', req.user?._id);
    
    const validatedData = createInventorySchema.parse(req.body);
    logger.debug('Validated data:', JSON.stringify(validatedData, null, 2));
    
    const existingItem = await InventoryItem.findOne({ finalCode: validatedData.finalCode });
    if (existingItem) {
      logger.debug('Duplicate final code found:', validatedData.finalCode);
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_CODE',
          message: 'Item with this final code already exists'
        }
      });
    }

    // Calculate totalQty from sizes
    const totalQty = validatedData.sizes.M + validatedData.sizes.L + validatedData.sizes.XL + validatedData.sizes.XXL;
    logger.debug('Calculated totalQty:', totalQty);

    const item = new InventoryItem({
      ...validatedData,
      totalQty
    });
    await item.save();
    logger.debug('Inventory item created successfully:', item._id);

    // Mirror to backup database
    await mirrorInventoryItem('insert', item);

    res.status(201).json(item);
  } catch (error: any) {
    logger.error('Create inventory item error:', error);
    if (error.name === 'ZodError') {
      logger.debug('Validation errors:', error.errors);
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const updateInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateInventorySchema.parse(req.body);
    
    if (validatedData.finalCode) {
      const existingItem = await InventoryItem.findOne({ 
        finalCode: validatedData.finalCode,
        _id: { $ne: id }
      });
      if (existingItem) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_CODE',
            message: 'Item with this final code already exists'
          }
        });
      }
    }

    // Calculate totalQty if sizes are being updated
    let updateData: any = { ...validatedData };
    if (validatedData.sizes) {
      updateData.totalQty = validatedData.sizes.M + validatedData.sizes.L + validatedData.sizes.XL + validatedData.sizes.XXL;
    }

    const item = await InventoryItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Mirror to backup database
    await mirrorInventoryItem('update', item);

    res.json(item);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const deleteInventoryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const item = await InventoryItem.findByIdAndDelete(id);
    
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Mirror to backup database
    await mirrorInventoryItem('delete', item);

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const uploadImages = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('=== UPLOAD IMAGES REQUEST ===');
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    
    logger.debug('Item ID:', id);
    logger.debug('Files received:', files?.length || 0);
    logger.debug('Files details:', files?.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })));

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.debug('❌ Invalid ObjectId format:', id);
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'Invalid item ID format'
        }
      });
    }

    if (!files || files.length === 0) {
      logger.debug('❌ No files provided');
      return res.status(400).json({
        error: {
          code: 'NO_FILES',
          message: 'No image files provided'
        }
      });
    }

    logger.debug('🔍 Finding inventory item...');
    const item = await InventoryItem.findById(id);
    if (!item) {
      logger.debug('❌ Item not found for ID:', id);
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }
    
    logger.debug('✅ Item found:', item.finalCode);

    logger.debug('☁️ Starting Cloudinary uploads...');
    // Upload images to Cloudinary
    const uploadPromises = files.map(async (file, index) => {
      const filename = `${item.finalCode}_${Date.now()}_${index}`;
      logger.debug(`Uploading file ${index + 1}/${files.length}: ${filename}`);
      try {
        const url = await uploadToCloudinary(file.buffer, filename);
        logger.debug(`✅ Upload ${index + 1} successful:`, url);
        return url;
      } catch (uploadError) {
        logger.error(`❌ Upload ${index + 1} failed:`, uploadError);
        throw uploadError;
      }
    });

    const imageUrls = await Promise.all(uploadPromises);
    logger.debug('✅ All uploads completed:', imageUrls);

    logger.debug('💾 Updating item with new images...');
    // Update item with new image URLs
    item.images = [...item.images, ...imageUrls];
    await item.save();
    logger.debug('✅ Item updated successfully');

    // Mirror to backup database
    await mirrorInventoryItem('update', item);

    res.json({
      message: 'Images uploaded successfully',
      images: imageUrls,
      item: item
    });
  } catch (error) {
    logger.error('❌ Upload images error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
};

export const removeImage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: {
          code: 'MISSING_IMAGE_URL',
          message: 'Image URL is required'
        }
      });
    }

    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Remove image URL from item
    item.images = item.images.filter((url: string) => url !== imageUrl);
    await item.save();

    // Mirror to backup database
    await mirrorInventoryItem('update', item);

    // Optionally delete from Cloudinary
    // Extract public_id from URL and delete
    try {
      const publicId = imageUrl.split('/').pop()?.split('.')[0];
      if (publicId) {
        const { cloudinary } = await import('../config/cloudinary');
        await cloudinary.uploader.destroy(`inventory-items/${publicId}`);
      }
    } catch (cloudinaryError) {
      logger.warn('Failed to delete image from Cloudinary:', cloudinaryError);
    }

    res.json({
      message: 'Image removed successfully',
      item: item
    });
  } catch (error) {
    logger.error('Remove image error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

