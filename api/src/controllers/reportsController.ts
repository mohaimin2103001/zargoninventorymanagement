import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { InventoryItem } from '../models/InventoryItem';

export const getReports = async (req: Request, res: Response) => {
  try {
    const [
      totalProductsSoldAgg,
      totalAvailableProductsAgg,
      statusBreakdownAgg,
      recentActivityAgg
    ] = await Promise.all([
      // Total products sold (worth and amount) - Revenue excludes delivery charges
      Order.aggregate([
        { $match: { status: { $nin: ['CANCELLED'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } }, // Revenue = qty × unit price (excluding delivery)
            totalDeliveryCharges: { $sum: '$deliveryCharge' },
            totalGrossAmount: { $sum: { $add: [{ $multiply: ['$items.quantity', '$items.unitSellingPrice'] }, '$deliveryCharge'] } } // Total with delivery
          }
        }
      ]),
      
      // Total available products (worth and amount)
      InventoryItem.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalQty' },
            totalWorth: { $sum: { $multiply: ['$totalQty', '$buyPrice'] } },
            totalProducts: { $sum: 1 }
          }
        }
      ]),
      
      // Order status breakdown
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$items.quantity' },
            totalWorth: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Recent activity (last 30 days) - Daily revenue excludes delivery charges
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { $nin: ['CANCELLED'] }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            orderCount: { $sum: 1 },
            totalUnits: { $sum: '$items.quantity' },
            dailyRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } }, // Revenue excludes delivery
            deliveryCharges: { $sum: '$deliveryCharge' },
            grossAmount: { $sum: { $add: [{ $multiply: ['$items.quantity', '$items.unitSellingPrice'] }, '$deliveryCharge'] } }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalProductsSold = totalProductsSoldAgg[0] || { 
      totalAmount: 0, 
      totalRevenue: 0, 
      totalDeliveryCharges: 0, 
      totalGrossAmount: 0 
    };
    const totalAvailableProducts = totalAvailableProductsAgg[0] || { 
      totalAmount: 0, 
      totalWorth: 0, 
      totalProducts: 0 
    };

    // Calculate low stock items
    const lowStockItems = await InventoryItem.find({
      isActive: true,
      totalQty: { $lte: 5, $gt: 0 }
    }).select('finalCode color totalQty buyPrice');

    // Calculate out of stock items
    const outOfStockItems = await InventoryItem.find({
      isActive: true,
      totalQty: 0
    }).select('finalCode color totalQty buyPrice');

    // Top selling products
    const topSellingProducts = await Order.aggregate([
      { $match: { status: { $nin: ['CANCELLED'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productCode',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overview: {
        totalProductsSold: {
          amount: totalProductsSold.totalAmount,
          worth: totalProductsSold.totalRevenue, // Pure revenue (excluding delivery charges)
          deliveryCharges: totalProductsSold.totalDeliveryCharges,
          grossAmount: totalProductsSold.totalGrossAmount // Total including delivery
        },
        totalAvailableProducts: {
          amount: totalAvailableProducts.totalAmount,
          worth: totalAvailableProducts.totalWorth,
          productCount: totalAvailableProducts.totalProducts
        },
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length
      },
      statusBreakdown: statusBreakdownAgg,
      recentActivity: recentActivityAgg,
      topSellingProducts,
      lowStockItems,
      outOfStockItems
    });
  } catch (error) {
    logger.error('Error generating reports:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

// Real-time alerts and notifications
export const getRealTimeAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = [];
    
    // Critical stock alerts
    const criticalStock = await InventoryItem.find({
      isActive: true,
      totalQty: { $lte: 2 }
    }).select('finalCode totalQty');
    
    criticalStock.forEach(item => {
      alerts.push({
        type: 'CRITICAL_STOCK',
        level: 'urgent',
        message: `URGENT: Only ${item.totalQty} units left for ${item.finalCode}!`,
        product: item.finalCode,
        timestamp: new Date()
      });
    });
    
    // Unusual order patterns (orders >50 items in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const unusualOrders = await Order.find({
      orderDate: { $gte: oneHourAgo }
    }).select('name phone items orderDate');
    
    // Filter orders with total quantity >= 50
    const filteredUnusualOrders = unusualOrders.filter(order => {
      const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      return totalQuantity >= 50;
    });
    
    filteredUnusualOrders.forEach(order => {
      const totalQuantity = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const totalItems = order.items.length;
      const firstProduct = order.items[0]?.productCode || 'multiple items';
      alerts.push({
        type: 'UNUSUAL_ORDER',
        level: 'warning',
        message: `Large order alert: ${order.name} ordered ${totalQuantity} units across ${totalItems} products (${firstProduct}${totalItems > 1 ? ' and others' : ''})`,
        order: order,
        timestamp: order.orderDate
      });
    });
    
    // Sales performance alerts (30% drop in last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const [currentWeekSales, previousWeekSales] = await Promise.all([
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: sevenDaysAgo },
            status: { $nin: ['CANCELLED'] }
          }
        },
        { $unwind: '$items' },
        { $group: { _id: null, totalSales: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
            status: { $nin: ['CANCELLED'] }
          }
        },
        { $unwind: '$items' },
        { $group: { _id: null, totalSales: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } } } }
      ])
    ]);
    
    const currentSales = currentWeekSales[0]?.totalSales || 0;
    const previousSales = previousWeekSales[0]?.totalSales || 0;
    
    if (previousSales > 0) {
      const salesDropPercentage = ((previousSales - currentSales) / previousSales) * 100;
      if (salesDropPercentage >= 30) {
        alerts.push({
          type: 'SALES_DROP',
          level: 'warning',
          message: `Sales dropped ${salesDropPercentage.toFixed(1)}% this week compared to last week`,
          data: { currentSales, previousSales, dropPercentage: salesDropPercentage },
          timestamp: new Date()
        });
      }
    }
    
    // Failed payment alerts (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedPayments = await Order.find({
      orderDate: { $gte: twentyFourHoursAgo },
      status: 'PENDING'
    }).countDocuments();
    
    if (failedPayments > 5) {
      alerts.push({
        type: 'PAYMENT_ISSUES',
        level: 'warning',
        message: `${failedPayments} payment issues detected in the last 24 hours`,
        count: failedPayments,
        timestamp: new Date()
      });
    }
    
    // Sort alerts by priority and timestamp
    const sortedAlerts = alerts.sort((a, b) => {
      const priorityOrder: Record<string, number> = { urgent: 3, warning: 2, info: 1 };
      const aPriority = priorityOrder[a.level as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.level as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // Newer first
    });
    
    res.json({
      alerts: sortedAlerts,
      summary: {
        total: alerts.length,
        urgent: alerts.filter(a => a.level === 'urgent').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        info: alerts.filter(a => a.level === 'info').length
      },
      lastChecked: new Date()
    });
  } catch (error) {
    logger.error('Error generating real-time alerts:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate real-time alerts'
      }
    });
  }
};

