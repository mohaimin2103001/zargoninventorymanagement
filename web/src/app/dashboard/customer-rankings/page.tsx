/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users,
  Calendar,
  RefreshCw,
  Crown,
  Star,
  Target,
  ShoppingCart,
  Clock
} from 'lucide-react';
import AboutDeveloper from '@/components/ui/about-developer';

interface CustomerRanking {
  _id: { phone: string; address: string };
  totalOrders: number;
  totalSpent: number;
  totalQuantity: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  orderFrequency: number; // orders per month
  rank: number;
  score: number;
  tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  frequencyRank: number;
  volumeRank: number;
}

interface CustomerRankingsData {
  topCustomersByVolume: CustomerRanking[];
  topCustomersByFrequency: CustomerRanking[];
  overallRankings: CustomerRanking[];
  summary: {
    totalCustomers: number;
    avgOrdersPerCustomer: number;
    avgSpendPerCustomer: number;
    topTierCustomers: number;
  };
}

export default function CustomerRankingsPage() {
  const [rankingsData, setRankingsData] = useState<CustomerRankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timespan, setTimespan] = useState<'30' | '90' | '180' | '365' | 'all'>('90');
  const [activeTab, setActiveTab] = useState<'volume' | 'frequency' | 'overall'>('overall');

  const fetchCustomerRankings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/analytics/customer-rankings?timespan=${timespan}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Customer rankings data received:', data);
        setRankingsData(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch customer rankings:', response.status, response.statusText);
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching customer rankings:', error);
    } finally {
      setLoading(false);
    }
  }, [timespan]);

  useEffect(() => {
    fetchCustomerRankings();
  }, [fetchCustomerRankings]);

  useEffect(() => {
    if (rankingsData) {
      console.log('Debug - rankingsData updated:', rankingsData);
      console.log('Debug - overallRankings:', rankingsData.overallRankings);
      console.log('Debug - overallRankings length:', rankingsData.overallRankings?.length);
    }
  }, [rankingsData]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      case 4:
        return <Award className="h-5 w-5 text-blue-500" />;
      case 5:
        return <Star className="h-5 w-5 text-purple-500" />;
      default:
        return <Target className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamond':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Platinum':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Silver':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Bronze':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimespan = (days: string) => {
    switch (days) {
      case '30': return 'Last 30 Days';
      case '90': return 'Last 3 Months';
      case '180': return 'Last 6 Months';
      case '365': return 'Last Year';
      case 'all': return 'All Time';
      default: return 'Last 3 Months';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold ecommerce-header">Customer Rankings</h1>
        </div>
        <div className="flex items-center justify-center py-12" suppressHydrationWarning>
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold ecommerce-header">Customer Rankings</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <select
              value={timespan}
              onChange={(e) => setTimespan(e.target.value as any)}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <Button onClick={fetchCustomerRankings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {rankingsData && (
        (rankingsData.overallRankings && rankingsData.overallRankings.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">{rankingsData.summary.totalCustomers}</div>
                  <p className="text-xs text-blue-600 mt-1">{formatTimespan(timespan)}</p>
                </CardContent>
              </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Avg Orders/Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{rankingsData.summary.avgOrdersPerCustomer.toFixed(1)}</div>
                <p className="text-xs text-green-600 mt-1">Orders per customer</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Avg Spend/Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">৳{rankingsData.summary.avgSpendPerCustomer.toLocaleString()}</div>
                <p className="text-xs text-purple-600 mt-1">Average customer value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-amber-50 to-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">Top Tier Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{rankingsData.summary.topTierCustomers}</div>
                <p className="text-xs text-amber-600 mt-1">Diamond & Platinum</p>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overall')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overall'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Trophy className="h-4 w-4 inline mr-2" />
              Overall Rankings
            </button>
            <button
              onClick={() => setActiveTab('volume')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'volume'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingCart className="h-4 w-4 inline mr-2" />
              By Volume
            </button>
            <button
              onClick={() => setActiveTab('frequency')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'frequency'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              By Frequency
            </button>
          </div>

          {/* Rankings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {activeTab === 'overall' && <Trophy className="h-5 w-5" />}
                {activeTab === 'volume' && <ShoppingCart className="h-5 w-5" />}
                {activeTab === 'frequency' && <Clock className="h-5 w-5" />}
                <span>
                  {activeTab === 'overall' && 'Overall Customer Rankings'}
                  {activeTab === 'volume' && 'Top Customers by Purchase Volume'}
                  {activeTab === 'frequency' && 'Top Customers by Order Frequency'}
                </span>
              </CardTitle>
              <p className="text-sm text-gray-600">
                {activeTab === 'overall' && 'Comprehensive ranking based on volume, frequency, and value'}
                {activeTab === 'volume' && 'Customers ranked by total purchase amount and quantity'}
                {activeTab === 'frequency' && 'Customers ranked by order frequency and consistency'}
              </p>
            </CardHeader>
            <CardContent>
              <Table className="bg-white">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-16 text-gray-700">Rank</TableHead>
                    <TableHead className="text-gray-700">Customer</TableHead>
                    <TableHead className="text-gray-700">Tier</TableHead>
                    <TableHead className="text-right text-gray-700">Orders</TableHead>
                    <TableHead className="text-right text-gray-700">Total Spent</TableHead>
                    <TableHead className="text-right text-gray-700">Avg Order</TableHead>
                    <TableHead className="text-right text-gray-700">Frequency</TableHead>
                    <TableHead className="text-right text-gray-700">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {(activeTab === 'overall' ? rankingsData.overallRankings :
                    activeTab === 'volume' ? rankingsData.topCustomersByVolume :
                    rankingsData.topCustomersByFrequency)
                    .slice(0, 20)
                    .map((customer, index) => (
                    <TableRow key={`${customer._id.phone}-${customer._id.address}-${index}`} className={`${index < 5 ? 'bg-yellow-50' : 'bg-white'} hover:bg-gray-50 border-b border-gray-200`}>
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(customer.rank)}
                          <span className="font-bold text-lg text-gray-900">{customer.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900">
                        <div>
                          <div className="font-medium text-gray-900">{customer._id.phone}</div>
                          <div className="text-sm text-gray-600 truncate max-w-48">{customer._id.address}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTierColor(customer.tier)}>
                          {customer.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{customer.totalOrders}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">৳{customer.totalSpent.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-gray-900">৳{customer.averageOrderValue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{customer.orderFrequency.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">per month</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-600">{customer.score.toFixed(0)}</span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (customer.score / 1000) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top 5 Highlight */}
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800">
                <Crown className="h-5 w-5" />
                <span>Top 5 Customers - {formatTimespan(timespan)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {rankingsData.overallRankings.slice(0, 5).map((customer, index) => (
                  <div key={`top5-${customer._id.phone}-${customer._id.address}-${index}`} className="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(index + 1)}
                        <span className="font-bold text-lg">#{index + 1}</span>
                      </div>
                      <Badge className={getTierColor(customer.tier)}>
                        {customer.tier}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{customer._id.phone}</div>
                      <div className="text-xs text-gray-500 truncate">{customer._id.address}</div>
                      <div className="text-sm">
                        <span className="font-semibold">{customer.totalOrders}</span>
                        <span className="text-gray-500"> orders</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">৳{customer.totalSpent.toLocaleString()}</span>
                        <span className="text-gray-500"> spent</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.orderFrequency.toFixed(1)} orders/month
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No customer rankings found</h2>
            <p className="text-gray-500">Try changing the timespan or check back later.</p>
          </div>
        ))
      )}

      {/* About Developer Section */}
      <AboutDeveloper />
    </div>
  );
}
