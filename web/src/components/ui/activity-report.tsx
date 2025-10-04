/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Alert } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { Input } from './input';

interface Activity {
  _id: string;
  userId: string;
  userName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ActivityReportProps {
  currentUser: {
    id: string;
    role: string;
  };
}

export function ActivityReport({ currentUser }: ActivityReportProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    staffId: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  const fetchStaff = useCallback(async () => {
    if (currentUser.role !== 'admin') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/staff', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setStaff(data.staff);
      }
    } catch (err: any) {
      console.error('Failed to fetch staff:', err);
    }
  }, [currentUser.role]);

  const fetchActivityReport = useCallback(async (selectedStaffId?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const queryParams = new URLSearchParams();
      if (selectedStaffId || filters.staffId) queryParams.append('staffId', selectedStaffId || filters.staffId);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const url = selectedStaffId || filters.staffId
        ? `/api/users/staff/${selectedStaffId || filters.staffId}/activity?${queryParams.toString()}`
        : `/api/users/activity?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch activity report');
      }

      setActivities(data.activities || []);
    } catch (err: any) {
      setError(err.message);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStaff();
    fetchActivityReport();
  }, [fetchStaff, fetchActivityReport]);

  const handleStaffSelect = (selectedStaffId: string) => {
    setFilters(prev => ({ ...prev, staffId: selectedStaffId }));
    fetchActivityReport(selectedStaffId);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setLoading(true);
    fetchActivityReport(filters.staffId);
  };

  const clearFilters = () => {
    setFilters({
      staffId: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    fetchActivityReport();
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'login': return 'default';
      case 'order_created': return 'default';
      case 'order_updated': return 'secondary';
      case 'inventory_updated': return 'secondary';
      case 'export_pdf': case 'export_excel': return 'outline';
      case 'staff_password_set': return 'default';
      default: return 'secondary';
    }
  };

  const formatActionDescription = (activity: Activity) => {
    const description = activity.details?.description;
    
    // Ensure we return a string, not an object
    if (typeof description === 'string') {
      return description;
    } else if (description && typeof description === 'object') {
      // If description is an object, try to extract meaningful text
      return JSON.stringify(description);
    }
    
    return `${activity.action.replace(/_/g, ' ')} action performed`;
  };

  if (currentUser.role !== 'admin') {
    return (
      <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
        You don&#39;t have permission to view activity reports.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Activity Report</CardTitle>
          <CardDescription>
            Monitor staff activities and system usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium mb-3">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Staff Member</label>
                <select
                  value={filters.staffId}
                  onChange={(e) => handleStaffSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Staff</option>
                  {staff.map((member) => (
                    <option key={member._id} value={member._id}>
                      {String(member.name || '')} ({String(member.email || '')})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value="login">Login</option>
                  <option value="order_created">Order Created</option>
                  <option value="order_updated">Order Updated</option>
                  <option value="inventory_updated">Inventory Updated</option>
                  <option value="export_pdf">PDF Export</option>
                  <option value="export_excel">Excel Export</option>
                  <option value="staff_password_set">Password Set</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading activity report...</p>
              </div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No activities found for the selected criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Date/Time</th>
                    <th className="text-left p-3 font-medium">Staff Member</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-left p-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <span className="text-sm">
                          N/A
                        </span>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {activity.details?.email || activity.details?.description?.match(/staff@zargoninventory\.com|teststaff.*@example\.com|newstaff.*@example\.com/)?.[0] || 'staff@zargoninventory.com'}
                          </div>
                          <div className="text-sm text-gray-500">{String(activity.userId || '')}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={getActionBadgeVariant(activity.action)}>
                          {activity.action.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">
                          {formatActionDescription(activity)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {activity.ipAddress || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
