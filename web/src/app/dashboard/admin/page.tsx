/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileUpdateForm } from '@/components/ui/profile-update-form';
import { StaffManagement } from '@/components/ui/staff-management';
import { ActivityReport } from '@/components/ui/activity-report';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminPage() {
  const { updateUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'staff' | 'activity'>('profile');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to load user data');
        }

        if (data.user.role !== 'admin') {
          setError('You do not have admin privileges');
          return;
        }

        setCurrentUser(data.user);
      } catch (err: any) {
        setError(err.message);
        if (err.message.includes('token') || err.message.includes('auth')) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleProfileUpdate = (updatedProfile: any) => {
    const updatedUser = currentUser ? { ...currentUser, ...updatedProfile } : null;
    setCurrentUser(updatedUser);
    // Update the auth context so the header refreshes
    if (updatedUser) {
      updateUser(updatedUser as any);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md bg-red-50 border-red-200 text-red-800">
          <div className="text-center">
            <h3 className="font-medium mb-2">Error</h3>
            <p>{error}</p>
            {error.includes('admin privileges') && (
              <Button 
                className="mt-4"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600 mt-1">
                Manage your account, staff, and monitor system activity
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                Admin
              </Badge>
              <div className="text-right">
                <p className="font-medium">{currentUser.name}</p>
                <p className="text-sm text-gray-500">{currentUser.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Profile Settings
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'staff'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Staff Management
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'activity'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Activity Reports
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <ProfileUpdateForm 
              currentUser={currentUser}
              onProfileUpdate={handleProfileUpdate}
            />
          )}

          {activeTab === 'staff' && (
            <StaffManagement currentUser={currentUser} />
          )}

          {activeTab === 'activity' && (
            <ActivityReport currentUser={currentUser} />
          )}
        </div>

        {/* Back to Dashboard Link */}
        <div className="mt-8 text-center">
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
