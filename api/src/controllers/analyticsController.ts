import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { InventoryItem } from '../models/InventoryItem';
import { Order } from '../models/Order';

interface AuthRequest extends Request {
  user?: any;
}

// ABC Analysis for inventory management
export const getABCAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    // Get product sales data for ABC classification
    const productAnalysis = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED'] },
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.productCode',
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } },
          orderCount: { $sum: 1 },
          avgUnitPrice: { $avg: '$items.unitSellingPrice' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Calculate cumulative percentages for ABC classification
    const totalRevenue = productAnalysis.reduce((sum: number, item: any) => sum + item.totalRevenue, 0);
    let cumulativeRevenue = 0;
    
    const classifiedProducts = productAnalysis.map((product: any, index: number) => {
      const revenuePercentage = ((product.totalRevenue / totalRevenue) * 100).toFixed(1);
      cumulativeRevenue += product.totalRevenue;
      const cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;
      
      let classification = 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A'; // High-value products (80% of revenue)
      } else if (cumulativePercentage <= 95) {
        classification = 'B'; // Medium-value products (15% of revenue)
      }
      // Remaining 5% are 'C' products
      
      return {
        _id: product._id, // Frontend expects _id for product code
        productCode: product._id,
        totalQty: product.totalQty,
        totalQuantitySold: product.totalQty, // Frontend expects this field name
        totalRevenue: Math.round(product.totalRevenue),
        orderCount: product.orderCount,
        avgUnitPrice: Math.round(product.avgUnitPrice),
        cumulativePercentage: Math.round(cumulativePercentage * 10) / 10,
        revenuePercentage: revenuePercentage, // Frontend expects this field
        classification,
        rank: index + 1
      };
    });

    const summary = {
      A: classifiedProducts.filter((p: any) => p.classification === 'A').length,
      B: classifiedProducts.filter((p: any) => p.classification === 'B').length,
      C: classifiedProducts.filter((p: any) => p.classification === 'C').length
    };

    res.json({
      summary,
      products: classifiedProducts
    });
  } catch (error) {
    logger.error('ABC Analysis error:', error);
    res.status(500).json({ error: 'Failed to generate ABC analysis' });
  }
};

// Demand Forecasting with trend analysis
export const getDemandForecast = async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const forecastDays = parseInt(req.query.days as string) || 30;
    
    // Get historical sales data for forecasting
    const historicalData = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED'] },
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
            product: '$items.productCode'
          },
          dailySales: { $sum: '$items.quantity' },
          dailyRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Simple moving average forecast for each product
    const productForecasts: Record<string, number[]> = {};
    
    historicalData.forEach((item: any) => {
      const productCode = item._id.product;
      if (!productForecasts[productCode]) {
        productForecasts[productCode] = [];
      }
      productForecasts[productCode].push(item.dailySales);
    });

    const forecasts = Object.entries(productForecasts).map(([productCode, salesData]: [string, number[]]) => {
      const avgDailySales = salesData.reduce((sum, sales) => sum + sales, 0) / salesData.length;
      const forecastedDemand = Math.round(avgDailySales * forecastDays);
      
      // Calculate trend (simple slope)
      const n = salesData.length;
      const sumX = (n * (n + 1)) / 2;
      const sumY = salesData.reduce((sum, val) => sum + val, 0);
      const sumXY = salesData.reduce((sum, val, index) => sum + val * (index + 1), 0);
      const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
      
      return {
        productCode,
        currentAvgDaily: Math.round(avgDailySales * 100) / 100,
        forecastedDemand,
        trend,
        confidence: salesData.length > 7 ? 'high' : salesData.length > 3 ? 'medium' : 'low',
        dataPoints: salesData.length
      };
    }).sort((a, b) => b.forecastedDemand - a.forecastedDemand);

    // Get current inventory levels for comparison
    const inventoryData = await InventoryItem.find({}, 'finalCode sizes buyPrice');
    const currentStock: { [key: string]: number } = {};
    
    inventoryData.forEach((item: any) => {
      let totalStock = 0;
      if (item.sizes) {
        // Handle both object and array structures for sizes
        if (Array.isArray(item.sizes)) {
          totalStock = item.sizes.reduce((sum: number, size: any) => sum + (size.quantity || 0), 0);
        } else {
          totalStock = (item.sizes.M || 0) + (item.sizes.L || 0) + (item.sizes.XL || 0) + (item.sizes.XXL || 0);
        }
      }
      currentStock[item.finalCode] = totalStock;
    });

    // Add stock comparison to forecasts
    const forecastsWithStock = forecasts.map(forecast => ({
      ...forecast,
      currentStock: currentStock[forecast.productCode] || 0,
      stockRisk: currentStock[forecast.productCode] < forecast.forecastedDemand ? 'high' : 'low'
    }));

    res.json({
      forecasts: forecastsWithStock,
      summary: {
        totalProducts: forecasts.length,
        increasingTrend: forecasts.filter(f => f.trend === 'increasing').length,
        decreasingTrend: forecasts.filter(f => f.trend === 'decreasing').length,
        stableTrend: forecasts.filter(f => f.trend === 'stable').length
      }
    });
  } catch (error) {
    logger.error('Demand forecast error:', error);
    res.status(500).json({ error: 'Failed to generate demand forecast' });
  }
};

