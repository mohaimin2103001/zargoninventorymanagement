'use client';

import { useEffect, useState } from 'react';
import { reportsAPI } from '@/lib/api';
import { ReportsData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Package, AlertTriangle, XCircle } from 'lucide-react';
import AboutDeveloper from '@/components/ui/about-developer';

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // For now, fetch all-time reports (no date filtering)
      // This ensures consistency with how reports traditionally work
      const response = await reportsAPI.get();
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" suppressHydrationWarning>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" suppressHydrationWarning></div>
      </div>
    );
  }

  if (!reports?.overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load reports</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 ecommerce-header">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            Comprehensive overview of your inventory and sales performance.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.overview.totalProductsSold.amount}</div>
            <p className="text-xs text-muted-foreground">
              Worth: ৳{(reports.overview.totalProductsSold.worth || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.overview.totalAvailableProducts.amount}</div>
            <p className="text-xs text-muted-foreground">
              Worth: ৳{(reports.overview.totalAvailableProducts.worth || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{reports.overview.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items with ≤5 quantity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{reports.overview.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items with 0 quantity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Worth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports.statusBreakdown || []).map((status) => (
                  <TableRow key={status._id}>
                    <TableCell>
                      <Badge variant={
                        status._id === 'PAID' ? 'success' :
                        status._id === 'PENDING' ? 'warning' :
                        status._id === 'CAN' ? 'destructive' :
                        'secondary'
                      }>
                        {status._id}
                      </Badge>
                    </TableCell>
                    <TableCell>{status.count}</TableCell>
                    <TableCell>{status.totalAmount}</TableCell>
                    <TableCell>৳{(status.totalWorth || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reports.topSellingProducts || []).slice(0, 5).map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className="font-mono">{product._id}</TableCell>
                    <TableCell>{product.totalSold}</TableCell>
                    <TableCell>{product.orderCount}</TableCell>
                    <TableCell>৳{(product.totalRevenue || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.recentActivity.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Items Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reports.recentActivity || []).slice(-10).map((activity) => (
                    <TableRow key={activity._id}>
                      <TableCell>{activity._id}</TableCell>
                      <TableCell>{activity.orderCount}</TableCell>
                      <TableCell>{activity.totalUnits}</TableCell>
                      <TableCell>৳{(activity.dailyRevenue || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {((reports.lowStockItems || []).length > 0 || (reports.outOfStockItems || []).length > 0) && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(reports.lowStockItems || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-700">Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports.lowStockItems || []).slice(0, 5).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-mono">{item.finalCode}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>
                          <Badge variant="warning">{item.totalQty}</Badge>
                        </TableCell>
                        <TableCell>৳{(item.sellPrice || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {(reports.outOfStockItems || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Out of Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports.outOfStockItems || []).slice(0, 5).map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="font-mono">{item.finalCode}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell>৳{(item.sellPrice || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* About Developer Section */}
      <AboutDeveloper />
    </div>
  );
}
