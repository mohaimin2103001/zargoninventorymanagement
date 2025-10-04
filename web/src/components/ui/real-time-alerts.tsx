/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Bell, 
  X, 
  RefreshCw 
} from 'lucide-react';

interface AlertItem {
  type: string;
  level: 'urgent' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  product?: string;
  order?: any;
  data?: any;
  count?: number;
}

interface AlertsData {
  alerts: AlertItem[];
  summary: {
    total: number;
    urgent: number;
    warning: number;
    info: number;
  };
  lastChecked: Date;
}

export function RealTimeAlerts() {
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/alerts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAlertsData(data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertStyles = (level: string) => {
    switch (level) {
      case 'urgent':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const dismissAlert = (alertIndex: number) => {
    const alertKey = `${alertsData?.alerts[alertIndex]?.type}-${alertIndex}`;
    setDismissedAlerts(prev => new Set([...prev, alertKey]));
  };

  const activeAlerts = alertsData?.alerts.filter((_, index) => {
    const alertKey = `${alertsData.alerts[index]?.type}-${index}`;
    return !dismissedAlerts.has(alertKey);
  }) || [];

  if (!alertsData && !loading) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Real-time Alerts</h3>
          {alertsData && (
            <div className="flex space-x-2">
              {alertsData.summary.urgent > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  {alertsData.summary.urgent} Urgent
                </Badge>
              )}
              {alertsData.summary.warning > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  {alertsData.summary.warning} Warning
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last checked: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            disabled={loading}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      {activeAlerts.length === 0 ? (
        <div className="text-center py-8 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600 mb-2">✅</div>
          <p className="text-green-700 font-medium">All clear! No active alerts.</p>
          <p className="text-green-600 text-sm">Your inventory system is running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert, index) => (
            <Alert 
              key={`${alert.type}-${index}`}
              className={`${getAlertStyles(alert.level)} border-l-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertIcon(alert.level)}
                  <div className="flex-1">
                    <AlertDescription className="font-medium">
                      {alert.message}
                    </AlertDescription>
                    <div className="mt-1 text-sm opacity-75">
                      {new Date(alert.timestamp).toLocaleString()} • Type: {alert.type}
                    </div>
                    
                    {/* Additional context for specific alert types */}
                    {alert.type === 'CRITICAL_STOCK' && alert.product && (
                      <div className="mt-2 p-2 bg-white bg-opacity-50 rounded">
                        <span className="font-mono text-sm">Product: {alert.product}</span>
                      </div>
                    )}
                    
                    {alert.type === 'UNUSUAL_ORDER' && alert.order && (
                      <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-sm">
                        <div>Customer: {alert.order.name}</div>
                        <div>Phone: {alert.order.phone}</div>
                        <div>Product: {alert.order.code}</div>
                      </div>
                    )}
                    
                    {alert.type === 'SALES_DROP' && alert.data && (
                      <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-sm">
                        <div>Current week: ৳{alert.data.currentSales?.toLocaleString()}</div>
                        <div>Previous week: ৳{alert.data.previousSales?.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(index)}
                  className="flex-shrink-0 ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Quick Actions for Critical Alerts */}
      {alertsData && alertsData.summary.urgent > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Recommended Actions:</h4>
          <div className="space-y-2 text-sm text-red-700">
            {alertsData.alerts
              .filter(alert => alert.level === 'urgent' && alert.type === 'CRITICAL_STOCK')
              .map((alert, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span>📦</span>
                  <span>Immediately reorder stock for {alert.product}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
