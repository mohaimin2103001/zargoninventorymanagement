import { logger } from '../utils/logger';
import express from 'express';
import { auth } from '../middleware/auth';
import { Order } from '../models/Order';
import { mirrorOrder } from '../utils/mirrorHelper';

const router = express.Router();

// Helper function to format phone number for Bangladesh
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Try to keep it simple - just ensure it's 11 digits starting with 01
  if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
    return cleanPhone; // Keep original format if it's already correct
  }
  
  // If starts with 8801, remove 88 prefix
  if (cleanPhone.startsWith('8801')) {
    return cleanPhone.substring(2);
  }
  
  // If starts with 1 and is 10 digits, add 0 prefix
  if (cleanPhone.startsWith('1') && cleanPhone.length === 10) {
    return '0' + cleanPhone;
  }
  
  // Return as is for other cases
  return cleanPhone;
};

// Helper function to get courier configuration (after dotenv has loaded)
const getCourierConfig = () => ({
  API_KEY: process.env.COURIER_API_KEY || 'your_api_key_here',
  SECRET_KEY: process.env.COURIER_SECRET_KEY || 'your_secret_key_here',
  BASE_URL: 'https://portal.packzy.com/api/v1'
});

// Generate unique invoice ID
const generateUniqueInvoice = (orderId: string) => {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const orderShort = orderId.slice(-6).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${timestamp}-${orderShort}-${randomSuffix}`;
};

// Single order creation endpoint
router.post('/create-order', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const COURIER_CONFIG = getCourierConfig();
    
    // Get order details
    const order = await Order.findById(orderId).populate('createdBy');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if already sent
    if (order.courierStatus === 'sent') {
      return res.json({
        success: false,
        message: 'Order already sent to courier',
        trackingCode: order.courierTrackingCode
      });
    }

    // Prepare single order payload
    const itemsTotal = order.items?.reduce((sum: number, item: any) => {
      return sum + (item.unitPrice || item.unitSellingPrice || 0);
    }, 0) || 0;
    
    // Send only selling price to courier API (exclude delivery charge)
    const totalAmount = itemsTotal;

    const courierOrder = {
      invoice: generateUniqueInvoice(order._id.toString()),
      recipient_name: order.name.trim(),
      recipient_phone: formatPhoneNumber(order.phone),
      recipient_address: order.address.trim(),
      cod_amount: Math.round(totalAmount)
    };

    logger.debug('Creating single courier order:', JSON.stringify(courierOrder, null, 2));

    // Make API call to courier service (single order endpoint)
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${COURIER_CONFIG.BASE_URL}/create_order`, {
      method: 'POST',
      headers: {
        'Api-Key': COURIER_CONFIG.API_KEY,
        'Secret-Key': COURIER_CONFIG.SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courierOrder)
    });

    const courierResponse = await response.json();
    logger.debug('Single order courier API response:', JSON.stringify(courierResponse, null, 2));

    if (courierResponse.status === 200 && courierResponse.consignment) {
      const orderData = courierResponse.consignment;
      
      // Update order with courier information
      const updatedOrder = await Order.findByIdAndUpdate(orderId, {
        courierConsignmentId: orderData.consignment_id,
        courierTrackingCode: orderData.tracking_code,
        courierInvoice: orderData.invoice,
        courierStatus: 'sent',
        courierSentAt: new Date()
      }, { new: true });

      // Mirror to backup database
      if (updatedOrder) {
        await mirrorOrder('update', updatedOrder);
      }

      res.json({
        success: true,
        message: 'Order sent to courier successfully',
        trackingCode: orderData.tracking_code,
        consignmentId: orderData.consignment_id,
        invoice: orderData.invoice
      });
    } else {
      res.json({
        success: false,
        message: courierResponse.message || 'Failed to create courier order',
        courierResponse
      });
    }

  } catch (error: any) {
    logger.error('Error creating single courier order:', error);
    res.status(500).json({ 
      error: 'Failed to create courier order',
      message: error.message 
    });
  }
});