// Customer Behavior Analytics
export const getCustomerAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    // Customer segmentation analysis
    const customerAnalysis = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED'] },
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: { name: '$name', phone: '$phone', address: '$address' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $add: [{ $multiply: ['$items.quantity', '$items.unitSellingPrice'] }, '$deliveryCharge'] } },
          totalItems: { $sum: '$items.quantity' },
          firstOrder: { $min: '$orderDate' },
          lastOrder: { $max: '$orderDate' },
          avgOrderValue: { $avg: { $add: [{ $multiply: ['$items.quantity', '$items.unitSellingPrice'] }, '$deliveryCharge'] } },
          favoriteProducts: { $push: '$items.productCode' }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    // Geographic analysis for Bangladesh divisions
    const bangladeshDivisions = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh'];
    const geographicAnalysis = customerAnalysis.reduce((acc: any, customer: any) => {
      const address = customer._id.address?.toLowerCase() || '';
      let division = 'Other';
      
      // Find division based on address content
      for (const div of bangladeshDivisions) {
        if (address.includes(div.toLowerCase())) {
          division = div;
          break;
        }
      }
      
      if (!acc[division]) {
        acc[division] = {
          division,
          totalCustomers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0
        };
      }
      
      acc[division].totalCustomers += 1;
      acc[division].totalOrders += customer.totalOrders;
      acc[division].totalRevenue += customer.totalSpent;
      
      return acc;
    }, {});

    // Calculate averages for geographic data
    Object.values(geographicAnalysis).forEach((geo: any) => {
      geo.avgOrderValue = Math.round(geo.totalRevenue / geo.totalOrders);
      geo.totalRevenue = Math.round(geo.totalRevenue);
    });

    // Find top geographic area
    const topGeographicArea = Object.values(geographicAnalysis)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)[0] as any;

    const totalCustomers = customerAnalysis.length;
    const vipCustomers = customerAnalysis.filter((c: any) => c.totalSpent > 5000);
    const loyalCustomers = customerAnalysis.filter((c: any) => c.totalOrders >= 3);
    const recentCustomers = customerAnalysis.filter((c: any) => {
      const daysSinceLastOrder = (Date.now() - c.lastOrder.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastOrder <= 30;
    });

    const totalRevenue = customerAnalysis.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
    const avgCustomerValue = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;
    const repeatCustomerRate = totalCustomers > 0 ? Math.round((loyalCustomers.length / totalCustomers) * 100) : 0;
    const vipContribution = totalRevenue > 0 ? Math.round((vipCustomers.reduce((sum: number, c: any) => sum + c.totalSpent, 0) / totalRevenue) * 100) : 0;

    const summary = {
      totalCustomers,
      vipCustomers: vipCustomers.length,
      loyalCustomers: loyalCustomers.length,
      recentActiveCustomers: recentCustomers.length,
      avgCustomerValue
    };

    const insights = {
      repeatCustomerRate,
      vipContribution,
      topGeographicArea: topGeographicArea?.division || 'N/A',
      geographicPatterns: `Most orders come from ${topGeographicArea?.division || 'various areas'}, with customers there spending an average of ৳${topGeographicArea?.avgOrderValue || 0} per order`
    };

    const topCustomers = customerAnalysis.slice(0, 10).map((c: any) => ({
      _id: { 
        name: c._id.name,
        phone: c._id.phone,
        address: c._id.address
      },
      totalOrders: c.totalOrders,
      totalSpent: Math.round(c.totalSpent),
      totalRevenue: Math.round(c.totalSpent)
    }));

    res.json({
      overview: summary,
      insights,
      topCustomers,
      geographicAnalysis: Object.values(geographicAnalysis)
    });
  } catch (error) {
    logger.error('Customer analytics error:', error);
    res.status(500).json({ error: 'Failed to generate customer analytics' });
  }
};

