/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import AboutDeveloper from '@/components/ui/about-developer';

interface Notice {
  _id: string;
  title: string;
  message: string; // Changed from content to message
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function NoticesPage() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    expiresAt: ''
  });

  useEffect(() => {
    if (!user) {
      window.location.href = '/dashboard';
      return;
    }
    fetchNotices();
  }, [user]);

  const fetchNotices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notices', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        // Backend returns { success: true, data: notices[], pagination: {...} }
        const data = result.data || result;
        setNotices(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch notices:', response.status);
        setNotices([]);
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      setNotices([]); // Ensure notices is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingNotice ? `/api/notices/${editingNotice._id}` : '/api/notices';
      const method = editingNotice ? 'PUT' : 'POST';

      const body = {
        title: formData.title,
        message: formData.content, // Map content to message for backend
        priority: formData.priority,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined
      };

      console.log('Submitting notice:', { url, method, body });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const responseData = await response.json();
      console.log('Response:', response.status, responseData);

      if (response.ok) {
        await fetchNotices();
        setShowForm(false);
        setEditingNotice(null);
        setFormData({ title: '', content: '', priority: 'medium', expiresAt: '' });
        alert('Notice saved successfully!');
      } else {
        alert(`Failed to save notice: ${responseData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save notice:', error);
      alert(`Error: ${error}`);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.message, // Map message to content for form
      priority: notice.priority,
      expiresAt: notice.expiresAt ? new Date(notice.expiresAt).toISOString().split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchNotices();
      }
    } catch (error) {
      console.error('Failed to delete notice:', error);
    }
  };

  const toggleActiveStatus = async (notice: Notice) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notices/${notice._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: notice.title,
          message: notice.message,
          priority: notice.priority,
          isActive: !notice.isActive,
          expiresAt: notice.expiresAt
        })
      });

      if (response.ok) {
        await fetchNotices();
      }
    } catch (error) {
      console.error('Failed to update notice status:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12" suppressHydrationWarning>
        <div className="text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 ecommerce-header">
            {isAdmin ? 'Notice Management' : 'Company Notices'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin ? 'Create and manage company notices' : 'View important company announcements'}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingNotice(null);
              setFormData({ title: '', content: '', priority: 'medium', expiresAt: '' });
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Notice
          </Button>
        )}
      </div>

      {/* Notice Form */}
      {showForm && isAdmin && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 ecommerce-header">
            {editingNotice ? 'Edit Notice' : 'Create New Notice'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (optional)
              </label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="flex space-x-3">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingNotice ? 'Update Notice' : 'Create Notice'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingNotice(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Notices List */}
      <div className="space-y-4">
        {loading ? (
          <div>Loading notices...</div>
        ) : !notices || notices.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-500">No notices found. Create your first notice!</p>
          </Card>
        ) : (
          (Array.isArray(notices) ? notices : []).map((notice) => (
            <Card key={notice._id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold">{notice.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(notice.priority)}`}
                    >
                      {notice.priority.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        notice.isActive
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}
                    >
                      {notice.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{notice.message}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Created: {new Date(notice.createdAt).toLocaleDateString()}</p>
                    <p>By: {notice.createdBy?.name || 'Unknown'} ({notice.createdBy?.email || 'N/A'})</p>
                    {notice.expiresAt && (
                      <p>Expires: {new Date(notice.expiresAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActiveStatus(notice)}
                      className="flex items-center"
                    >
                      {notice.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(notice)}
                      className="flex items-center"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(notice._id)}
                      className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* About Developer Section */}
      <AboutDeveloper />
    </div>
  );
}