// Bulk create courier orders (using single API in loop)
router.post('/bulk-order', auth, async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Order IDs array is required' });
    }

    const results = [];
    let successfulOrders = 0;
    let failedOrders = 0;

    logger.debug(`Processing ${orderIds.length} orders for courier...`);

    // Process each order individually
    for (const orderId of orderIds) {
      try {
        logger.debug(`Processing order ${orderId}...`);
        
        const COURIER_CONFIG = getCourierConfig();
        
        // Get order details
        const order = await Order.findById(orderId);
        if (!order) {
          results.push({
            orderId,
            success: false,
            message: 'Order not found'
          });
          failedOrders++;
          continue;
        }

        // Check if already sent
        if (order.courierStatus === 'sent') {
          results.push({
            orderId,
            success: false,
            message: 'Order already sent to courier',
            trackingCode: order.courierTrackingCode
          });
          failedOrders++;
          continue;
        }

        // Prepare order payload
        const itemsTotal = order.items?.reduce((sum: number, item: any) => {
          return sum + (item.unitPrice || item.unitSellingPrice || 0);
        }, 0) || 0;
        
        // Send only selling price to courier API (exclude delivery charge)
        const totalAmount = itemsTotal;

        const courierOrder = {
          invoice: generateUniqueInvoice(order._id.toString()),
          recipient_name: order.name.trim(),
          recipient_phone: formatPhoneNumber(order.phone),
          recipient_address: order.address.trim(),
          cod_amount: Math.round(totalAmount)
        };

        logger.debug(`Order ${orderId} payload:`, JSON.stringify(courierOrder, null, 2));

        // Make API call to courier service
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`${COURIER_CONFIG.BASE_URL}/create_order`, {
          method: 'POST',
          headers: {
            'Api-Key': COURIER_CONFIG.API_KEY,
            'Secret-Key': COURIER_CONFIG.SECRET_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(courierOrder)
        });

        const courierResponse = await response.json();
        logger.debug(`Order ${orderId} courier response:`, JSON.stringify(courierResponse, null, 2));

        if (courierResponse.status === 200 && courierResponse.consignment) {
          const orderData = courierResponse.consignment;
          
          // Update order with courier information
          const updatedOrder = await Order.findByIdAndUpdate(orderId, {
            courierConsignmentId: orderData.consignment_id,
            courierTrackingCode: orderData.tracking_code,
            courierInvoice: orderData.invoice,
            courierStatus: 'sent',
            courierSentAt: new Date()
          }, { new: true });

          // Mirror to backup database
          if (updatedOrder) {
            await mirrorOrder('update', updatedOrder);
          }

          results.push({
            orderId,
            success: true,
            message: 'Order sent to courier successfully',
            trackingCode: orderData.tracking_code,
            consignmentId: orderData.consignment_id,
            invoice: orderData.invoice
          });
          successfulOrders++;
        } else {
          results.push({
            orderId,
            success: false,
            message: courierResponse.message || 'Failed to create courier order',
            courierResponse
          });
          failedOrders++;
        }

        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        logger.error(`Error processing order ${orderId}:`, error);
        results.push({
          orderId,
          success: false,
          message: error.message || 'Unknown error'
        });
        failedOrders++;
      }
    }

    res.json({
      success: successfulOrders > 0,
      message: `Processed ${successfulOrders + failedOrders} orders: ${successfulOrders} successful, ${failedOrders} failed`,
      successfulOrders,
      failedOrders,
      results
    });

  } catch (error: any) {
    logger.error('Error in bulk courier order creation:', error);
    res.status(500).json({ 
      error: 'Failed to create courier orders',
      message: error.message 
    });
  }
});

// Get courier order status by consignment ID
router.get('/status/consignment/:consignmentId', auth, async (req, res) => {
  try {
    const { consignmentId } = req.params;
    const COURIER_CONFIG = getCourierConfig();

    // Make API call to get courier status
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${COURIER_CONFIG.BASE_URL}/status_by_cid/${consignmentId}`, {
      headers: {
        'Api-Key': COURIER_CONFIG.API_KEY,
        'Secret-Key': COURIER_CONFIG.SECRET_KEY,
      }
    });

    if (!response.ok) {
      throw new Error(`Courier API responded with status: ${response.status}`);
    }

    const statusData = await response.json();

    res.json({
      success: true,
      data: statusData
    });

  } catch (error: any) {
    logger.error('Error getting courier status by consignment ID:', error);
    res.status(500).json({ 
      error: 'Failed to get courier status',
      message: error.message 
    });
  }
});

// Get courier order status by invoice ID
router.get('/status/invoice/:invoice', auth, async (req, res) => {
  try {
    const { invoice } = req.params;
    const COURIER_CONFIG = getCourierConfig();

    // Make API call to get courier status
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${COURIER_CONFIG.BASE_URL}/status_by_invoice/${invoice}`, {
      headers: {
        'Api-Key': COURIER_CONFIG.API_KEY,
        'Secret-Key': COURIER_CONFIG.SECRET_KEY,
      }
    });

    if (!response.ok) {
      throw new Error(`Courier API responded with status: ${response.status}`);
    }

    const statusData = await response.json();

    res.json({
      success: true,
      data: statusData
    });

  } catch (error: any) {
    logger.error('Error getting courier status by invoice:', error);
    res.status(500).json({ 
      error: 'Failed to get courier status',
      message: error.message 
    });
  }
});

// Get courier order status by tracking code
router.get('/status/tracking/:trackingCode', auth, async (req, res) => {
  try {
    const { trackingCode } = req.params;
    const COURIER_CONFIG = getCourierConfig();

    // Make API call to get courier status
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`${COURIER_CONFIG.BASE_URL}/status_by_trackingcode/${trackingCode}`, {
      headers: {
        'Api-Key': COURIER_CONFIG.API_KEY,
        'Secret-Key': COURIER_CONFIG.SECRET_KEY,
      }
    });

    if (!response.ok) {
      throw new Error(`Courier API responded with status: ${response.status}`);
    }

    const statusData = await response.json();

    res.json({
      success: true,
      data: statusData
    });

  } catch (error: any) {
    logger.error('Error getting courier status by tracking code:', error);
    res.status(500).json({ 
      error: 'Failed to get courier status',
      message: error.message 
    });
  }
});

export default router;

