'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Database, Shield, Clock, CheckCircle, AlertCircle, Server, HardDrive } from 'lucide-react';
import { api } from '@/lib/api';

interface BackupStatus {
  isInitialized: boolean;
  totalBackups: number;
  latestBackup?: {
    fileName: string;
    size: number;
    created: Date;
    type: string;
  };
  totalSize: number;
  backups: Array<{
    fileName: string;
    size: number;
    created: Date;
    type: string;
  }>;
  retentionDays: number;
  backupPath: string;
  error?: string;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database: {
    connected: boolean;
    collections: number;
    storageSize: string;
    dataSize: string;
  };
  backup: {
    initialized: boolean;
    path: string;
    mirrorEnabled: boolean;
  };
  error?: string;
}

export function BackupManager() {
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchBackupStatus();
    fetchHealthStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      fetchBackupStatus();
      fetchHealthStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchBackupStatus = async () => {
    try {
      const response = await api.get('/backup/status');
      setBackupStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch backup status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await api.get('/backup/health');
      setHealthStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  const createBackup = async (type: 'full' | 'incremental') => {
    setLoading(true);
    try {
      const response = await api.post('/backup/create', { type });
      
      if (response.status === 200) {
        alert(`✅ ${type} backup created successfully!\n\nLocation: ${response.data.backupPath}`);
        fetchBackupStatus();
      } else {
        alert(`❌ Backup creation failed: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      alert('❌ Backup creation failed: Network error');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than 1 hour ago';
    }
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Shield className="w-8 h-8 text-green-600" />
        <div>
          <h2 className="text-3xl font-bold text-gray-900">🛡️ Database Backup & Security</h2>
          <p className="text-gray-600">Comprehensive protection against data loss</p>
        </div>
      </div>

      {/* System Health Status */}
      {healthStatus && (
        <Card className={`border-2 ${healthStatus.status === 'healthy' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {healthStatus.status === 'healthy' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span>System Health Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Database</span>
                </h4>
                <div className="text-sm space-y-1">
                  <div>Status: <Badge className={healthStatus.database.connected ? 'bg-green-600' : 'bg-red-600'}>
                    {healthStatus.database.connected ? 'Connected' : 'Disconnected'}
                  </Badge></div>
                  <div>Collections: {healthStatus.database.collections}</div>
                  <div>Storage Size: {healthStatus.database.storageSize}</div>
                  <div>Data Size: {healthStatus.database.dataSize}</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center space-x-2">
                  <HardDrive className="w-4 h-4" />
                  <span>Backup System</span>
                </h4>
                <div className="text-sm space-y-1">
                  <div>Status: <Badge className={healthStatus.backup.initialized ? 'bg-green-600' : 'bg-orange-600'}>
                    {healthStatus.backup.initialized ? 'Initialized' : 'Not Initialized'}
                  </Badge></div>
                  <div>Mirror: <Badge className={healthStatus.backup.mirrorEnabled ? 'bg-green-600' : 'bg-gray-500'}>
                    {healthStatus.backup.mirrorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge></div>
                  <div>Path: {healthStatus.backup.path}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupStatus?.totalBackups || 0}</div>
            <p className="text-xs text-muted-foreground">
              Stored safely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {backupStatus?.latestBackup ? (
                <>
                  <div className="font-semibold">
                    {formatTimeAgo(backupStatus.latestBackup.created)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(backupStatus.latestBackup.size)}
                  </div>
                </>
              ) : (
                'No backups found'
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(backupStatus?.totalSize || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              All backups combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backupStatus?.retentionDays || 30}</div>
            <p className="text-xs text-muted-foreground">
              Days kept
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Protection Features */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Protection Features Active</CardTitle>
          <CardDescription>
            Multiple layers of protection keep your business data safe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">🌤️ Cloud Storage Ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">⏰ Automated Daily Backups (2:00 AM)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">🔄 Incremental Backups (Every 6 hours)</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">🗑️ Automatic Cleanup (30 days)</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">📁 Compressed Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">💾 Local & Mirror Protection</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Backup Controls</CardTitle>
          <CardDescription>
            Create on-demand backups for important operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={() => createBackup('full')}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {loading ? '⏳ Creating...' : '💾 Create Full Backup'}
            </Button>
            <Button 
              onClick={() => createBackup('incremental')}
              disabled={loading}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {loading ? '⏳ Creating...' : '📦 Create Incremental Backup'}
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
            <p><strong>💾 Full Backup:</strong> Complete database backup with all data (recommended before major updates)</p>
            <p><strong>📦 Incremental Backup:</strong> Only recent changes from last 6 hours (quick backup)</p>
            <p><strong>⚡ Pro Tip:</strong> Full backups are automatically created daily at 2:00 AM!</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Backup History</CardTitle>
          <CardDescription>
            View and manage your backup files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backupStatus?.backups && backupStatus.backups.length > 0 ? (
            <div className="space-y-2">
              {backupStatus.backups.map((backup, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Database className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium text-sm">{backup.fileName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(backup.created).toLocaleString()} • {formatTimeAgo(backup.created)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={backup.type === 'full' ? 'default' : 'secondary'} className={
                      backup.type === 'full' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                    }>
                      {backup.type === 'full' ? '💾 Full' : '📦 Incremental'}
                    </Badge>
                    <span className="text-xs text-gray-500 font-mono">
                      {formatFileSize(backup.size)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No backups found</p>
              <p className="text-sm">Create your first backup above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {backupStatus?.error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>Backup System Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{backupStatus.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
