'use client';

import { useAuth } from '@/contexts/AuthContext';
import { BackupManager } from '@/components/ui/backup-manager';
import { DatabaseManager } from '@/components/ui/database-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BackupPage() {
  const { user } = useAuth();

  // Only allow admin users to access backup management
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can access backup management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Enterprise Backup & Failover</h1>
        <p className="text-gray-600">Comprehensive data protection with automatic database failover</p>
      </div>

      <Tabs defaultValue="failover" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="failover">Database Failover</TabsTrigger>
          <TabsTrigger value="backups">File Backups</TabsTrigger>
        </TabsList>

        <TabsContent value="failover" className="space-y-6">
          <DatabaseManager />
        </TabsContent>

        <TabsContent value="backups" className="space-y-6">
          <BackupManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
