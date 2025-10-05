'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ShoppingCart, BarChart3, LogOut, Bell, TrendingUp, Database, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NoticeBanner } from '@/components/ui/notice-banner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Derive activeTab directly from pathname (no state needed)
  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'stock';
    if (pathname.includes('/orders')) return 'orders';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/notices')) return 'notices';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/backup')) return 'backup';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/customer-rankings')) return 'customer-rankings';
    return 'stock';
  };

  const activeTab = getActiveTab();

  const baseTabs = [
    { id: 'stock', label: 'Stock', icon: Package, href: '/dashboard' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, href: '/dashboard/orders' },
    { id: 'reports', label: 'Reports', icon: BarChart3, href: '/dashboard/reports' },
  ];

  const staffTabs = [
    { id: 'notices', label: 'Notices', icon: Bell, href: '/dashboard/notices' },
  ];

  const adminTabs = [
    { id: 'notices', label: 'Notices', icon: Bell, href: '/dashboard/notices' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, href: '/dashboard/analytics' },
    { id: 'backup', label: 'Backup', icon: Database, href: '/dashboard/backup' },
    { id: 'admin', label: 'Admin Panel', icon: UserCog, href: '/dashboard/admin' },
  ];

  const tabs = user?.role === 'admin' ? [...baseTabs, ...adminTabs] : [...baseTabs, ...staffTabs];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      {/* Top Navigation */}
      <nav className="bg-white shadow-lg border-b-4 border-blue-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8" suppressHydrationWarning>
          {/* Row 1: Logo and User Info */}
          <div className="flex justify-between items-center h-16 min-w-0" suppressHydrationWarning>
            <div className="flex-shrink-0 flex items-center" suppressHydrationWarning>
              <h1 className="text-lg sm:text-xl font-black text-black dashboard-nav">
                Zargon Inventory
              </h1>
            </div>
            
            {/* User info - desktop and mobile */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0" suppressHydrationWarning>
              <div className="text-xs sm:text-sm font-bold bg-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg border-2 border-gray-500 shadow-md whitespace-nowrap" style={{ color: '#1f2937' }} suppressHydrationWarning>
                <span className="font-bold" style={{ color: '#111827' }} suppressHydrationWarning>
                  {user?.name || 'User'} <span className="text-xs font-semibold" style={{ color: '#374151' }}>({user?.role || 'staff'})</span>
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center border-2 border-red-500 text-red-700 hover:bg-red-50 font-bold text-xs sm:text-sm px-2 sm:px-3 py-1 whitespace-nowrap"
              >
                <LogOut className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Navigation Tabs - Desktop (horizontal) */}
          <div className="hidden md:flex md:space-x-3 lg:space-x-6 xl:space-x-8 border-t border-gray-200 py-2 overflow-x-auto" suppressHydrationWarning>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`inline-flex items-center px-3 py-1 rounded text-sm lg:text-base xl:text-lg font-bold whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Row 3: Navigation Tabs - Mobile (grid) */}
          <div className="md:hidden border-t border-gray-200 py-2" suppressHydrationWarning>
            <div className="grid grid-cols-3 gap-2">
              {tabs.slice(0, 6).map((tab) => {
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`flex flex-col items-center px-2 py-2 rounded text-xs font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{tab.label.split(' ')[0]}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Notice Banner */}
      <NoticeBanner className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
