import { Response } from 'express';
import { Order } from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import * as XLSX from 'xlsx';
import { mirrorOrder } from '../utils/mirrorHelper';

// Toggle delivery selection for an order (user-specific)
export const toggleDeliverySelection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { selected } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Initialize deliverySelections if it doesn't exist
    if (!order.deliverySelections) {
      order.deliverySelections = [];
    }

    const userIndex = order.deliverySelections.findIndex((uid: any) => uid.toString() === userId);

    if (selected) {
      // Add user to delivery selections if not already there
      if (userIndex === -1) {
        order.deliverySelections.push(userId);
      }
    } else {
      // Remove user from delivery selections
      if (userIndex !== -1) {
        order.deliverySelections.splice(userIndex, 1);
      }
    }

    // Maintain backward compatibility with selectedForDelivery
    order.selectedForDelivery = order.deliverySelections.length > 0;

    await order.save();

    // Mirror to backup database
    await mirrorOrder('update', order);

    res.json({ 
      message: 'Delivery selection updated',
      selectedForDelivery: order.deliverySelections.includes(userId),
      totalSelections: order.deliverySelections.length
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Export selected orders as delivery voucher (user-specific)
export const exportDeliveryVoucher = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { format = 'json' } = req.query; // Default to JSON, support 'excel' and 'csv'
    
    // Find orders selected by the current user
    const selectedOrders = await Order.find({ 
      deliverySelections: userId 
    });

    if (selectedOrders.length === 0) {
      return res.status(400).json({ error: 'No orders selected for delivery' });
    }

    // Group orders by customer (name + phone) and combine product codes
    const groupedOrders = new Map();

    selectedOrders.forEach(order => {
      const customerKey = `${order.name}-${order.phone}`;
      
      if (groupedOrders.has(customerKey)) {
        const existing = groupedOrders.get(customerKey);
        // Combine product codes
        const existingCodes = existing.invoice.split('-');
        const newCodes = order.items.map((item: any) => item.productCode);
        existing.invoice = [...existingCodes, ...newCodes].join('-');
        // Sum the total selling prices of all items
        const orderAmount = order.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
        existing.amount += orderAmount;
      } else {
        // Calculate total amount from items (sum of all item selling prices)
        const orderAmount = order.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
        groupedOrders.set(customerKey, {
          invoice: order.items.map((item: any) => item.productCode).join('-'),
          name: order.name,
          address: order.address,
          phone: order.phone,
          amount: orderAmount, // Use calculated amount from items
          note: order.reasonNote || 'Urgent'
        });
      }
    });

    // Convert to array format matching the Excel structure
    const deliveryData = Array.from(groupedOrders.values()).map((item, index) => ({
      Invoice: item.invoice,
      Name: item.name,
      Address: item.address,
      Phone: item.phone,
      Amount: item.amount,
      Note: item.note
    }));

    // Handle different export formats
    if (format === 'excel') {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(deliveryData);
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 20 }, // Invoice
        { wch: 15 }, // Name
        { wch: 25 }, // Address
        { wch: 12 }, // Phone
        { wch: 10 }, // Amount
        { wch: 10 }  // Note
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Delivery Voucher');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for Excel download
      const currentDate = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=delivery-voucher-${currentDate}.xlsx`);
      
      return res.send(excelBuffer);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'Invoice,Name,Address,Phone,Amount,Note\n';
      const csvData = deliveryData.map(row => 
        `"${row.Invoice}","${row.Name}","${row.Address}","${row.Phone}",${row.Amount},"${row.Note}"`
      ).join('\n');
      
      const currentDate = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=delivery-voucher-${currentDate}.csv`);
      
      return res.send(csvHeaders + csvData);
    } else {
      // Default JSON response
      res.json({
        deliveryVoucher: deliveryData,
        totalOrders: selectedOrders.length,
        totalCustomers: deliveryData.length
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

// Clear delivery selections for current user
export const clearDeliverySelections = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Find orders that will be updated (for mirroring)
    const ordersToUpdate = await Order.find({ deliverySelections: userId });
    
    // Remove current user from all delivery selections
    await Order.updateMany(
      { deliverySelections: userId },
      { $pull: { deliverySelections: userId } }
    );

    // Update selectedForDelivery flag where deliverySelections becomes empty
    await Order.updateMany(
      { deliverySelections: { $size: 0 } },
      { selectedForDelivery: false }
    );

    // Mirror all updated orders to backup database
    for (const order of ordersToUpdate) {
      const updatedOrder = await Order.findById(order._id);
      if (updatedOrder) {
        await mirrorOrder('update', updatedOrder);
      }
    }

    res.json({ message: 'User delivery selections cleared' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
