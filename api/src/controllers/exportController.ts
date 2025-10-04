import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Order } from '../models/Order';
import { InventoryItem } from '../models/InventoryItem';

// Helper function to format dates without external library
const formatDate = (date: Date | string, formatType: string): string => {
  const d = new Date(date);
  if (formatType === 'yyyy-MM-dd') {
    return d.toISOString().split('T')[0];
  } else if (formatType === 'yyyy-MM-dd HH:mm:ss') {
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }
  return d.toISOString().split('T')[0];
};

export const exportOrdersToExcel = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, status, format: exportFormat } = req.query;
    
    // Build filter
    const filter: any = {};
    
    if (dateFrom || dateTo) {
      filter.orderDate = {};
      if (dateFrom) filter.orderDate.$gte = new Date(dateFrom as string);
      if (dateTo) filter.orderDate.$lte = new Date(dateTo as string);
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('createdBy', 'email')
      .sort({ orderDate: -1 });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    // Define columns
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 25 },
      { header: 'Order Date', key: 'orderDate', width: 12 },
      { header: 'Customer Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Product Code', key: 'productCode', width: 15 },
      { header: 'Size', key: 'size', width: 8 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit Selling Price', key: 'unitSellingPrice', width: 18 },
      { header: 'Unit Buying Price', key: 'unitBuyingPrice', width: 18 },
      { header: 'Item Total', key: 'itemTotal', width: 12 },
      { header: 'Item Profit', key: 'itemProfit', width: 12 },
      { header: 'Delivery Charge', key: 'deliveryCharge', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Total Profit', key: 'totalProfit', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Reason Note', key: 'reasonNote', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Created By', key: 'createdBy', width: 20 }
    ];

    // Add data - each row represents one item in an order
    orders.forEach(order => {
      order.items.forEach((item: any, index: number) => {
        worksheet.addRow({
          orderId: order._id.toString(),
          orderDate: formatDate(order.orderDate, 'yyyy-MM-dd'),
          name: order.name,
          phone: order.phone,
          address: order.address,
          productCode: item.productCode,
          size: item.size,
          quantity: item.quantity,
          unitSellingPrice: item.unitSellingPrice,
          unitBuyingPrice: item.unitBuyingPrice,
          itemTotal: item.totalPrice,
          itemProfit: item.profit,
          deliveryCharge: index === 0 ? order.deliveryCharge : '', // Only show on first item
          totalAmount: index === 0 ? order.totalAmount : '',
          totalProfit: index === 0 ? order.totalProfit : '',
          status: order.status,
          reasonNote: order.reasonNote || '',
          createdAt: index === 0 ? formatDate(order.createdAt, 'yyyy-MM-dd HH:mm:ss') : '',
          createdBy: index === 0 ? (order.createdBy as any)?.email || '' : ''
        });
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error: any) {
    logger.error('Export orders error:', error);
    res.status(500).json({
      error: 'Failed to export orders',
      message: error.message
    });
  }
};

export const exportInventoryToExcel = async (req: Request, res: Response) => {
  try {
    const { sizeFilter, dateFrom, dateTo } = req.query;
    
    // Build filter
    const filter: any = { isActive: true };
    
    if (dateFrom || dateTo) {
      filter.dateAdded = {};
      if (dateFrom) filter.dateAdded.$gte = new Date(dateFrom as string);
      if (dateTo) filter.dateAdded.$lte = new Date(dateTo as string);
    }

    let items = await InventoryItem.find(filter).sort({ finalCode: 1 });
    
    // Filter by size if specified
    if (sizeFilter && ['M', 'L', 'XL', 'XXL'].includes(sizeFilter as string)) {
      items = items.filter(item => {
        const sizeKey = sizeFilter as keyof typeof item.sizes;
        return item.sizes[sizeKey] > 0;
      });
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Define columns
    worksheet.columns = [
      { header: 'PID', key: 'pid', width: 10 },
      { header: 'Final Code', key: 'finalCode', width: 15 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'Size M', key: 'sizeM', width: 8 },
      { header: 'Size L', key: 'sizeL', width: 8 },
      { header: 'Size XL', key: 'sizeXL', width: 8 },
      { header: 'Size XXL', key: 'sizeXXL', width: 8 },
      { header: 'Total Qty', key: 'totalQty', width: 10 },
      { header: 'Buy Price', key: 'buyPrice', width: 12 },
      { header: 'Total Worth (Buy)', key: 'totalWorthBuy', width: 18 },
      { header: 'Description', key: 'description', width: 20 },
      { header: 'Date Added', key: 'dateAdded', width: 12 },
      { header: 'AD', key: 'ad', width: 10 }
    ];

    // Add data
    items.forEach(item => {
      const totalWorthBuy = item.totalQty * item.buyPrice;

      worksheet.addRow({
        pid: item.pid,
        finalCode: item.finalCode,
        color: item.color,
        sizeM: item.sizes.M,
        sizeL: item.sizes.L,
        sizeXL: item.sizes.XL,
        sizeXXL: item.sizes.XXL,
        totalQty: item.totalQty,
        buyPrice: item.buyPrice,
        totalWorthBuy: totalWorthBuy,
        description: item.description || '',
        dateAdded: item.dateAdded ? formatDate(item.dateAdded, 'yyyy-MM-dd') : '',
        ad: item.ad || ''
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error: any) {
    logger.error('Export inventory error:', error);
    res.status(500).json({
      error: 'Failed to export inventory',
      message: error.message
    });
  }
};

// PDF Export for Orders
export const exportOrdersToPDF = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    
    // Build filter
    const filter: any = {};
    
    if (dateFrom || dateTo) {
      filter.orderDate = {};
      if (dateFrom) filter.orderDate.$gte = new Date(dateFrom as string);
      if (dateTo) filter.orderDate.$lte = new Date(dateTo as string);
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('createdBy', 'email')
      .sort({ orderDate: -1 });

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=orders-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Add title
    doc.fontSize(20).text('Orders Report', { align: 'center' });
    doc.moveDown();
    
    // Add filters info
    if (dateFrom || dateTo || status) {
      doc.fontSize(12).text('Filters Applied:', { underline: true });
      if (dateFrom) doc.text(`From: ${formatDate(dateFrom as string, 'yyyy-MM-dd')}`);
      if (dateTo) doc.text(`To: ${formatDate(dateTo as string, 'yyyy-MM-dd')}`);
      if (status && status !== 'all') doc.text(`Status: ${status}`);
      doc.moveDown();
    }
    
    // Add summary
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalProfit = orders.reduce((sum, order) => sum + order.totalProfit, 0);
    
    doc.fontSize(14).text(`Total Orders: ${totalOrders}`);
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`);
    doc.text(`Total Profit: $${totalProfit.toFixed(2)}`);
    doc.moveDown();
    
    // Add orders
    orders.forEach((order, index) => {
      if (index > 0) doc.addPage();
      
      doc.fontSize(16).text(`Order #${order._id}`, { underline: true });
      doc.fontSize(12);
      doc.text(`Customer: ${order.name}`);
      doc.text(`Phone: ${order.phone}`);
      doc.text(`Address: ${order.address}`);
      doc.text(`Order Date: ${formatDate(order.orderDate, 'yyyy-MM-dd')}`);
      doc.text(`Status: ${order.status}`);
      doc.moveDown();
      
      // Items
      doc.text('Items:', { underline: true });
      order.items.forEach((item: any, itemIndex: number) => {
        doc.text(`${itemIndex + 1}. ${item.productCode} (${item.size})`);
        doc.text(`   Quantity: ${item.quantity}`);
        doc.text(`   Unit Price: $${item.unitSellingPrice.toFixed(2)}`);
        doc.text(`   Total: $${item.totalPrice.toFixed(2)}`);
        doc.text(`   Profit: $${item.profit.toFixed(2)}`);
      });
      
      doc.moveDown();
      doc.text(`Delivery Charge: $${order.deliveryCharge.toFixed(2)}`);
      doc.text(`Total Amount: $${order.totalAmount.toFixed(2)}`);
      doc.text(`Total Profit: $${order.totalProfit.toFixed(2)}`);
    });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error: any) {
    logger.error('Export orders to PDF error:', error);
    res.status(500).json({
      error: 'Failed to export orders to PDF',
      message: error.message
    });
  }
};

// PDF Export for Inventory
export const exportInventoryToPDF = async (req: Request, res: Response) => {
  try {
    const { sizeFilter, dateFrom, dateTo } = req.query;
    
    // Build filter
    const filter: any = { isActive: true };
    
    if (dateFrom || dateTo) {
      filter.dateAdded = {};
      if (dateFrom) filter.dateAdded.$gte = new Date(dateFrom as string);
      if (dateTo) filter.dateAdded.$lte = new Date(dateTo as string);
    }

    let items = await InventoryItem.find(filter).sort({ finalCode: 1 });
    
    // Filter by size if specified
    if (sizeFilter && ['M', 'L', 'XL', 'XXL'].includes(sizeFilter as string)) {
      items = items.filter(item => {
        const sizeKey = sizeFilter as keyof typeof item.sizes;
        return item.sizes[sizeKey] > 0;
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Add title
    doc.fontSize(20).text('Inventory Report', { align: 'center' });
    doc.moveDown();
    
    // Add filters info
    if (sizeFilter || dateFrom || dateTo) {
      doc.fontSize(12).text('Filters Applied:', { underline: true });
      if (sizeFilter) doc.text(`Size: ${sizeFilter}`);
      if (dateFrom) doc.text(`From: ${formatDate(dateFrom as string, 'yyyy-MM-dd')}`);
      if (dateTo) doc.text(`To: ${formatDate(dateTo as string, 'yyyy-MM-dd')}`);
      doc.moveDown();
    }
    
    // Add summary
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + item.totalQty, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.totalQty * item.buyPrice), 0);
    
    doc.fontSize(14).text(`Total Items: ${totalItems}`);
    doc.text(`Total Stock: ${totalStock}`);
    doc.text(`Total Value: $${totalValue.toFixed(2)}`);
    doc.moveDown();
    
    // Add items
    items.forEach((item, index) => {
      if (index > 0 && index % 5 === 0) doc.addPage();
      
      doc.fontSize(14).text(`${item.finalCode}`, { underline: true });
      doc.fontSize(10);
      doc.text(`PID: ${item.pid}`);
      doc.text(`Color: ${item.color}`);
      doc.text(`Description: ${item.description || 'N/A'}`);
      doc.text(`Buy Price: $${item.buyPrice.toFixed(2)}`);
      doc.text(`Total Quantity: ${item.totalQty}`);
      doc.text(`Sizes - M: ${item.sizes.M}, L: ${item.sizes.L}, XL: ${item.sizes.XL}, XXL: ${item.sizes.XXL}`);
      doc.text(`Date Added: ${item.dateAdded ? formatDate(item.dateAdded, 'yyyy-MM-dd') : 'N/A'}`);
      doc.moveDown();
    });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error: any) {
    logger.error('Export inventory to PDF error:', error);
    res.status(500).json({
      error: 'Failed to export inventory to PDF',
      message: error.message
    });
  }
};

