import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { startSession } from 'mongoose';
import { Order } from '../models/Order';
import { InventoryItem } from '../models/InventoryItem';
import { AuthRequest } from '../middleware/auth';
import { createOrderSchema, updateOrderSchema, orderQuerySchema } from '../schemas';
import { mirrorOrder, mirrorInventoryItem } from '../utils/mirrorHelper';

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const query = orderQuerySchema.parse(req.query);
    const userId = req.user?.id;
    
    const filter: any = {};
    
    if (query.qName) {
      filter.$or = [
        { name: { $regex: query.qName, $options: 'i' } },
        { address: { $regex: query.qName, $options: 'i' } }
      ];
    }

    if (query.phone) {
      filter.phone = { $regex: query.phone, $options: 'i' };
    }

    if (query.code) {
      filter['items.productCode'] = { $regex: query.code, $options: 'i' };
    }

    if (query.reason) {
      filter.reasonNote = { $regex: query.reason, $options: 'i' };
    }

    if (query.size) {
      filter['items.size'] = query.size;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      filter.orderDate = {};
      if (query.dateFrom) filter.orderDate.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.orderDate.$lte = new Date(query.dateTo);
    }

    if (query.priceGte || query.priceLte) {
      filter.totalAmount = {};
      if (query.priceGte) filter.totalAmount.$gte = query.priceGte;
      if (query.priceLte) filter.totalAmount.$lte = query.priceLte;
    }

    if (query.hasReason !== undefined) {
      filter.reasonNote = query.hasReason ? { $exists: true, $ne: '' } : { $exists: false };
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    let sort: any = { orderDate: -1 };
    if (query.sort) {
      const sortField = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
      const sortOrder = query.sort.startsWith('-') ? -1 : 1;
      sort = { [sortField]: sortOrder };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pageSize),
      
      Order.countDocuments(filter)
    ]);

    res.json({
      orders: orders.map(order => ({
        ...order.toObject(),
        isSelectedForDelivery: userId ? order.deliverySelections?.includes(userId) || false : false
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  const session = await startSession();
  
  try {
    // Variables to hold data for mirroring after transaction
    let createdOrder: any = null;
    const updatedInventoryItems: any[] = [];

    await session.withTransaction(async () => {
      logger.debug('=== ORDER CREATION DEBUG ===');
      logger.debug('Request body:', JSON.stringify(req.body, null, 2));
      logger.debug('User:', req.user);
      
      const validatedData = createOrderSchema.parse(req.body);
      logger.debug('Validated data:', JSON.stringify(validatedData, null, 2));

      // Validate and prepare order items
      const orderItems = [];
      let hasInsufficientStock = false;

      for (const item of validatedData.items) {
        const inventoryItem = await InventoryItem.findOne({
          finalCode: item.productCode
        }).session(session);

        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${item.productCode}`);
        }

        // Check stock availability
        const availableQty = inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] || 0;
        if (availableQty < item.quantity) {
          hasInsufficientStock = true;
        }

        // Calculate prices and profit
        const totalPrice = item.unitSellingPrice * item.quantity;
        // Profit should be just selling price - buying price (exclude delivery charge)
        const profit = (item.unitSellingPrice - inventoryItem.buyPrice) * item.quantity;

        orderItems.push({
          productCode: item.productCode,
          productImage: inventoryItem.images && inventoryItem.images.length > 0 ? inventoryItem.images[0] : undefined,
          size: item.size,
          quantity: item.quantity,
          unitSellingPrice: item.unitSellingPrice,
          unitBuyingPrice: inventoryItem.buyPrice,
          totalPrice,
          profit
        });
      }

      // Calculate totals
      const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0); // Exclude delivery charge from total
      // Total profit is just selling price - buying price
      const totalProfit = orderItems.reduce((sum, item) => sum + item.profit, 0);

      // Create the order
      const order = new Order({
        name: validatedData.name,
        address: validatedData.address,
        phone: validatedData.phone,
        items: orderItems,
        deliveryCharge: validatedData.deliveryCharge || 0,
        totalAmount,
        totalProfit,
        orderDate: new Date(),
        status: validatedData.status || 'PENDING',
        reasonNote: validatedData.reasonNote,
        pickupDate: (validatedData as any).pickupDate ? new Date((validatedData as any).pickupDate) : undefined,
        audit: [{
          action: hasInsufficientStock ? 'CREATED_WITH_INSUFFICIENT_STOCK' : 'CREATED',
          by: req.user._id,
          at: new Date(),
          meta: { hasInsufficientStock }
        }],
        createdBy: req.user._id
      });

      await order.save({ session });
      createdOrder = order; // Store for mirroring after commit

      // Update inventory for each item
      for (const item of validatedData.items) {
        const inventoryItem = await InventoryItem.findOne({
          finalCode: item.productCode
        }).session(session);

        if (inventoryItem) {
          const availableQty = inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] || 0;
          if (availableQty >= item.quantity) {
            inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] = availableQty - item.quantity;
            await inventoryItem.save({ session });
            updatedInventoryItems.push(inventoryItem); // Store for mirroring after commit
          }
        }
      }
    });

    // Transaction committed successfully - now mirror to backup database
    if (createdOrder) {
      await mirrorOrder('insert', createdOrder);
    }
    for (const inventoryItem of updatedInventoryItems) {
      await mirrorInventoryItem('update', inventoryItem);
    }

    res.status(201).json(createdOrder);
  } catch (error: any) {
    logger.error('=== ORDER CREATION ERROR ===');
    logger.error('Error object:', error);
    logger.error('Error name:', error.name);
    logger.error('Error message:', error.message);
    logger.error('Error issues:', error.issues);
    logger.error('Error errors:', error.errors);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Order validation failed',
        details: error.errors
      });
    }

    if (error.message?.startsWith('Inventory item not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    if (error.issues) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    await session.endSession();
  }
};

export const updateOrder = async (req: AuthRequest, res: Response) => {
  const session = await startSession();
  
  try {
    let updatedOrder: any = null;

    await session.withTransaction(async () => {
      const { id } = req.params;
      const validatedData = updateOrderSchema.parse(req.body);

      const order = await Order.findById(id).session(session);
      if (!order) {
        throw new Error('Order not found');
      }

      // If items are being updated, recalculate prices and profits
      if (validatedData.items) {
        const orderItems = [];
        
        for (const item of validatedData.items) {
          const inventoryItem = await InventoryItem.findOne({
            finalCode: item.productCode
          }).session(session);

          if (!inventoryItem) {
            throw new Error(`Product ${item.productCode} not found in inventory`);
          }

          // Calculate prices and profit for updated items
          const totalPrice = item.unitSellingPrice * item.quantity;
          // Profit should be just selling price - buying price (exclude delivery charge)
          const profit = (item.unitSellingPrice - inventoryItem.buyPrice) * item.quantity;

          orderItems.push({
            productCode: item.productCode,
            productImage: inventoryItem.images && inventoryItem.images.length > 0 ? inventoryItem.images[0] : undefined,
            size: item.size,
            quantity: item.quantity,
            unitSellingPrice: item.unitSellingPrice,
            unitBuyingPrice: inventoryItem.buyPrice,
            totalPrice,
            profit
          });
        }

        // Update items with recalculated values
        validatedData.items = orderItems;
      }

      // Update order fields
      Object.assign(order, validatedData);
      
      // Add audit entry
      order.audit.push({
        action: 'EDIT',
        by: req.user._id,
        at: new Date(),
        meta: validatedData
      });

      await order.save({ session });
      updatedOrder = order; // Store for mirroring after commit
    });

    // Transaction committed successfully - now mirror to backup database
    if (updatedOrder) {
      await mirrorOrder('update', updatedOrder);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    if (error.message.includes('Product') && error.message.includes('not found')) {
      return res.status(400).json({
        error: error.message
      });
    }

    if (error.issues) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    await session.endSession();
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  const session = await startSession();
  
  try {
    let updatedOrder: any = null;
    const updatedInventoryItems: any[] = [];

    await session.withTransaction(async () => {
      const { id } = req.params;
      const { status, reasonNote, courierConsignmentId, courierTrackingCode, courierInvoice, courierStatus, courierSentAt, isAutoSync } = req.body;

      const order = await Order.findById(id).session(session);
      if (!order) {
        throw new Error('Order not found');
      }

      const oldStatus = order.status;
      
      // Track manual status changes (only if not auto-sync and status is actually changing)
      const isManualChange = !isAutoSync && status !== oldStatus;
      if (isManualChange) {
        order.manualStatusOverride = true;
        order.manualStatusOverrideBy = req.user._id;
        order.manualStatusOverrideAt = new Date();
      }
      
      // Handle inventory adjustments based on status changes
      if (status === 'CAN' && oldStatus !== 'CAN') {
        // Order is being cancelled - restore inventory for all items
        for (const item of order.items) {
          const inventoryItem = await InventoryItem.findOne({
            finalCode: item.productCode
          }).session(session);

          if (inventoryItem) {
            const currentQty = inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] || 0;
            inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] = currentQty + item.quantity;
            await inventoryItem.save({ session });
            updatedInventoryItems.push(inventoryItem); // Store for mirroring after commit
          }
        }
      } else if (oldStatus === 'CAN' && status !== 'CAN') {
        // Order is being restored from cancelled - deduct inventory again for all items
        for (const item of order.items) {
          const inventoryItem = await InventoryItem.findOne({
            finalCode: item.productCode
          }).session(session);

          if (inventoryItem) {
            const currentQty = inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] || 0;
            
            // Check if there's enough stock to restore the order
            if (currentQty < item.quantity) {
              throw new Error(`Insufficient stock to restore order. Available: ${currentQty}, Required: ${item.quantity} for ${item.productCode}`);
            }
            
            inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] = currentQty - item.quantity;
            await inventoryItem.save({ session });
            updatedInventoryItems.push(inventoryItem); // Store for mirroring after commit
          }
        }
      }

      order.status = status;

      // Update courier fields if provided
      if (courierConsignmentId !== undefined) order.courierConsignmentId = courierConsignmentId;
      if (courierTrackingCode !== undefined) order.courierTrackingCode = courierTrackingCode;
      if (courierInvoice !== undefined) order.courierInvoice = courierInvoice;
      if (courierStatus !== undefined) order.courierStatus = courierStatus;
      if (courierSentAt !== undefined) order.courierSentAt = courierSentAt;
      if (reasonNote !== undefined) order.reasonNote = reasonNote;

      // Add audit entry
      order.audit.push({
        action: 'STATUS_CHANGED',
        by: req.user._id,
        at: new Date(),
        meta: {
          status: {
            from: oldStatus,
            to: status
          }
        }
      });

      await order.save({ session });
      updatedOrder = order; // Store for mirroring after commit
    });

    // Transaction committed successfully - now mirror to backup database
    if (updatedOrder) {
      await mirrorOrder('update', updatedOrder);
    }
    for (const inventoryItem of updatedInventoryItems) {
      await mirrorInventoryItem('update', inventoryItem);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        error: error.message
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    await session.endSession();
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  const session = await startSession();
  
  try {
    let deletedOrder: any = null;
    const updatedInventoryItems: any[] = [];

    await session.withTransaction(async () => {
      const { id } = req.params;
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error('Order not found');
      }

      // Restore inventory if order was processed
      if (order.status === 'PAID' || order.status === 'PENDING') {
        for (const item of order.items) {
          const inventoryItem = await InventoryItem.findOne({
            finalCode: item.productCode
          }).session(session);

          if (inventoryItem) {
            const currentQty = inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] || 0;
            inventoryItem.sizes[item.size as keyof typeof inventoryItem.sizes] = currentQty + item.quantity;
            await inventoryItem.save({ session });
            updatedInventoryItems.push(inventoryItem); // Store for mirroring after commit
          }
        }
      }

      // Add cancellation audit entry and delete immediately
      order.audit.push({
        action: 'CANCELLED',
        by: req.user._id,
        at: new Date(),
        meta: {}
      });

      deletedOrder = order; // Store for mirroring after commit

      // Delete the order directly without triggering save validation
      await Order.findByIdAndDelete(id).session(session);
    });

    // Transaction committed successfully - now mirror to backup database
    for (const inventoryItem of updatedInventoryItems) {
      await mirrorInventoryItem('update', inventoryItem);
    }
    if (deletedOrder) {
      await mirrorOrder('delete', deletedOrder);
    }
      
    res.json({ message: 'Order deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    await session.endSession();
  }
};

// Get orders with manual status overrides
export const getManualStatusOverrides = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find(
      { manualStatusOverride: true },
      { _id: 1, manualStatusOverride: 1, manualStatusOverrideBy: 1, manualStatusOverrideAt: 1 }
    ).populate('manualStatusOverrideBy', 'name');
    
    // Return as a simple object mapping orderId to override info
    const overrides: Record<string, any> = {};
    orders.forEach(order => {
      overrides[order._id.toString()] = {
        isManual: order.manualStatusOverride,
        overrideBy: order.manualStatusOverrideBy,
        overrideAt: order.manualStatusOverrideAt
      };
    });
    
    res.json(overrides);
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get manual status overrides',
      message: error.message
    });
  }
};

// Clear manual status override for specific order
export const clearManualStatusOverride = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findByIdAndUpdate(
      id,
      { 
        $unset: { 
          manualStatusOverride: 1,
          manualStatusOverrideBy: 1,
          manualStatusOverrideAt: 1
        }
      },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mirror to backup database
    await mirrorOrder('update', order);
    
    res.json({ message: 'Manual status override cleared successfully' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to clear manual status override',
      message: error.message
    });
  }
};

// Clear all manual status overrides
export const clearAllManualStatusOverrides = async (req: AuthRequest, res: Response) => {
  try {
    // Find orders that will be updated (for mirroring)
    const ordersToUpdate = await Order.find({ manualStatusOverride: true });
    
    const result = await Order.updateMany(
      { manualStatusOverride: true },
      { 
        $unset: { 
          manualStatusOverride: 1,
          manualStatusOverrideBy: 1,
          manualStatusOverrideAt: 1
        }
      }
    );
    
    // Mirror all updated orders to backup database
    for (const order of ordersToUpdate) {
      const updatedOrder = await Order.findById(order._id);
      if (updatedOrder) {
        await mirrorOrder('update', updatedOrder);
      }
    }
    
    res.json({ 
      message: 'All manual status overrides cleared successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to clear all manual status overrides',
      message: error.message
    });
  }
};

