'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Zap,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DatabaseStatus {
  currentConnection: 'primary' | 'mirror';
  isFailoverMode: boolean;
  manualOverride: 'primary' | 'mirror' | null;
  primaryStatus: {
    readyState: number;
    name: string;
    host: string;
    port: number;
  } | null;
  mirrorStatus: {
    readyState: number;
    name: string;
    host: string;
    port: number;
  } | null;
  connectionStates: { [key: number]: string };
}

interface HealthStatus {
  timestamp: string;
  primary: {
    available: boolean;
    ping: number | null;
    error: string | null;
  };
  mirror: {
    available: boolean;
    ping: number | null;
    error: string | null;
  };
}

export function DatabaseManager() {
  const { user } = useAuth();
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  const fetchDatabaseStatus = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    try {
      const response = await fetch('/api/database/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setDatabaseStatus(data.status);
      setHealthStatus(data.health);
    } catch (error) {
      console.error('Failed to fetch database status:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDatabaseStatus();
      const interval = setInterval(fetchDatabaseStatus, 15000); // Update every 15 seconds
      return () => clearInterval(interval);
    }
  }, [user, fetchDatabaseStatus]);

  const switchDatabase = async (target: 'primary' | 'mirror') => {
    if (!confirm(`Are you sure you want to switch to the ${target.toUpperCase()} database?`)) {
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setSwitchLoading(true);
    try {
      const response = await fetch('/api/database/switch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ target })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        fetchDatabaseStatus();
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to switch database:', error);
      alert('❌ Failed to switch database');
    } finally {
      setSwitchLoading(false);
    }
  };

  const enableAutoFailover = async () => {
    if (!confirm('Enable automatic failover? The system will automatically switch databases based on health.')) {
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/database/auto-failover', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Auto-failover enabled');
        fetchDatabaseStatus();
      } else {
        alert('❌ Failed to enable auto-failover');
      }
    } catch (error) {
      console.error('Failed to enable auto-failover:', error);
      alert('❌ Failed to enable auto-failover');
    } finally {
      setLoading(false);
    }
  };

  const performHealthCheck = async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/database/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const health = await response.json();
      setHealthStatus(health);
      alert('✅ Health check completed');
    } catch (error) {
      console.error('Failed to perform health check:', error);
      alert('❌ Health check failed');
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStateColor = (state: number) => {
    switch (state) {
      case 1: return 'text-green-600'; // connected
      case 2: return 'text-yellow-600'; // connecting
      case 3: return 'text-orange-600'; // disconnecting
      default: return 'text-red-600'; // disconnected
    }
  };

  const getConnectionStateIcon = (state: number) => {
    switch (state) {
      case 1: return <Wifi className="w-4 h-4" />; // connected
      case 2: return <Clock className="w-4 h-4" />; // connecting
      case 3: return <Clock className="w-4 h-4" />; // disconnecting
      default: return <WifiOff className="w-4 h-4" />; // disconnected
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Database Failover System</h2>
        </div>
        <Button onClick={fetchDatabaseStatus} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current Status Alert */}
      {databaseStatus && (
        <Alert className={`border-2 ${
          databaseStatus.isFailoverMode 
            ? 'border-orange-300 bg-orange-50' 
            : databaseStatus.currentConnection === 'primary' 
              ? 'border-green-300 bg-green-50'
              : 'border-blue-300 bg-blue-50'
        }`}>
          <div className="flex items-center space-x-2">
            {databaseStatus.isFailoverMode ? (
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            ) : databaseStatus.currentConnection === 'primary' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Database className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <AlertDescription className="ml-2">
            <div className="font-semibold">
              Currently using: <span className="uppercase">{databaseStatus.currentConnection}</span> database
            </div>
            <div className="text-sm mt-1">
              {databaseStatus.isFailoverMode && (
                <span className="text-orange-700">⚠️ System in failover mode - primary database unavailable</span>
              )}
              {databaseStatus.manualOverride && (
                <span className="text-blue-700">🔧 Manual override active - auto-failover disabled</span>
              )}
              {!databaseStatus.isFailoverMode && !databaseStatus.manualOverride && (
                <span className="text-green-700">✅ Normal operation - auto-failover enabled</span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Database Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Database */}
        <Card className={`border-2 ${
          healthStatus?.primary.available ? 'border-green-200' : 'border-red-200'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Database</CardTitle>
            <div className="flex items-center space-x-2">
              {databaseStatus?.currentConnection === 'primary' && (
                <Badge variant="default" className="bg-green-600">Active</Badge>
              )}
              {databaseStatus?.primaryStatus && (
                <div className={`flex items-center space-x-1 ${
                  getConnectionStateColor(databaseStatus.primaryStatus.readyState)
                }`}>
                  {getConnectionStateIcon(databaseStatus.primaryStatus.readyState)}
                  <span className="text-xs">
                    {databaseStatus.connectionStates[databaseStatus.primaryStatus.readyState]}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`flex items-center space-x-1 ${
                  healthStatus?.primary.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {healthStatus?.primary.available ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
              </div>
              
              {healthStatus?.primary.ping && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Ping:</span>
                  <span className="text-sm font-medium">{healthStatus.primary.ping}ms</span>
                </div>
              )}
              
              {databaseStatus?.primaryStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Database:</span>
                  <span className="text-sm font-medium">{databaseStatus.primaryStatus.name}</span>
                </div>
              )}
              
              {healthStatus?.primary.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Error: {healthStatus.primary.error}
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <Button
                onClick={() => switchDatabase('primary')}
                disabled={
                  switchLoading || 
                  databaseStatus?.currentConnection === 'primary' || 
                  !healthStatus?.primary.available
                }
                size="sm"
                className="w-full"
              >
                {switchLoading ? 'Switching...' : 'Switch to Primary'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mirror Database */}
        <Card className={`border-2 ${
          healthStatus?.mirror.available ? 'border-green-200' : 'border-red-200'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mirror Database</CardTitle>
            <div className="flex items-center space-x-2">
              {databaseStatus?.currentConnection === 'mirror' && (
                <Badge variant="secondary" className="bg-blue-600 text-white">Active</Badge>
              )}
              {databaseStatus?.mirrorStatus && (
                <div className={`flex items-center space-x-1 ${
                  getConnectionStateColor(databaseStatus.mirrorStatus.readyState)
                }`}>
                  {getConnectionStateIcon(databaseStatus.mirrorStatus.readyState)}
                  <span className="text-xs">
                    {databaseStatus.connectionStates[databaseStatus.mirrorStatus.readyState]}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`flex items-center space-x-1 ${
                  healthStatus?.mirror.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {healthStatus?.mirror.available ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
              </div>
              
              {healthStatus?.mirror.ping && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Ping:</span>
                  <span className="text-sm font-medium">{healthStatus.mirror.ping}ms</span>
                </div>
              )}
              
              {databaseStatus?.mirrorStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Database:</span>
                  <span className="text-sm font-medium">{databaseStatus.mirrorStatus.name}</span>
                </div>
              )}
              
              {healthStatus?.mirror.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Error: {healthStatus.mirror.error}
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <Button
                onClick={() => switchDatabase('mirror')}
                disabled={
                  switchLoading || 
                  databaseStatus?.currentConnection === 'mirror' || 
                  !healthStatus?.mirror.available
                }
                size="sm"
                variant="outline"
                className="w-full"
              >
                {switchLoading ? 'Switching...' : 'Switch to Mirror'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            <span>Emergency Controls</span>
          </CardTitle>
          <CardDescription>
            Manual database switching and failover management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={enableAutoFailover}
              disabled={loading || !databaseStatus?.manualOverride}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Enabling...' : 'Enable Auto-Failover'}
            </Button>
            <Button 
              onClick={performHealthCheck}
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Checking...' : 'Health Check'}
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p><strong className="text-blue-800">💡 How it works:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-700">
                <li>System automatically monitors both databases every 30 seconds</li>
                <li>If primary database fails, automatically switches to mirror</li>
                <li>When primary recovers, automatically switches back</li>
                <li>Manual override disables automatic switching</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-lg">
              <p><strong className="text-amber-800">⚠️ Emergency Scenarios:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-amber-700">
                <li><strong>Primary database down:</strong> System automatically uses mirror</li>
                <li><strong>Need manual control:</strong> Use the &quot;Switch&quot; buttons above</li>
                <li><strong>Both databases down:</strong> Check your MongoDB Atlas connection</li>
                <li><strong>Restore normal operation:</strong> Click &quot;Enable Auto-Failover&quot;</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Last health check: {new Date(healthStatus.timestamp).toLocaleString()}</p>
              <p>Auto-refresh: Every 15 seconds</p>
              <p>Health monitoring: Every 30 seconds</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
