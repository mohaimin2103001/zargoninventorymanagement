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
  LogOut,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function HomePage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-300">
      <header className="nav-modern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-md">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Zargon Inventory</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="glass px-4 py-2 rounded-xl">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {user.name} <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">({user.role})</span>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 card-modern p-8 animate-slide-down">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-7 w-7 text-yellow-500" />
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {user.name}! 👋</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Here&apos;s an overview of your inventory and recent activity.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 card-modern animate-pulse">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-gray-700 text-lg font-semibold">Loading dashboard...</p>
            </div>
          </div>
        ) : reports?.overview ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="stat-card-blue stagger-item">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Products</CardTitle>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">{reports.overview.totalAvailableProducts.productCount}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Worth ${(reports.overview.totalAvailableProducts.worth || 0).toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="stat-card-green stagger-item">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-300">Products Sold</CardTitle>
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">{reports.overview.totalProductsSold.amount}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Revenue ${(reports.overview.totalProductsSold.worth || 0).toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="stat-card-amber stagger-item">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-300">Low Stock</CardTitle>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">{reports.overview.lowStockItems}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Items need restocking</p>
                </CardContent>
              </Card>

              <Card className="stat-card-red stagger-item">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-300">Out of Stock</CardTitle>
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1">{reports.overview.outOfStockItems}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Items unavailable</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 card-modern">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 text-lg font-semibold mb-4">Failed to load dashboard data</p>
            <Button onClick={fetchReports} className="gap-2"><ArrowRight className="h-4 w-4" />Retry</Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover-lift cursor-pointer group" onClick={() => router.push('/dashboard')}>
            <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b border-blue-100 dark:border-blue-900">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <span>Stock Management</span>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">View, add, edit and manage your product inventory</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full gap-2" variant="default">
                <span>Manage Stock</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-lift cursor-pointer group" onClick={() => router.push('/dashboard/orders')}>
            <CardHeader className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-b border-green-100 dark:border-green-900">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                  <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <span>Order Management</span>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Process orders, track deliveries, and manage customer requests</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full gap-2" variant="success">
                <span>View Orders</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover-lift cursor-pointer group" onClick={() => router.push('/dashboard/reports')}>
            <CardHeader className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-b border-purple-100 dark:border-purple-900">
              <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <span>Reports & Analytics</span>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">View detailed reports, recent activities and business insights</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <span>View Reports</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!loading && reports && reports.topSellingProducts.length > 0 && (
            <Card className="card-modern">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="flex items-center gap-3 dark:text-gray-100">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span>Top Selling Products</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {reports.topSellingProducts.slice(0, 5).map((product, index) => (
                    <div key={product._id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950 dark:hover:to-indigo-950 transition-all duration-200 hover-scale border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-sm font-bold text-white">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{product._id}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{product.orderCount} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-gray-100">{product.totalSold} sold</p>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">${(product.totalRevenue || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && reports && (reports.overview.lowStockItems > 0 || reports.overview.outOfStockItems > 0) && (
            <Card className="card-modern">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                <CardTitle className="flex items-center gap-3 dark:text-gray-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span>Stock Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {reports.overview.lowStockItems > 0 && (
                    <div className="status-pending rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          <div>
                            <p className="font-semibold text-amber-900 dark:text-amber-200">Low Stock Items</p>
                            <p className="text-sm text-amber-700 dark:text-amber-400">Items running low on inventory</p>
                          </div>
                        </div>
                        <Badge className="badge-warning">{reports.overview.lowStockItems}</Badge>
                      </div>
                    </div>
                  )}
                  {reports.overview.outOfStockItems > 0 && (
                    <div className="status-cancelled rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <div>
                            <p className="font-semibold text-red-900 dark:text-red-200">Out of Stock</p>
                            <p className="text-sm text-red-700 dark:text-red-400">Items completely out of stock</p>
                          </div>
                        </div>
                        <Badge className="badge-error">{reports.overview.outOfStockItems}</Badge>
                      </div>
                    </div>
                  )}
                  <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/dashboard?filter=lowStock')}>
                    View All Stock Issues
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">© 2025 Zargon Inventory Management System</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
