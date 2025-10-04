/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { inventoryAPI } from '@/lib/api';
import { InventoryItem, PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import ExportControls from '@/components/ui/export-controls';
import { Plus, Download } from 'lucide-react';

export default function StockPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<PaginatedResponse<InventoryItem>>({
    data: [],
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filters, setFilters] = useState({
    finalCode: '',
    color: '',
    description: '',
    inStockOnly: false,
    sizeFilter: '', // New filter for specific size availability
    zeroStockSizes: [] as string[],
    lowStockSizes: [] as string[],
    page: 1,
    pageSize: 20,
  });

  const [newItem, setNewItem] = useState({
    pid: '',
    color: '',
    finalCode: '',
    sizes: {
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0
    },
    buyPrice: 0,
    description: '',
    images: [] as string[],
    dateAdded: ''
  });

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll(filters);
      setInventory(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset to page 1 when any filter other than page/pageSize changes
      ...(key !== 'page' && key !== 'pageSize' ? { page: 1 } : {})
    }));
  };

  const handleAddItem = async () => {
    try {
      console.log('=== FRONTEND CREATE INVENTORY ITEM ===');
      console.log('New item data:', JSON.stringify(newItem, null, 2));
      
      // Validate required fields
      if (!newItem.pid || !newItem.color || !newItem.finalCode) {
        alert('Please fill all required fields');
        return;
      }
      
      // Convert string inputs to numbers
      const itemData = {
        ...newItem,
        pid: parseInt(newItem.pid as string) || 0,
        buyPrice: parseFloat(newItem.buyPrice as any) || 0,
        sizes: {
          M: parseInt(newItem.sizes.M as any) || 0,
          L: parseInt(newItem.sizes.L as any) || 0,
          XL: parseInt(newItem.sizes.XL as any) || 0,
          XXL: parseInt(newItem.sizes.XXL as any) || 0
        },
        images: newItem.images, // Use the already uploaded images
        ...(newItem.dateAdded && newItem.dateAdded.trim() && { dateAdded: newItem.dateAdded })
      };
      
      console.log('Processed item data:', JSON.stringify(itemData, null, 2));
      
      // Create the item first without images
      const itemDataWithoutImages = {
        ...itemData,
        images: [] // Create item without images first
      };
      
      const response = await inventoryAPI.create(itemDataWithoutImages);
      
      // If there are pending files, upload them now
      const pendingFiles = (window as any).pendingFiles;
      if (pendingFiles && pendingFiles.length > 0 && response.data._id) {
        try {
          console.log('Uploading images to created item...');
          await inventoryAPI.uploadImages(response.data._id, pendingFiles);
          console.log('Images uploaded successfully');
          
          // Clean up pending files
          delete (window as any).pendingFiles;
          
          // Revoke blob URLs to free memory
          newItem.images.forEach(url => {
            if (url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
        } catch (imageError: any) {
          console.error('Failed to upload images:', imageError);
          
          // Handle specific image upload errors
          if (imageError.response?.status === 413) {
            const errorCode = imageError.response?.data?.error?.code;
            if (errorCode === 'FILE_TOO_LARGE') {
              alert('Item created successfully, but image upload failed: File size too large (max 10MB per file). You can add images later by editing the item.');
            } else if (errorCode === 'TOO_MANY_FILES') {
              alert('Item created successfully, but image upload failed: Too many files (max 5 files). You can add images later by editing the item.');
            } else {
              alert('Item created successfully, but image upload failed: File too large or too many files. You can add images later by editing the item.');
            }
          } else {
            alert('Item created successfully, but image upload failed. You can add images later by editing the item.');
          }
        }
      }
      
      setShowAddForm(false);
      setNewItem({
        pid: '',
        color: '',
        finalCode: '',
        sizes: { M: 0, L: 0, XL: 0, XXL: 0 },
        buyPrice: 0,
        description: '',
        images: [],
        dateAdded: ''
      });
      fetchInventory();
      alert('Item added successfully!');
    } catch (error: any) {
      console.log('Add item error:', error.response?.status, error.response?.data?.message);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.message || `Final Code "${newItem.finalCode}" already exists.`;
        alert(`Cannot add item: ${errorMessage}`);
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid item data provided.';
        alert(`Validation error: ${errorMessage}`);
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to add item';
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowEditForm(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    
    try {
      console.log('=== FRONTEND UPDATE INVENTORY ITEM ===');
      console.log('Updated item data:', JSON.stringify(editingItem, null, 2));
      
      // Validate required fields
      if (!editingItem.pid || !editingItem.color || !editingItem.finalCode) {
        alert('Please fill all required fields');
        return;
      }

      // Convert string inputs to numbers if needed
      const itemData = {
        ...editingItem,
        pid: typeof editingItem.pid === 'string' ? parseInt(editingItem.pid) : editingItem.pid,
        buyPrice: typeof editingItem.buyPrice === 'string' ? parseFloat(editingItem.buyPrice) : editingItem.buyPrice,
        sizes: {
          M: typeof editingItem.sizes.M === 'string' ? parseInt(editingItem.sizes.M) : editingItem.sizes.M,
          L: typeof editingItem.sizes.L === 'string' ? parseInt(editingItem.sizes.L) : editingItem.sizes.L,
          XL: typeof editingItem.sizes.XL === 'string' ? parseInt(editingItem.sizes.XL) : editingItem.sizes.XL,
          XXL: typeof editingItem.sizes.XXL === 'string' ? parseInt(editingItem.sizes.XXL) : editingItem.sizes.XXL
        }
      };
      
      await inventoryAPI.update(editingItem._id, itemData);
      setShowEditForm(false);
      setEditingItem(null);
      fetchInventory();
      alert('Item updated successfully!');
    } catch (error: any) {
      console.error('Failed to update item:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to update item';
      alert(errorMessage);
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete item "${item.finalCode}"?`)) {
      return;
    }
    
    try {
      await inventoryAPI.delete(item._id);
      fetchInventory();
      alert('Item deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete item';
      alert(errorMessage);
    }
  };

  // Image upload handlers for new items
  const handleNewItemImageUpload = async (files: File[]): Promise<string[]> => {
    try {
      console.log('Starting image upload for new item...');
      
      // Validate file sizes (10MB limit per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = files.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        throw new Error(`File(s) too large: ${fileNames}. Maximum size is 10MB per file.`);
      }
      
      // Validate file count (5 files max)
      if (files.length > 5) {
        throw new Error('Too many files. Maximum 5 files allowed.');
      }
      
      // Validate file types
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const invalidFiles = files.filter(file => !validTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(f => f.name).join(', ');
        throw new Error(`Invalid file type(s): ${fileNames}. Only JPEG, PNG, and WebP images are allowed.`);
      }
      
      // Instead of creating a temporary item, just store files locally first
      // We'll upload them when the actual item is created
      const fileUrls = files.map(file => URL.createObjectURL(file));
      
      // Store the actual files for later upload
      (window as any).pendingFiles = files;
      
      return fileUrls;
    } catch (error) {
      console.error('Failed to prepare images:', error);
      throw error;
    }
  };

  const handleNewItemImageRemove = async (): Promise<void> => {
    // For new items, just remove from local state
    return Promise.resolve();
  };

  // Image upload handlers for existing items
  const handleExistingItemImageUpload = async (itemId: string, files: File[]): Promise<string[]> => {
    try {
      // Validate file sizes (10MB limit per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = files.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        throw new Error(`File(s) too large: ${fileNames}. Maximum size is 10MB per file.`);
      }
      
      // Validate file count (5 files max)
      if (files.length > 5) {
        throw new Error('Too many files. Maximum 5 files allowed.');
      }
      
      // Validate file types
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const invalidFiles = files.filter(file => !validTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(f => f.name).join(', ');
        throw new Error(`Invalid file type(s): ${fileNames}. Only JPEG, PNG, and WebP images are allowed.`);
      }
      
      const response = await inventoryAPI.uploadImages(itemId, files);
      return response.data.images;
    } catch (error) {
      console.error('Failed to upload images:', error);
      throw error;
    }
  };

  const handleExistingItemImageRemove = async (itemId: string, imageUrl: string): Promise<void> => {
    try {
      await inventoryAPI.removeImage(itemId, imageUrl);
    } catch (error) {
      console.error('Failed to remove image:', error);
      throw new Error('Failed to remove image');
    }
  };

  const exportToCSV = () => {
    const headers = ['PID', 'Color', 'Final Code', 'M', 'L', 'XL', 'XXL', 'Total Qty', 'Buy Price', 'Description'];
    const csvData = inventory.data.map(item => [
      item.pid,
      item.color,
      item.finalCode,
      item.sizes.M,
      item.sizes.L,
      item.sizes.XL,
      item.sizes.XXL,
      item.totalQty,
      item.buyPrice,
      item.description || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const headers = ['PID', 'Color', 'Final Code', 'Size M', 'Size L', 'Size XL', 'Size XXL', 'Total Qty', 'Buy Price (৳)', 'Description', 'Status', 'Date Added'];
    const excelData = inventory.data.map(item => [
      item.pid,
      item.color,
      item.finalCode,
      item.sizes.M,
      item.sizes.L,
      item.sizes.XL,
      item.sizes.XXL,
      item.totalQty,
      item.buyPrice,
      item.description || '',
      item.isActive ? 'Active' : 'Inactive',
      item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : ''
    ]);

    // Create Excel-compatible CSV with BOM for proper UTF-8 encoding
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers, ...excelData]
      .map(row => row.map(cell => {
        // Escape quotes and wrap in quotes if needed
        const cellStr = String(cell).replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-excel-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    try {
      // Dynamically import jsPDF
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Zargon Inventory Report', 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Total Items: ${inventory.total}`, 20, 40);
      
      // Table headers
      const headers = ['PID', 'Color', 'Code', 'Total Qty', 'Price'];
      let yPosition = 60;
      
      // Header row
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      headers.forEach((header, index) => {
        doc.text(header, 20 + (index * 35), yPosition);
      });
      
      yPosition += 10;
      doc.setFont('helvetica', 'normal');
      
      // Data rows
      inventory.data.forEach((item) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        
        const row = [
          String(item.pid),
          item.color.substring(0, 8),
          item.finalCode.substring(0, 10),
          String(item.totalQty),
          `৳${item.buyPrice}`
        ];
        
        row.forEach((cell, cellIndex) => {
          doc.text(cell, 20 + (cellIndex * 35), yPosition);
        });
        
        yPosition += 8;
      });
      
      doc.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF export failed. Please try again.');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 ecommerce-header">Stock Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your inventory items, sizes, and pricing.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="inline-flex items-center ecommerce-button"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="inline-flex items-center ecommerce-button bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportToPDF}
            className="inline-flex items-center ecommerce-button bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold ecommerce-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Final Code
            </label>
            <Input
              placeholder="Search by code..."
              value={filters.finalCode}
              onChange={(e) => handleFilterChange('finalCode', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <Input
              placeholder="Search by color..."
              value={filters.color}
              onChange={(e) => handleFilterChange('color', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              placeholder="Search by description..."
              value={filters.description}
              onChange={(e) => handleFilterChange('description', e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Size Available
            </label>
            <select
              value={filters.sizeFilter}
              onChange={(e) => handleFilterChange('sizeFilter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-10 bg-white"
            >
              <option value="">All Sizes</option>
              <option value="M">Has M Available</option>
              <option value="L">Has L Available</option>
              <option value="XL">Has XL Available</option>
              <option value="XXL">Has XXL Available</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zero Stock Sizes
            </label>
            <div className="flex flex-wrap gap-2">
              {['M', 'L', 'XL', 'XXL'].map((size) => (
                <label key={size} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.zeroStockSizes.includes(size)}
                    onChange={(e) => {
                      const newSizes = e.target.checked
                        ? [...filters.zeroStockSizes, size]
                        : filters.zeroStockSizes.filter(s => s !== size);
                      handleFilterChange('zeroStockSizes', newSizes);
                    }}
                    className="mr-1"
                  />
                  <span className="text-xs">{size}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Low Stock Sizes (≤5)
            </label>
            <div className="flex flex-wrap gap-2">
              {['M', 'L', 'XL', 'XXL'].map((size) => (
                <label key={size} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.lowStockSizes.includes(size)}
                    onChange={(e) => {
                      const newSizes = e.target.checked
                        ? [...filters.lowStockSizes, size]
                        : filters.lowStockSizes.filter(s => s !== size);
                      handleFilterChange('lowStockSizes', newSizes);
                    }}
                    className="mr-1"
                  />
                  <span className="text-xs">{size}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => handleFilterChange('inStockOnly', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">In stock only</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items per page
            </label>
            <select
              value={filters.pageSize}
              onChange={(e) => {
                handleFilterChange('pageSize', parseInt(e.target.value));
                handleFilterChange('page', 1); // Reset to first page when changing page size
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ 
                finalCode: '', 
                color: '', 
                description: '',
                inStockOnly: false,
                sizeFilter: '',
                zeroStockSizes: [],
                lowStockSizes: [],
                page: 1,
                pageSize: 20
              })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Export Controls */}
      <div className="mt-6">
        <ExportControls 
          type="inventory" 
          currentFilters={{
            finalCode: filters.finalCode,
            color: filters.color,
            inStockOnly: filters.inStockOnly,
            sizeFilter: filters.sizeFilter
          }}
        />
      </div>

      {/* Inventory Table */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64" suppressHydrationWarning>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" suppressHydrationWarning></div>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[1400px]">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] px-2">PID</TableHead>
                    <TableHead className="w-[120px] px-2">Color</TableHead>
                    <TableHead className="w-[100px] px-2">Image</TableHead>
                    <TableHead className="w-[220px] px-2">Sizes (M/L/XL/XXL)</TableHead>
                    <TableHead className="w-[100px] px-2">Total Qty</TableHead>
                    <TableHead className="w-[120px] px-2">Final Code</TableHead>
                    <TableHead className="w-[100px] px-2">Buy Price</TableHead>
                    <TableHead className="w-[200px] px-2">Description</TableHead>
                    <TableHead className="w-[120px] px-2">Date Added</TableHead>
                    <TableHead className="w-[100px] px-2">Status</TableHead>
                    {user?.role === 'admin' && <TableHead className="w-[180px] px-2">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
              <TableBody>
                {inventory.data.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="bg-blue-100 text-blue-900 font-bold text-lg px-2 w-[80px]">{item.pid}</TableCell>
                    <TableCell className="bg-violet-100 text-violet-900 font-bold text-lg px-2 w-[120px]">{item.color}</TableCell>
                    <TableCell className="px-2 w-[100px]">
                      {item.images.length > 0 ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-green-400">
                          <Image
                            src={item.images[0]}
                            alt={`${item.finalCode} product`}
                            fill
                            className="object-cover"
                            sizes="64px"
                            onError={(e) => {
                              console.log('Image failed to load:', item.images[0]);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-600 border-2 border-gray-400">No IMG</div>';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-600 border-2 border-gray-400">
                          No IMG
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 w-[220px]">
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <span className="bg-red-500 text-white px-1 py-1 rounded text-center font-bold">
                          M: {item.sizes.M}
                        </span>
                        <span className="bg-orange-500 text-white px-1 py-1 rounded text-center font-bold">
                          L: {item.sizes.L}
                        </span>
                        <span className="bg-amber-500 text-white px-1 py-1 rounded text-center font-bold">
                          XL: {item.sizes.XL}
                        </span>
                        <span className="bg-yellow-600 text-white px-1 py-1 rounded text-center font-bold">
                          XXL: {item.sizes.XXL}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 w-[100px]">
                      <Badge className={`font-bold text-sm px-2 py-1 ${
                        item.totalQty === 0 ? 'bg-red-600 text-white' : 
                        item.totalQty <= 5 ? 'bg-orange-600 text-white' : 
                        'bg-green-600 text-white'
                      }`}>
                        {item.totalQty}
                      </Badge>
                    </TableCell>
                    <TableCell className="product-code text-sm px-2 w-[120px] truncate">{item.finalCode}</TableCell>
                    <TableCell className="bg-green-100 text-green-900 font-bold text-sm px-2 w-[100px]">৳{item.buyPrice}</TableCell>
                    <TableCell className="bg-cyan-100 text-cyan-900 text-sm px-2 w-[200px] truncate font-medium">
                      {item.description || '-'}
                    </TableCell>
                    <TableCell className="bg-purple-100 text-purple-900 font-medium text-sm px-2 w-[120px]">
                      {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="px-2 w-[100px]">
                      <Badge className={`font-bold text-xs px-2 py-1 ${
                        item.isActive ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {user?.role === 'admin' && (
                      <TableCell className="px-2 w-[180px]">
                        <div className="flex space-x-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditItem(item)}
                            className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs px-2 py-1"
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                            className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 text-xs px-2 py-1"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {inventory.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((inventory.page - 1) * inventory.pageSize) + 1} to{' '}
            {Math.min(inventory.page * inventory.pageSize, inventory.total)} of{' '}
            {inventory.total} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              disabled={inventory.page === 1}
              onClick={() => handleFilterChange('page', 1)}
            >
              First
            </Button>
            <Button
              variant="outline"
              disabled={inventory.page === 1}
              onClick={() => handleFilterChange('page', inventory.page - 1)}
            >
              Previous
            </Button>
            
            {/* Page Numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, inventory.totalPages) }, (_, i) => {
                let pageNum;
                const totalPages = inventory.totalPages;
                
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else {
                  const current = inventory.page;
                  const start = Math.max(1, current - 2);
                  const end = Math.min(totalPages, start + 4);
                  const adjustedStart = Math.max(1, end - 4);
                  pageNum = adjustedStart + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={inventory.page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('page', pageNum)}
                    className="w-10 h-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              disabled={inventory.page === inventory.totalPages}
              onClick={() => handleFilterChange('page', inventory.page + 1)}
            >
              Next
            </Button>
            <Button
              variant="outline"
              disabled={inventory.page === inventory.totalPages}
              onClick={() => handleFilterChange('page', inventory.totalPages)}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 ecommerce-header">Add New Item</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">PID *</label>
                <Input
                  type="number"
                  value={newItem.pid}
                  onChange={(e) => setNewItem({...newItem, pid: e.target.value})}
                  className="border-2 border-blue-300 focus:border-blue-500"
                  placeholder="Product ID (numbers only)"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Color *</label>
                <Input
                  value={newItem.color}
                  onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                  className="border-2 border-green-300 focus:border-green-500"
                  placeholder="Product Color"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Final Code *</label>
                <Input
                  value={newItem.finalCode}
                  onChange={(e) => setNewItem({...newItem, finalCode: e.target.value})}
                  className="border-2 border-purple-300 focus:border-purple-500"
                  placeholder="Final Product Code"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Sizes</label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-red-600 mb-1">M</label>
                    <Input
                      type="number"
                      value={newItem.sizes.M}
                      onChange={(e) => setNewItem({...newItem, sizes: {...newItem.sizes, M: parseInt(e.target.value) || 0}})}
                      className="border-2 border-red-300 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-orange-600 mb-1">L</label>
                    <Input
                      type="number"
                      value={newItem.sizes.L}
                      onChange={(e) => setNewItem({...newItem, sizes: {...newItem.sizes, L: parseInt(e.target.value) || 0}})}
                      className="border-2 border-orange-300 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-600 mb-1">XL</label>
                    <Input
                      type="number"
                      value={newItem.sizes.XL}
                      onChange={(e) => setNewItem({...newItem, sizes: {...newItem.sizes, XL: parseInt(e.target.value) || 0}})}
                      className="border-2 border-amber-300 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-yellow-600 mb-1">XXL</label>
                    <Input
                      type="number"
                      value={newItem.sizes.XXL}
                      onChange={(e) => setNewItem({...newItem, sizes: {...newItem.sizes, XXL: parseInt(e.target.value) || 0}})}
                      className="border-2 border-yellow-300 focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Buy Price (৳) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.buyPrice}
                  onChange={(e) => setNewItem({...newItem, buyPrice: parseFloat(e.target.value) || 0})}
                  className="border-2 border-emerald-300 focus:border-emerald-500"
                  placeholder="Price in Taka"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  className="border-2 border-cyan-300 focus:border-cyan-500"
                  placeholder="Product Description (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <ImageUpload
                  images={newItem.images}
                  onImagesChange={(images) => setNewItem({...newItem, images})}
                  onUpload={handleNewItemImageUpload}
                  onRemove={handleNewItemImageRemove}
                  maxImages={5}
                  componentId="new-item-images"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Date Added</label>
                <Input
                  type="date"
                  value={newItem.dateAdded}
                  onChange={(e) => setNewItem({...newItem, dateAdded: e.target.value})}
                  className="border-2 border-indigo-300 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="border-2 border-gray-400 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
              >
                Add Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditForm && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 ecommerce-header">Edit Item</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">PID *</label>
                <Input
                  type="number"
                  value={editingItem.pid}
                  onChange={(e) => setEditingItem({...editingItem, pid: parseInt(e.target.value) || 0})}
                  className="border-2 border-blue-300 focus:border-blue-500"
                  placeholder="Product ID (numbers only)"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Color *</label>
                <Input
                  value={editingItem.color}
                  onChange={(e) => setEditingItem({...editingItem, color: e.target.value})}
                  className="border-2 border-green-300 focus:border-green-500"
                  placeholder="Product Color"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Final Code *</label>
                <Input
                  value={editingItem.finalCode}
                  onChange={(e) => setEditingItem({...editingItem, finalCode: e.target.value})}
                  className="border-2 border-purple-300 focus:border-purple-500"
                  placeholder="Final Product Code"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Sizes</label>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-red-600 mb-1">M</label>
                    <Input
                      type="number"
                      value={editingItem.sizes.M}
                      onChange={(e) => setEditingItem({...editingItem, sizes: {...editingItem.sizes, M: parseInt(e.target.value) || 0}})}
                      className="border-2 border-red-300 focus:border-red-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-orange-600 mb-1">L</label>
                    <Input
                      type="number"
                      value={editingItem.sizes.L}
                      onChange={(e) => setEditingItem({...editingItem, sizes: {...editingItem.sizes, L: parseInt(e.target.value) || 0}})}
                      className="border-2 border-orange-300 focus:border-orange-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-600 mb-1">XL</label>
                    <Input
                      type="number"
                      value={editingItem.sizes.XL}
                      onChange={(e) => setEditingItem({...editingItem, sizes: {...editingItem.sizes, XL: parseInt(e.target.value) || 0}})}
                      className="border-2 border-amber-300 focus:border-amber-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-yellow-600 mb-1">XXL</label>
                    <Input
                      type="number"
                      value={editingItem.sizes.XXL}
                      onChange={(e) => setEditingItem({...editingItem, sizes: {...editingItem.sizes, XXL: parseInt(e.target.value) || 0}})}
                      className="border-2 border-yellow-300 focus:border-yellow-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Buy Price (৳) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingItem.buyPrice}
                  onChange={(e) => setEditingItem({...editingItem, buyPrice: parseFloat(e.target.value) || 0})}
                  className="border-2 border-emerald-300 focus:border-emerald-500"
                  placeholder="Price in Taka"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Status</label>
                <select
                  value={editingItem.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditingItem({...editingItem, isActive: e.target.value === 'active'})}
                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-md focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                <Input
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  className="border-2 border-cyan-300 focus:border-cyan-500"
                  placeholder="Product Description (optional)"
                />
              </div>

              <div className="md:col-span-2">
                <ImageUpload
                  images={editingItem.images}
                  onImagesChange={(images) => setEditingItem({...editingItem, images})}
                  onUpload={(files) => handleExistingItemImageUpload(editingItem._id, files)}
                  onRemove={(imageUrl) => handleExistingItemImageRemove(editingItem._id, imageUrl)}
                  maxImages={5}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Date Added</label>
                <Input
                  type="date"
                  value={editingItem.dateAdded ? editingItem.dateAdded.split('T')[0] : ''}
                  onChange={(e) => setEditingItem({...editingItem, dateAdded: e.target.value})}
                  className="border-2 border-indigo-300 focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-8">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingItem(null);
                }}
                className="border-2 border-gray-400 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateItem}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
              >
                Update Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