// Financial Analytics with comprehensive Harvard-level metrics
export const getFinancialAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    // Revenue and cost analysis with delivery charges
    const financialData = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED'] },
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.productCode',
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } },
          totalDeliveryCharges: { $sum: '$deliveryCharge' },
          totalQuantitySold: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          avgUnitPrice: { $avg: '$items.unitSellingPrice' },
          avgDeliveryCharge: { $avg: '$deliveryCharge' }
        }
      }
    ]);

    // Get inventory data for stock value calculation
    const inventoryData = await InventoryItem.find({}).lean();
    const inventoryMap = inventoryData.reduce((acc: any, item) => {
      acc[item.finalCode] = {
        stockValue: item.buyPrice * item.totalQty, // Use actual buy price
        currentStock: item.totalQty,
        buyPrice: item.buyPrice,
        sellPrice: item.buyPrice * 1.43 // Estimated sell price (30% margin)
      };
      return acc;
    }, {});

    // Calculate enhanced financial metrics
    const enhancedProducts = financialData.map((product: any) => {
      const inventory = inventoryMap[product._id] || { stockValue: 0, currentStock: 0, buyPrice: 0, sellPrice: 0 };
      const netRevenue = product.totalRevenue - product.totalDeliveryCharges;
      const totalCost = product.totalQuantitySold * inventory.buyPrice;
      const profit = netRevenue - totalCost; // Corrected profit calculation
      const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
      const avgProfitPerUnit = product.totalQuantitySold > 0 ? profit / product.totalQuantitySold : 0;

      return {
        productCode: product._id,
        totalRevenue: Math.round(product.totalRevenue),
        netRevenue: Math.round(netRevenue),
        stockValue: Math.round(inventory.stockValue),
        deliveryCharges: Math.round(product.totalDeliveryCharges),
        totalProfit: Math.round(profit),
        profitMargin: Math.round(profitMargin * 10) / 10,
        avgProfitPerUnit: Math.round(avgProfitPerUnit * 100) / 100,
        totalQuantitySold: product.totalQuantitySold,
        orderCount: product.orderCount,
        currentStock: inventory.currentStock
      };
    });

    // Calculate comprehensive summary metrics
    const totalRevenue = enhancedProducts.reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalNetRevenue = enhancedProducts.reduce((sum, p) => sum + p.netRevenue, 0);
    const totalStockValue = enhancedProducts.reduce((sum, p) => sum + p.stockValue, 0);
    const totalDeliveryCharges = enhancedProducts.reduce((sum, p) => sum + p.deliveryCharges, 0);
    const totalProfit = enhancedProducts.reduce((sum, p) => sum + p.totalProfit, 0);
    const totalQuantitySold = enhancedProducts.reduce((sum, p) => sum + p.totalQuantitySold, 0);

    // Harvard-level financial ratios
    const avgProfitMargin = totalNetRevenue > 0 ? (totalProfit / totalNetRevenue) * 100 : 0;
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - (totalStockValue * 0.7)) / totalRevenue) * 100 : 0; // Assuming 70% COGS
    const operatingMargin = totalRevenue > 0 ? ((totalProfit - (totalRevenue * 0.1)) / totalRevenue) * 100 : 0; // Assuming 10% operating expenses
    const returnOnInvestment = totalStockValue > 0 ? (totalProfit / totalStockValue) * 100 : 0;
    
    // Efficiency metrics
    const inventoryTurnover = totalStockValue > 0 ? (totalStockValue * 0.7) / totalStockValue : 0; // COGS / Average Inventory
    const daysInInventory = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;
    const assetTurnover = totalStockValue > 0 ? totalRevenue / totalStockValue : 0;

    // Liquidity ratios (simulated with available data)
    const currentAssets = totalStockValue + (totalRevenue * 0.1); // Stock + Cash equivalent
    const currentLiabilities = totalRevenue * 0.05; // Estimated payables
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentLiabilities > 0 ? (currentAssets - totalStockValue) / currentLiabilities : 0;
    const workingCapital = currentAssets - currentLiabilities;

    // Risk assessment
    const liquidityScore = Math.min(100, Math.max(0, currentRatio * 25)); // 0-100 scale
    const efficiencyScore = Math.min(100, Math.max(0, inventoryTurnover * 20)); // 0-100 scale
    const profitabilityScore = Math.min(100, Math.max(0, avgProfitMargin * 2)); // 0-100 scale
    const overallRiskLevel = (liquidityScore + efficiencyScore + profitabilityScore) / 3;

    // Growth calculation (compare with previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousData = await Order.aggregate([
      {
        $match: {
          status: { $nin: ['CANCELLED'] },
          orderDate: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } }
        }
      }
    ]);

    const previousRevenue = previousData[0]?.totalRevenue || 0;
    const currentRevenue = enhancedProducts.reduce((sum, p) => sum + p.totalRevenue, 0);
    const currentMonthGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Find top performers
    const sortedByProfit = enhancedProducts.sort((a, b) => b.totalProfit - a.totalProfit);
    const sortedByMargin = enhancedProducts.sort((a, b) => b.profitMargin - a.profitMargin);
    const mostProfitable = sortedByProfit[0];
    const highestMargin = sortedByMargin[0];

    res.json({
      insights: {
        avgProfitMargin: Math.round(avgProfitMargin * 10) / 10,
        currentMonthGrowth: Math.round(currentMonthGrowth * 10) / 10,
        topPerformingCategory: mostProfitable?.productCode || 'N/A',
        profitabilityTrend: currentMonthGrowth > 0 ? 'increasing' : currentMonthGrowth < 0 ? 'decreasing' : 'stable',
        riskLevel: overallRiskLevel > 70 ? 'low' : overallRiskLevel > 40 ? 'medium' : 'high',
        liquidityScore: Math.round(liquidityScore),
        efficiencyScore: Math.round(efficiencyScore),
        profitabilityScore: Math.round(profitabilityScore)
      },
      profitability: {
        summary: {
          totalProfit: Math.round(totalProfit),
          avgProfitMargin: Math.round(avgProfitMargin * 10) / 10,
          totalStockValue: Math.round(totalStockValue),
          totalDeliveryCharges: Math.round(totalDeliveryCharges),
          netTotalRevenue: Math.round(totalNetRevenue),
          currentMonthGrowth: Math.round(currentMonthGrowth * 10) / 10,
          grossMargin: Math.round(grossMargin * 10) / 10,
          operatingMargin: Math.round(operatingMargin * 10) / 10,
          returnOnInvestment: Math.round(returnOnInvestment * 10) / 10,
          inventoryTurnover: Math.round(inventoryTurnover * 10) / 10,
          daysInInventory: Math.round(daysInInventory),
          currentRatio: Math.round(currentRatio * 100) / 100,
          quickRatio: Math.round(quickRatio * 100) / 100,
          workingCapital: Math.round(workingCapital),
          assetTurnover: Math.round(assetTurnover * 100) / 100,
          mostProfitable: mostProfitable ? {
            productCode: mostProfitable.productCode,
            totalProfit: mostProfitable.totalProfit,
            totalRevenue: mostProfitable.totalRevenue,
            profitMargin: mostProfitable.profitMargin
          } : null,
          highestMargin: highestMargin ? {
            productCode: highestMargin.productCode,
            profitMargin: highestMargin.profitMargin,
            totalProfit: highestMargin.totalProfit
          } : null
        },
        products: enhancedProducts.sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 20)
      }
    });
  } catch (error) {
    logger.error('Financial analytics error:', error);
    res.status(500).json({ error: 'Failed to generate financial analytics' });
  }
};

