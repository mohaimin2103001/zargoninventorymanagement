import { logger } from '../utils/logger';
import { Response } from 'express';
import { Order } from '../models/Order';
import { AuthRequest } from '../middleware/auth';

export const getCustomerRankings = async (req: AuthRequest, res: Response) => {
  try {
    const { timespan = '90' } = req.query;
    
    // Calculate date range
    let startDate: Date | undefined;
    if (timespan !== 'all') {
      const days = parseInt(timespan as string);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Build match condition
    const matchCondition: any = {};
    if (startDate) {
      matchCondition.orderDate = { $gte: startDate };
    }

    // Aggregate customer data
    const customerStats = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { phone: '$phone', address: '$address' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: { $add: ['$totalAmount', '$deliveryCharge'] } },
          totalQuantity: { $sum: { $sum: '$items.quantity' } },
          firstOrderDate: { $min: '$orderDate' },
          lastOrderDate: { $max: '$orderDate' }
        }
      },
      {
        $addFields: {
          averageOrderValue: { $divide: ['$totalSpent', '$totalOrders'] },
          // Calculate order frequency (orders per month)
          daysBetween: {
            $divide: [
              { $subtract: ['$lastOrderDate', '$firstOrderDate'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          }
        }
      },
      {
        $addFields: {
          orderFrequency: {
            $cond: {
              if: { $eq: ['$daysBetween', 0] },
              then: '$totalOrders', // If only one day, frequency is total orders
              else: {
                $multiply: [
                  { $divide: ['$totalOrders', { $add: ['$daysBetween', 1] }] },
                  30.44 // Average days per month
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          // Calculate composite score based on multiple factors
          volumeScore: { $multiply: ['$totalSpent', 0.4] }, // 40% weight on spending
          frequencyScore: { $multiply: ['$orderFrequency', 100] }, // 30% weight on frequency
          loyaltyScore: { $multiply: ['$totalOrders', 20] }, // 30% weight on order count
        }
      },
      {
        $addFields: {
          score: {
            $add: ['$volumeScore', '$frequencyScore', '$loyaltyScore']
          }
        }
      },
      { $sort: { score: -1 } }
    ]);

    // Add rankings and tiers
    const rankedCustomers = customerStats.map((customer, index) => ({
      ...customer,
      rank: index + 1,
      volumeRank: 0, // Will be calculated separately
      frequencyRank: 0, // Will be calculated separately
      tier: getTier(index + 1, customerStats.length)
    }));

    // Create volume rankings
    const volumeRankings = [...rankedCustomers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .map((customer, index) => ({
        ...customer,
        volumeRank: index + 1,
        rank: index + 1
      }));

    // Create frequency rankings
    const frequencyRankings = [...rankedCustomers]
      .sort((a, b) => b.orderFrequency - a.orderFrequency)
      .map((customer, index) => ({
        ...customer,
        frequencyRank: index + 1,
        rank: index + 1
      }));

    // Calculate summary statistics
    const summary = {
      totalCustomers: customerStats.length,
      avgOrdersPerCustomer: customerStats.length > 0 
        ? customerStats.reduce((sum, c) => sum + c.totalOrders, 0) / customerStats.length 
        : 0,
      avgSpendPerCustomer: customerStats.length > 0 
        ? customerStats.reduce((sum, c) => sum + c.totalSpent, 0) / customerStats.length 
        : 0,
      topTierCustomers: rankedCustomers.filter(c => c.tier === 'Diamond' || c.tier === 'Platinum').length
    };

    res.json({
      overallRankings: rankedCustomers,
      topCustomersByVolume: volumeRankings,
      topCustomersByFrequency: frequencyRankings,
      summary,
      timespan,
      generatedAt: new Date()
    });

  } catch (error) {
    logger.error('Error in getCustomerRankings:', error);
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to generate customer rankings' 
      } 
    });
  }
};

// Helper function to determine customer tier
function getTier(rank: number, totalCustomers: number): 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze' {
  const percentile = (rank / totalCustomers) * 100;
  
  if (percentile <= 5) return 'Diamond';
  if (percentile <= 15) return 'Platinum';
  if (percentile <= 35) return 'Gold';
  if (percentile <= 60) return 'Silver';
  return 'Bronze';
}

// Get customer ranking trends over time
export const getCustomerRankingTrends = async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.params;
    
    // Get monthly performance for the customer over the last 12 months
    const monthlyData = await Order.aggregate([
      { 
        $match: { 
          phone,
          orderDate: { 
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) 
          }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          orders: { $sum: 1 },
          spent: { $sum: { $add: ['$unitPrice', '$deliveryCharge'] } },
          quantity: { $sum: '$qty' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      customer: phone,
      monthlyPerformance: monthlyData,
      generatedAt: new Date()
    });

  } catch (error) {
    logger.error('Error in getCustomerRankingTrends:', error);
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'Failed to get customer ranking trends' 
      } 
    });
  }
};

