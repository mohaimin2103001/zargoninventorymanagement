/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const API_BASE_URL = '/api'; // Use Next.js API routes as proxy

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log errors that are not handled by components (4xx/5xx server errors)
    const errorStatus = error.response?.status;
    
    // Don't log validation errors (400) or conflict errors (409) as they're handled by components
    if (errorStatus && errorStatus !== 400 && errorStatus !== 409) {
      const errorData = error.response?.data;
      const errorMessage = error.message;
      
      console.error('API Error Details:', {
        status: errorStatus,
        data: errorData,
        message: errorMessage,
        url: error.config?.url
      });
    }
    
    if (error.response?.status === 401) {
      // Clear expired token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Show user-friendly message
      alert('Your session has expired. Please log in again.');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role?: string) => 
    api.post('/auth/register', { name, email, password, role }),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params?: any) => api.get('/inventory', { params }),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.patch(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  uploadImages: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return api.post(`/inventory/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  removeImage: (id: string, imageUrl: string) => 
    api.delete(`/inventory/${id}/images`, { data: { imageUrl } }),
};

// Orders API
export const ordersAPI = {
  getAll: (params?: any) => api.get('/orders', { params }),
  create: (data: any) => api.post('/orders', data),
  update: (id: string, data: any) => api.patch(`/orders/${id}`, data),
  updateStatus: (id: string, data: any) => api.patch(`/orders/${id}/status`, data),
  delete: (id: string) => api.delete(`/orders/${id}`),
};

// Reports API
export const reportsAPI = {
  get: () => api.get('/reports'),
};

// Backup API
export const backupAPI = {
  getStatus: () => api.get('/backup/status'),
  getHealth: () => api.get('/backup/health'),
  create: (type: 'full' | 'incremental') => api.post('/backup/create', { type }),
  restore: (backupPath: string) => api.post('/backup/restore', { backupPath }),
};

// Delivery API
export const deliveryAPI = {
  toggleSelection: async (orderId: string, selected: boolean) => {
    console.log('deliveryAPI.toggleSelection called:', { orderId, selected });
    
    try {
      const response = await api.patch(`/delivery/${orderId}/toggle`, { selected });
      console.log('API call successful:', response.data);
      return response;
    } catch (error: any) {
      console.error('Delivery toggle API error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Your session has expired. Please refresh the page and log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('Order not found. Please refresh the page.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again in a moment.');
      } else if (!error.response) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      // Throw a more user-friendly error
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to update delivery selection. Please try again.';
      
      throw new Error(errorMessage);
    }
  },
  exportVoucher: (format: 'json' | 'excel' | 'csv' = 'json') => {
    if (format === 'excel' || format === 'csv') {
      // For file downloads, we need to use fetch directly to handle binary data
      return fetch(`/api/delivery/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
    }
    return api.get('/delivery/export');
  },
  clearSelections: () => api.post('/delivery/clear'),
};

// Courier API
export const courierAPI = {
  createOrder: async (orderId: string) => {
    try {
      const response = await api.post('/courier/create-order', { orderId });
      return response;
    } catch (error: any) {
      console.error('Courier API error:', error.response?.data || error.message);
      throw error;
    }
  },
  bulkCreateOrders: async (orderIds: string[]) => {
    try {
      const response = await api.post('/courier/bulk-order', { orderIds });
      return response;
    } catch (error: any) {
      console.error('Courier API error:', error.response?.data || error.message);
      throw error;
    }
  },
  getOrderStatusByConsignment: async (consignmentId: string) => {
    try {
      const response = await api.get(`/courier/status/consignment/${consignmentId}`);
      return response;
    } catch (error: any) {
      console.error('Courier status API error:', error.response?.data || error.message);
      throw error;
    }
  },
  getOrderStatusByInvoice: async (invoice: string) => {
    try {
      const response = await api.get(`/courier/status/invoice/${invoice}`);
      return response;
    } catch (error: any) {
      console.error('Courier status API error:', error.response?.data || error.message);
      throw error;
    }
  },
  getOrderStatusByTracking: async (trackingCode: string) => {
    try {
      const response = await api.get(`/courier/status/tracking/${trackingCode}`);
      return response;
    } catch (error: any) {
      console.error('Courier status API error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Helper function to get human-readable courier status
export const getCourierStatusDescription = (status: string): { label: string; color: string } => {
  const statusMap: Record<string, { label: string; color: string }> = {
    'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    'delivered_approval_pending': { label: 'Delivered (Approval Pending)', color: 'bg-blue-100 text-blue-800' },
    'partial_delivered_approval_pending': { label: 'Partial Delivered (Approval Pending)', color: 'bg-blue-100 text-blue-800' },
    'cancelled_approval_pending': { label: 'Cancelled (Approval Pending)', color: 'bg-orange-100 text-orange-800' },
    'unknown_approval_pending': { label: 'Unknown (Approval Pending)', color: 'bg-gray-100 text-gray-800' },
    'delivered': { label: 'Delivered', color: 'bg-green-100 text-green-800' },
    'partial_delivered': { label: 'Partially Delivered', color: 'bg-green-100 text-green-700' },
    'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    'hold': { label: 'On Hold', color: 'bg-orange-100 text-orange-800' },
    'in_review': { label: 'In Review', color: 'bg-blue-100 text-blue-800' },
    'unknown': { label: 'Unknown Status', color: 'bg-gray-100 text-gray-800' },
  };
  
  return statusMap[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
};

export default api;
