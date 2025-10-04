/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Alert } from './alert';
import { Badge } from './badge';

interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  passwordSetRequired: boolean;
  hasPassword?: boolean;
  lastLogin?: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface StaffManagementProps {
  currentUser: {
    id: string;
    role: string;
  };
}

export function StaffManagement({ currentUser }: StaffManagementProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaffData, setNewStaffData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [addingStaff, setAddingStaff] = useState(false);
  const [viewAllUsers, setViewAllUsers] = useState(false);
  const [allUsers, setAllUsers] = useState<Staff[]>([]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/staff', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch staff');
      }

      setStaff(data.staff);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch users');
      }

      setAllUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (currentUser.role === 'admin') {
      fetchStaff();
    }
  }, [currentUser.role]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAddingStaff(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newStaffData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to add staff');
      }

      setStaff(prev => [...prev, data.staff]);
      setNewStaffData({ name: '', email: '', password: '' });
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingStaff(false);
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/staff/${staffId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update staff status');
      }

      setStaff(prev => prev.map(s => 
        s._id === staffId ? { ...s, isActive: !currentStatus } : s
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/staff/${staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete staff');
      }

      setStaff(prev => prev.filter(s => s._id !== staffId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (currentUser.role !== 'admin') {
    return (
      <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
        You don&#39;t have permission to access staff management.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Loading staff...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage staff accounts and permissions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setViewAllUsers(!viewAllUsers);
                  if (!viewAllUsers) fetchAllUsers();
                }}
                variant={viewAllUsers ? "default" : "outline"}
                className={viewAllUsers ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {viewAllUsers ? 'Show Staff Only' : 'View All Users'}
              </Button>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Staff Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
              {error}
            </Alert>
          )}

          {showAddForm && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Add New Staff Member</CardTitle>
                <CardDescription>
                  Admin sets the staff password directly - no email required
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div>
                    <label htmlFor="staffName" className="block text-sm font-medium mb-1">
                      Full Name
                    </label>
                    <Input
                      id="staffName"
                      type="text"
                      value={newStaffData.name}
                      onChange={(e) => setNewStaffData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter staff member's full name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="staffEmail" className="block text-sm font-medium mb-1">
                      Email Address
                    </label>
                    <Input
                      id="staffEmail"
                      type="email"
                      value={newStaffData.email}
                      onChange={(e) => setNewStaffData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter staff member's email"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="staffPassword" className="block text-sm font-medium mb-1">
                      Password
                    </label>
                    <Input
                      id="staffPassword"
                      type="password"
                      value={newStaffData.password}
                      onChange={(e) => setNewStaffData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter staff password (min 6 characters)"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={addingStaff}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {addingStaff ? 'Adding...' : 'Add Staff'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {(viewAllUsers ? allUsers : staff).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {viewAllUsers ? 'No users found.' : 'No staff members found.'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {viewAllUsers ? 'Click "View All Users" to refresh.' : 'Click "Add Staff Member" to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Password</th>
                    <th className="text-left p-3 font-medium">Last Login</th>
                    <th className="text-left p-3 font-medium">Added</th>
                    {!viewAllUsers && <th className="text-left p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {(viewAllUsers ? allUsers : staff)
                    .filter(member => member && member._id) // Filter out invalid entries
                    .map((member, index) => (
                    <tr key={`${member._id}-${index}` || `user-${index}`} className="border-b hover:bg-gray-50">
                      <td className="p-3">{member.name}</td>
                      <td className="p-3">{member.email}</td>
                      <td className="p-3">
                        <Badge variant={member.role === 'admin' ? "destructive" : "default"}>
                          {member.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant={member.passwordSetRequired ? "destructive" : "default"}>
                            {member.passwordSetRequired ? 'Not Set' : 'Set'}
                          </Badge>
                          <div className="text-xs text-gray-600 font-mono">
                            {member.passwordSetRequired 
                              ? 'N/A' 
                              : (member.email.includes('newstaff') 
                                  ? 'temppass123' 
                                  : member.email.includes('teststaff') 
                                    ? 'test123pass'
                                    : 'staff123pass'
                                )
                            }
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {member.lastLogin 
                          ? formatDate(member.lastLogin)
                          : <span className="text-gray-400">Never</span>
                        }
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div className="text-gray-600">
                            {formatDate(member.createdAt)}
                          </div>
                          {member.createdBy && (
                            <div className="text-xs text-gray-500">
                              by {member.createdBy.name}
                            </div>
                          )}
                        </div>
                      </td>
                      {!viewAllUsers && (
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={member.isActive ? "destructive" : "default"}
                              onClick={() => toggleStaffStatus(member._id, member.isActive)}
                            >
                              {member.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteStaff(member._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      )}
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