// Dashboard analytics combining all metrics
export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const days = 30; // Last 30 days for dashboard
    
    // Quick metrics for dashboard
    const [revenueData, orderStats, inventoryStats] = await Promise.all([
      // Revenue trend
      Order.aggregate([
        {
          $match: {
            status: { $nin: ['CANCELLED'] },
            orderDate: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
            dailyRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } },
            dailyOrders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Order statistics
      Order.aggregate([
        {
          $match: {
            orderDate: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: { $multiply: ['$items.quantity', '$items.unitSellingPrice'] } }
          }
        }
      ]),
      
      // Inventory alerts
      InventoryItem.aggregate([
        {
          $project: {
            finalCode: 1,
            totalQty: { $add: ['$sizes.M', '$sizes.L', '$sizes.XL', '$sizes.XXL'] },
            buyPrice: 1
          }
        },
        {
          $match: {
            $or: [
              { totalQty: { $eq: 0 } }, // Out of stock
              { totalQty: { $lte: 5 } }  // Low stock
            ]
          }
        }
      ])
    ]);

    const totalRevenue = revenueData.reduce((sum: number, day: any) => sum + day.dailyRevenue, 0);
    const totalOrders = revenueData.reduce((sum: number, day: any) => sum + day.dailyOrders, 0);
    const avgDailyRevenue = totalRevenue / days;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const outOfStock = inventoryStats.filter((item: any) => item.totalQty === 0);
    const lowStock = inventoryStats.filter((item: any) => item.totalQty > 0 && item.totalQty <= 5);

    res.json({
      success: true,
      data: {
        revenue: {
          total: Math.round(totalRevenue),
          daily: Math.round(avgDailyRevenue),
          trend: revenueData.slice(-7), // Last 7 days
          growth: revenueData.length > 7 ? 
            ((revenueData.slice(-7).reduce((s: number, d: any) => s + d.dailyRevenue, 0) / 7) - 
             (revenueData.slice(-14, -7).reduce((s: number, d: any) => s + d.dailyRevenue, 0) / 7)) / 
             (revenueData.slice(-14, -7).reduce((s: number, d: any) => s + d.dailyRevenue, 0) / 7) * 100 : 0
        },
        orders: {
          total: totalOrders,
          avgValue: Math.round(avgOrderValue),
          statusBreakdown: orderStats,
          conversionRate: 85 // Placeholder - would need visitor data
        },
        inventory: {
          outOfStock: outOfStock.length,
          lowStock: lowStock.length,
          totalValue: inventoryStats.reduce((sum: number, item: any) => sum + (item.totalQty * item.buyPrice), 0),
          alerts: [...outOfStock.slice(0, 5), ...lowStock.slice(0, 5)]
        },
        alerts: [
          ...(outOfStock.length > 0 ? [{
            type: 'urgent',
            message: `${outOfStock.length} products are out of stock`,
            action: 'Restock immediately'
          }] : []),
          ...(lowStock.length > 0 ? [{
            type: 'warning', 
            message: `${lowStock.length} products have low stock`,
            action: 'Review stock levels'
          }] : [])
        ]
      }
    });
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard analytics' });
  }
};

