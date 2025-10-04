'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { reportsAPI } from '@/lib/api';
import { ReportsData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  BarChart3,
  LogOut
} from 'lucide-react';

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;
    
    // Only redirect to login if not logged in
    if (!user) {
      router.push('/login');
      return;
    }
    
    // If logged in, fetch reports for the home page
    fetchReports();
  }, [user, isLoading, router]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.get();
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-2 border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="h-9 w-9 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-black">Zargon Inventory</h1>
                <p className="text-sm text-blue-700 font-semibold">Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                <p className="text-sm font-bold text-black">{user.name}</p>
                <p className="text-xs text-blue-700 capitalize font-semibold">{user.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border-2 border-blue-200">
          <h2 className="text-3xl font-bold text-black mb-2">
            Welcome back, {user.name}! 👋
          </h2>
          <p className="text-gray-800 text-lg font-medium">
            Here&apos;s an overview of your inventory and recent activity.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-blue-200">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-black text-lg font-semibold">Loading dashboard...</p>
          </div>
        ) : reports?.overview ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-blue-900">Total Products</CardTitle>
                  <Package className="h-5 w-5 text-blue-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-black">
                    {reports.overview.totalAvailableProducts.productCount}
                  </div>
                  <p className="text-sm text-blue-800 font-semibold">
                    Worth ${(reports.overview.totalAvailableProducts.worth || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-green-900">Products Sold</CardTitle>
                  <TrendingUp className="h-5 w-5 text-green-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-black">
                    {reports.overview.totalProductsSold.amount}
                  </div>
                  <p className="text-sm text-green-800 font-semibold">
                    Revenue ${(reports.overview.totalProductsSold.worth || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-yellow-900">Low Stock</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-yellow-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-black">
                    {reports.overview.lowStockItems}
                  </div>
                  <p className="text-sm text-yellow-800 font-semibold">
                    Items need restocking
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-red-900">Out of Stock</CardTitle>
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-black">
                    {reports.overview.outOfStockItems}
                  </div>
                  <p className="text-sm text-red-800 font-semibold">
                    Items unavailable
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg border-2 border-red-200">
            <p className="text-red-600 text-lg font-semibold">Failed to load dashboard data</p>
            <Button 
              onClick={fetchReports} 
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-2 border-blue-300 hover:border-blue-400 hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => router.push('/dashboard')}>
            <CardHeader className="bg-gradient-to-r from-blue-100 to-blue-200 border-b-2 border-blue-300">
              <CardTitle className="flex items-center space-x-3 text-black font-black">
                <Package className="h-7 w-7 text-blue-700" />
                <span>Inventory Management</span>
              </CardTitle>
              <CardDescription className="text-gray-800 font-semibold">
                View, add, and manage your product inventory
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center space-x-2 border-2 border-blue-700">
                <span>Manage Stock</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-green-300 hover:border-green-400 hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => router.push('/dashboard/orders')}>
            <CardHeader className="bg-gradient-to-r from-green-100 to-green-200 border-b-2 border-green-300">
              <CardTitle className="flex items-center space-x-3 text-black font-black">
                <ShoppingCart className="h-7 w-7 text-green-700" />
                <span>Order Management</span>
              </CardTitle>
              <CardDescription className="text-gray-800 font-semibold">
                Process orders, track deliveries, and manage customer requests
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 flex items-center justify-center space-x-2 border-2 border-green-700">
                <span>View Orders</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-purple-300 hover:border-purple-400 hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105" onClick={() => router.push('/dashboard/reports')}>
            <CardHeader className="bg-gradient-to-r from-purple-100 to-purple-200 border-b-2 border-purple-300">
              <CardTitle className="flex items-center space-x-3 text-black font-black">
                <BarChart3 className="h-7 w-7 text-purple-700" />
                <span>Reports & Analytics</span>
              </CardTitle>
              <CardDescription className="text-gray-800 font-semibold">
                View detailed reports and business insights
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 flex items-center justify-center space-x-2 border-2 border-purple-700">
                <span>View Reports</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          {!loading && reports && reports.topSellingProducts.length > 0 && (
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center space-x-3 text-slate-900">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Top Selling Products</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {reports.topSellingProducts.slice(0, 5).map((product, index) => (
                    <div key={product._id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-700">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{product._id}</p>
                          <p className="text-sm text-slate-600">{product.orderCount} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{product.totalSold} sold</p>
                        <p className="text-sm font-semibold text-green-600">${(product.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Alerts */}
          {!loading && reports && (reports.overview.lowStockItems > 0 || reports.overview.outOfStockItems > 0) && (
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="flex items-center space-x-3 text-slate-900">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>Stock Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {reports.overview.lowStockItems > 0 && (
                    <div className="status-pending p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="font-semibold text-yellow-800">Low Stock Items</p>
                            <p className="text-sm text-yellow-700">Items running low on inventory</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 font-bold">
                          {reports.overview.lowStockItems}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {reports.overview.outOfStockItems > 0 && (
                    <div className="status-cancelled p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-semibold text-red-800">Out of Stock</p>
                            <p className="text-sm text-red-700">Items completely out of stock</p>
                          </div>
                        </div>
                        <Badge className="bg-red-100 text-red-800 border-red-300 font-bold">
                          {reports.overview.outOfStockItems}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full mt-6 border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={() => router.push('/dashboard?filter=lowStock')}
                  >
                    View All Stock Issues
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2025 Zargon Inventory Management System
            </p>
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
