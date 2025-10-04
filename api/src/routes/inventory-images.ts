import { logger } from '../utils/logger';
import { Router } from 'express';
import { Request, Response } from 'express';
import { upload, uploadToCloudinary } from '../config/cloudinary';
import { InventoryItem } from '../models/InventoryItem';
import { auth } from '../middleware/auth';
import { mirrorInventoryItem } from '../utils/mirrorHelper';

const router = Router();

interface AuthRequest extends Request {
  user?: any;
}

// Upload image for specific inventory item
router.post('/inventory/:id/images', auth, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No image file provided'
        }
      });
    }

    logger.debug(`Uploading image for inventory item: ${id}`);
    
    // Check if inventory item exists
    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Upload to Cloudinary
    const filename = `${id}_${Date.now()}`;
    const imageUrl = await uploadToCloudinary(req.file.buffer, filename);

    // Add image URL to inventory item
    item.images = item.images || [];
    item.images.push(imageUrl);
    await item.save();

    // Mirror to backup database
    await mirrorInventoryItem('update', item);

    logger.debug(`Image uploaded successfully for item ${id}:`, imageUrl);

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: imageUrl,
      itemId: id,
      totalImages: item.images.length
    });

  } catch (error: any) {
    logger.error('Inventory image upload error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// Delete image from specific inventory item
router.delete('/inventory/:id/images', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: {
          code: 'NO_IMAGE_URL',
          message: 'Image URL is required'
        }
      });
    }

    // Check if inventory item exists
    const item = await InventoryItem.findById(id);
    if (!item) {
      return res.status(404).json({
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Inventory item not found'
        }
      });
    }

    // Remove image URL from inventory item
    item.images = item.images?.filter((url: string) => url !== imageUrl) || [];
    await item.save();

    // Mirror to backup database
    await mirrorInventoryItem('update', item);

    logger.debug(`Image removed from item ${id}:`, imageUrl);

    res.status(200).json({
      message: 'Image removed successfully',
      itemId: id,
      totalImages: item.images.length
    });

  } catch (error: any) {
    logger.error('Inventory image delete error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

export default router;

