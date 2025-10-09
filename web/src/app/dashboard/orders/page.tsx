/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { ordersAPI, inventoryAPI, deliveryAPI, courierAPI, getCourierStatusDescription } from '@/lib/api';
import { Order, InventoryItem, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductSelector } from '@/components/ui/product-selector';
import { HydrationSafe } from '@/components/ui/hydration-safe';
import ExportControls from '@/components/ui/export-controls';
import { Plus, Search, Download, Filter, Edit, Trash2, X, Copy, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  productCode: string;
  finalCode: string;
  size: 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  profit: number;
  unitBuyingPrice: number;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<{
    orders: Order[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>({
    orders: [],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [selectedForDelivery, setSelectedForDelivery] = useState<Set<string>>(new Set());
  const [bulkSelectionInProgress, setBulkSelectionInProgress] = useState(false);
  const [processingDeliverySelection, setProcessingDeliverySelection] = useState<Set<string>>(new Set());
  const [selectedForCourier, setSelectedForCourier] = useState<Set<string>>(new Set());
  const [courierOrderInProgress, setCourierOrderInProgress] = useState(false);
  const [apiStatuses, setApiStatuses] = useState<Map<string, { status: string; loading: boolean }>>(new Map());
  const [editingConsignmentId, setEditingConsignmentId] = useState<string | null>(null);
  const [tempConsignmentId, setTempConsignmentId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Load manual status changes from database
  const loadManualStatusChanges = async (): Promise<Set<string>> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return new Set<string>();

      const response = await fetch('/api/orders/manual-overrides', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const overrides = await response.json();
        return new Set(Object.keys(overrides));
      }
    } catch {
      console.warn('Failed to load manual status changes from database');
    }
    return new Set<string>();
  };

  const [manualStatusChanges, setManualStatusChanges] = useState<Set<string>>(new Set());

  // Load manual status changes when component mounts
  useEffect(() => {
    loadManualStatusChanges().then(overrides => {
      setManualStatusChanges(overrides);
    });
  }, []);

  // Clear manual status override for specific order
  const clearManualStatusOverride = async (orderId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/orders/${orderId}/manual-override`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        const newSet = new Set(manualStatusChanges);
        newSet.delete(orderId);
        setManualStatusChanges(newSet);
      }
    } catch (error) {
      console.warn('Failed to clear manual status override:', error);
    }
  };

  const [filters, setFilters] = useState({
    qName: '',
    qAddress: '',
    phone: '',
    code: '',
    status: '',
    reason: '',
    dateFrom: '',
    dateTo: '',
    page: '1',
    pageSize: '20',
  });

  const [newOrder, setNewOrder] = useState({
    name: '',
    address: '',
    phone: '',
    deliveryCharge: 60,
    status: 'PENDING' as OrderStatus,
    reasonNote: '',
    pickupDate: '',
    items: [
      {
        productCode: '',
        finalCode: '',
        size: 'M' as 'M' | 'L' | 'XL' | 'XXL',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        profit: 0,
        unitBuyingPrice: 0
      }
    ] as OrderItem[]
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Define functions before useEffect hooks
  const clearExistingSelections = useCallback(async () => {
    // Only clear if user is authenticated
    if (!user) {
      console.log('User not authenticated, skipping clear selections');
      return;
    }

    try {
      console.log('Attempting to clear delivery selections...');
      const response = await deliveryAPI.clearSelections();
      console.log('Existing delivery selections cleared successfully:', response?.data);
    } catch (error: any) {
      console.warn('Error clearing delivery selections - Full error object:', error);
      console.warn('Error clearing delivery selections - Details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      // Don't throw the error since this is a cleanup operation
    }
  }, [user]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getAll(filters);
      setOrders(response.data);
      
      // Always start with empty selections on page load/refresh
      setSelectedForDelivery(new Set<string>());
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
    fetchInventoryItems();
  }, [fetchOrders]);

  // Clear existing selections when user is ready
  useEffect(() => {
    if (user) {
      clearExistingSelections();
    }
  }, [user, clearExistingSelections]);

  // Check token validity on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      return;
    }
    
    // Basic token expiration check (tokens are JWTs)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        console.warn('Token has expired');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
      }
    } catch {
      console.warn('Invalid token format');
    }
  }, []);

  // Helper function to get total count of phone number in entire list
  const getTotalPhoneCount = (phoneNumber: string) => {
    const ordersList = orders.orders || [];
    return ordersList.filter(order => order && order.phone === phoneNumber).length;
  };

  // Helper function to get the occurrence number for this specific order
  const getPhoneOccurrenceNumber = (phoneNumber: string, currentOrderIndex: number) => {
    const ordersList = orders.orders || [];
    let count = 0;
    for (let i = 0; i <= currentOrderIndex; i++) {
      if (ordersList[i] && ordersList[i].phone === phoneNumber) {
        count++;
      }
    }
    return count;
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage.toString() }));
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setFilters(prev => ({ ...prev, page: '1', pageSize: newPageSize.toString() }));
  };

  // Consignment ID handlers
  const handleEditConsignmentId = (orderId: string, currentId?: string | number) => {
    setEditingConsignmentId(orderId);
    setTempConsignmentId(currentId?.toString() || '');
  };

  const handleSaveConsignmentId = async (orderId: string) => {
    try {
      const consignmentId = tempConsignmentId.trim();
      if (!consignmentId) {
        alert('Please enter a valid consignment ID');
        return;
      }

      // Update the order with the consignment ID and mark as sent
      await ordersAPI.update(orderId, {
        courierConsignmentId: consignmentId,
        courierStatus: 'sent',
        courierSentAt: new Date().toISOString()
      });

      // Reset editing state
      setEditingConsignmentId(null);
      setTempConsignmentId('');
      
      // Refresh orders to show updated data
      await fetchOrders();
      
      alert('Consignment ID updated successfully! The order is now marked as sent.');
    } catch (error) {
      console.error('Failed to update consignment ID:', error);
      alert('Failed to update consignment ID. Please try again.');
    }
  };

  const handleCancelConsignmentEdit = () => {
    setEditingConsignmentId(null);
    setTempConsignmentId('');
  };

  const copyTrackingCode = async (trackingCode: string) => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      alert('Tracking code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy tracking code:', error);
      alert('Failed to copy tracking code. Please try again.');
    }
  };

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [defaultItems, setDefaultItems] = useState<InventoryItem[]>([]);

  const fetchInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getAll({ 
        inStockOnly: true,
        pageSize: 200, // Load more default items for better initial selection
        page: 1,
        sort: '-createdAt'
      });
      setDefaultItems(response.data.data);
      setInventoryItems(response.data.data);
      console.log('=== INVENTORY ITEMS LOADED ===');
      console.log('Total items:', response.data.data.length);
      console.log('Sample items:', response.data.data.slice(0, 3).map((item: any) => ({
        finalCode: item.finalCode,
        color: item.color,
        buyPrice: item.buyPrice,
        description: item.description
      })));
      console.log('Available product codes:', response.data.data.map((item: any) => item.finalCode).slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  // Server-side search function for large inventories
  const searchAllInventory = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      // Reset to default items when search is cleared
      setInventoryItems(defaultItems);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      console.log('=== SEARCHING ALL INVENTORY ===');
      console.log('Search term:', searchTerm);
      
      // Search by finalCode first (most common)
      const codeResponse = await inventoryAPI.getAll({ 
        inStockOnly: true,
        finalCode: searchTerm,
        pageSize: 100,
        page: 1,
        sort: '-createdAt'
      });
      
      let allResults = [...codeResponse.data.data];
      
      // Search by color if no results or few results from finalCode
      if (allResults.length < 10) {
        const colorResponse = await inventoryAPI.getAll({ 
          inStockOnly: true,
          color: searchTerm,
          pageSize: 100,
          page: 1,
          sort: '-createdAt'
        });
        
        // Merge results, avoiding duplicates
        const newResults = colorResponse.data.data.filter(
          (item: InventoryItem) => !allResults.some(existing => existing.finalCode === item.finalCode)
        );
        allResults = [...allResults, ...newResults];
      }
      
      // Search by description if still few results
      if (allResults.length < 10) {
        const descResponse = await inventoryAPI.getAll({ 
          inStockOnly: true,
          description: searchTerm,
          pageSize: 100,
          page: 1,
          sort: '-createdAt'
        });
        
        // Merge results, avoiding duplicates
        const newResults = descResponse.data.data.filter(
          (item: InventoryItem) => !allResults.some(existing => existing.finalCode === item.finalCode)
        );
        allResults = [...allResults, ...newResults];
      }
      
      setSearchResults(allResults);
      setInventoryItems(allResults);
      console.log('=== SEARCH COMPLETED ===');
      console.log('Search term:', searchTerm);
      console.log('Results found:', allResults.length);
    } catch (error) {
      console.error('Failed to search inventory:', error);
    } finally {
      setIsSearching(false);
    }
  }, [defaultItems]);



  // Multi-item order helpers
  const addNewItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productCode: '',
          finalCode: '',
          size: 'M' as 'M' | 'L' | 'XL' | 'XXL',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          profit: 0,
          unitBuyingPrice: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (newOrder.items.length > 1) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    // If updating size or quantity, check stock availability
    if (field === 'size' || field === 'quantity') {
      const currentItem = newOrder.items[index];
      const productCode = currentItem.productCode;
      const selectedProduct = inventoryItems.find(item => item.finalCode === productCode);
      
      if (selectedProduct) {
        const targetSize = field === 'size' ? value : currentItem.size;
        const targetQuantity = field === 'quantity' ? value : currentItem.quantity;
        
        // Check if the selected size has enough stock
        const availableStock = selectedProduct.sizes[targetSize as keyof typeof selectedProduct.sizes] || 0;
        
        if (targetQuantity > availableStock) {
          alert(`Not enough stock for size ${targetSize}. Available: ${availableStock}, Requested: ${targetQuantity}`);
          return; // Don't update if insufficient stock
        }
        
        if (availableStock === 0) {
          alert(`Size ${targetSize} is out of stock for this product. Please select a different size.`);
          return; // Don't update if no stock
        }
      }
    }
    
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { ...item, [field]: value }
          : item
      )
    }));
  };

  const updateItemWithProductInfo = (index: number, productCode: string) => {
    console.log('=== updateItemWithProductInfo called ===');
    console.log('Index:', index, 'ProductCode:', productCode);
    console.log('Available inventory items:', inventoryItems.length);
    console.log('First 5 product codes:', inventoryItems.slice(0, 5).map(item => item.finalCode));
    
    const selectedItem = inventoryItems.find(item => item.finalCode === productCode);
    console.log('Selected item:', selectedItem);
    console.log('Buy price:', selectedItem?.buyPrice);
    
    if (selectedItem) {
      updateItem(index, 'productCode', productCode);
      updateItem(index, 'finalCode', productCode);
      
      // Ensure unitBuyingPrice is never undefined or NaN
      const buyPrice = selectedItem.buyPrice || 0;
      updateItem(index, 'unitBuyingPrice', buyPrice);
      
      // Set default selling price as buy price + 30% margin (minimum $10)
      const suggestedPrice = Math.max(10, Math.round(buyPrice * 1.3));
      updateItem(index, 'unitPrice', suggestedPrice);
      
      // Calculate initial totals
      const quantity = newOrder.items[index]?.quantity || 1;
      const totalPrice = quantity * suggestedPrice;
      const profit = (suggestedPrice - buyPrice) * quantity;
      
      updateItem(index, 'totalPrice', totalPrice);
      updateItem(index, 'profit', profit);
      
      console.log('Updated item with:', {
        buyPrice,
        suggestedPrice,
        quantity,
        totalPrice,
        profit
      });
    } else {
      console.log('❌ ERROR: Product not found for productCode:', productCode);
      console.log('❌ Available product codes:', inventoryItems.map(item => item.finalCode).slice(0, 10));
      alert(`Product "${productCode}" not found in inventory. Please select a valid product.`);
      
      // Reset the item if product not found
      updateItem(index, 'productCode', '');
      updateItem(index, 'finalCode', '');
      updateItem(index, 'unitBuyingPrice', 0);
      updateItem(index, 'unitPrice', 0);
      updateItem(index, 'profit', 0);
      updateItem(index, 'totalPrice', 0);
    }
  };

  const calculateOrderTotal = () => {
    const itemsTotal = newOrder.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    return itemsTotal; // Exclude delivery charge from total
  };

  const calculateOrderProfit = () => {
    const totalProfit = newOrder.items.reduce((sum, item) => {
      const itemProfit = (item.quantity * item.unitPrice) - (item.quantity * item.unitBuyingPrice);
      return sum + itemProfit;
    }, 0);
    return totalProfit; // Pure selling price - buying price profit
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== CREATING ORDER(S) ===');
    console.log('Customer:', { name: newOrder.name, address: newOrder.address, phone: newOrder.phone });
    console.log('Items to create orders for:', newOrder.items);

    // Auto-fill missing customer fields with "demo"
    const customerName = newOrder.name.trim() || 'demo';
    const customerAddress = newOrder.address.trim() || 'demo';
    
    // Validate required fields (phone is still required)
    if (!newOrder.phone) {
      alert('Please enter a phone number');
      return;
    }

    // Validate items
    if (newOrder.items.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    try {
      // Validate all items first and auto-fill missing prices
      for (let i = 0; i < newOrder.items.length; i++) {
        const item = newOrder.items[i];
        console.log(`Validating item ${i + 1}:`, item);
        
        if (!item.productCode) {
          alert(`Please select a product for item ${i + 1}`);
          return;
        }
        
        // Auto-fill selling price with buying price if not provided
        if (!item.unitPrice || item.unitPrice <= 0) {
          if (item.unitBuyingPrice > 0) {
            newOrder.items[i].unitPrice = item.unitBuyingPrice;
            console.log(`Auto-filled selling price for item ${i + 1} with buying price: ${item.unitBuyingPrice}`);
          } else {
            alert(`Please enter a valid price for item ${i + 1} or ensure the product has a valid buying price`);
            return;
          }
        }
        
        if (!item.quantity || item.quantity <= 0) {
          alert(`Please enter a valid quantity for item ${i + 1}`);
          return;
        }
        if (item.unitBuyingPrice === undefined || item.unitBuyingPrice === null) {
          alert(`Missing buying price for item ${i + 1}. Please select a valid product from inventory.`);
          return;
        }
      }

      // Create a single order with multiple items
      const totalAmount = newOrder.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalProfit = newOrder.items.reduce((sum, item) => sum + ((item.unitPrice - (item.unitBuyingPrice || 0)) * item.quantity), 0);
      
      const orderData = {
        name: customerName,
        address: customerAddress,
        phone: newOrder.phone,
        deliveryCharge: newOrder.deliveryCharge || 0,
        status: newOrder.status,
        reasonNote: newOrder.reasonNote,
        pickupDate: newOrder.pickupDate || null,
        totalAmount,
        totalProfit,
        items: newOrder.items.map(item => ({
          productCode: item.productCode,
          size: item.size,
          quantity: item.quantity,
          unitSellingPrice: item.unitPrice,
          unitBuyingPrice: item.unitBuyingPrice || 0,
          totalPrice: item.quantity * item.unitPrice,
          profit: (item.unitPrice - (item.unitBuyingPrice || 0)) * item.quantity
        }))
      };

      console.log('Creating single order with multiple items:', JSON.stringify(orderData, null, 2));
      console.log('Order validation:', {
        hasName: !!orderData.name,
        hasAddress: !!orderData.address,
        hasPhone: !!orderData.phone,
        itemCount: orderData.items.length,
        items: orderData.items
      });

      const response = await ordersAPI.create(orderData);
      console.log('Order creation response:', response);
      console.log('Created order data:', response.data);
      
      alert(`Successfully created order for ${customerName} with ${newOrder.items.length} item(s)!\nOrder ID: ${response.data._id || response.data.id}`);
      
      console.log('Refreshing orders list...');
      // Reset form
      setNewOrder({
        name: '',
        address: '',
        phone: '',
        deliveryCharge: 60,
        status: 'PENDING' as OrderStatus,
        reasonNote: '',
        pickupDate: '',
        items: [
          {
            productCode: '',
            finalCode: '',
            size: 'M' as 'M' | 'L' | 'XL' | 'XXL',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            profit: 0,
            unitBuyingPrice: 0
          }
        ]
      });
      
      setShowCreateForm(false);
      fetchOrders();
    } catch (error: any) {
      console.error('=== ORDER CREATION ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      console.error('Error response status:', error?.response?.status);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to create order. Please try again.';
      
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = `Error: ${data}`;
        } else if (data.error) {
          errorMessage = `Error: ${data.error}`;
        } else if (data.message) {
          errorMessage = `Error: ${data.message}`;
        } else if (data.details) {
          const details = Object.keys(data.details).map(key => `${key}: ${data.details[key].message || data.details[key]}`);
          errorMessage = `Validation failed:\n${details.join('\n')}`;
        }
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      // Validate that order has at least one item
      if (!editingOrder.items || editingOrder.items.length === 0) {
        alert('Order must have at least one item.');
        return;
      }

      // Validate each item
      for (const item of editingOrder.items) {
        if (!item.productCode || item.productCode.trim() === '') {
          alert('All items must have a valid product code.');
          return;
        }
        if (!item.quantity || item.quantity <= 0) {
          alert('All items must have a valid quantity (greater than 0).');
          return;
        }
        if (!item.unitSellingPrice || item.unitSellingPrice <= 0) {
          alert('All items must have a valid selling price (greater than 0).');
          return;
        }
      }

      // Prepare update data
      const updateData = {
        name: editingOrder.name,
        address: editingOrder.address,
        phone: editingOrder.phone,
        deliveryCharge: editingOrder.deliveryCharge,
        status: editingOrder.status,
        reasonNote: editingOrder.reasonNote,
        pickupDate: editingOrder.pickupDate || null,
        items: editingOrder.items.map(item => ({
          productCode: item.productCode.trim(),
          size: item.size,
          quantity: Number(item.quantity),
          unitSellingPrice: Number(item.unitSellingPrice)
        }))
      };

      await ordersAPI.update(editingOrder._id, updateData);
      
      alert('Order updated successfully!');
      setShowEditForm(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error('Failed to update order:', error);
      
      // Extract more specific error message
      let errorMessage = 'Failed to update order. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details.map((d: any) => d.message).join(', ');
      }
      
      alert(errorMessage);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;

    try {
      await ordersAPI.delete(deletingOrder._id);
      alert('Order deleted successfully!');
      setShowDeleteConfirm(false);
      setDeletingOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  // Delivery selection functions
  const handleDeliverySelection = async (orderId: string, selected: boolean) => {
    // Check if user is authenticated
    if (!user) {
      alert('Please log in to select orders for delivery.');
      return;
    }

    // Prevent multiple requests for the same order
    if (processingDeliverySelection.has(orderId)) {
      console.log('Selection already in progress for order:', orderId);
      return;
    }

    try {
      // Mark this order as being processed
      setProcessingDeliverySelection(prev => new Set(prev).add(orderId));
      
      console.log('Making delivery selection API call:', { orderId, selected, user: user.email });
      
      // Optimistically update UI first for better user experience
      setSelectedForDelivery(prev => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(orderId);
        } else {
          newSet.delete(orderId);
        }
        return newSet;
      });
      
      const response = await deliveryAPI.toggleSelection(orderId, selected);
      console.log('Delivery selection API response:', response.data);
      console.log('Delivery selection updated successfully');
      
      // Show success feedback (optional - you can remove this if it's too much)
      // console.log(`✅ ${selected ? 'Selected' : 'Deselected'} order for delivery`);
    } catch (error: any) {
      console.error('Failed to update delivery selection:', error);
      
      // Revert the optimistic update on error
      setSelectedForDelivery(prev => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.delete(orderId); // Remove if we were trying to add
        } else {
          newSet.add(orderId); // Add back if we were trying to remove
        }
        return newSet;
      });
      
      // Show user-friendly error message based on error type
      let errorMessage = 'Failed to update delivery selection. Please try again.';
      
      if (error.message.includes('Network error')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication expired. Please refresh the page and log in again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Order not found. Please refresh the page and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      // Remove from processing set
      setProcessingDeliverySelection(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  // Handle bulk selection with rate limiting
  const handleBulkDeliverySelection = async (selected: boolean) => {
    if (bulkSelectionInProgress) return; // Prevent multiple bulk operations
    
    setBulkSelectionInProgress(true);
    const orderIds = orders.orders.map(order => order._id);
    
    try {
      // Process in batches of 5 with delay to prevent server overload
      const batchSize = 5;
      const delay = 200; // 200ms delay between batches
      
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        
        // Process batch concurrently but with controlled concurrency
        await Promise.all(
          batch.map(orderId => handleDeliverySelection(orderId, selected))
        );
        
        // Add delay between batches (except for the last batch)
        if (i + batchSize < orderIds.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error('Failed to update bulk selection:', error);
      alert('Failed to update all selections. Some orders may not be selected.');
    } finally {
      setBulkSelectionInProgress(false);
    }
  };

  const handleExportDeliveryVoucher = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      if (format === 'excel') {
        // Handle Excel export using fetch for file download
        const response = await deliveryAPI.exportVoucher('excel') as Response;
        
        if (!response.ok) {
          throw new Error('Failed to export Excel file');
        }

        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Get filename from response header or use default
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] || 
                        `delivery-voucher-${new Date().toISOString().split('T')[0]}.xlsx`;
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Get summary data for confirmation
        const summaryResponse = await deliveryAPI.exportVoucher('json') as any;
        const summaryData = summaryResponse.data;
        
        alert(`Excel delivery voucher exported successfully! ${summaryData.totalCustomers} customers, ${summaryData.totalOrders} orders.`);
        
        // Clear selections after export
        await deliveryAPI.clearSelections();
        setSelectedForDelivery(new Set());
        
      } else {
        // Handle CSV export (existing functionality)
        const response = await deliveryAPI.exportVoucher() as any;
        const deliveryData = response.data.deliveryVoucher;
        
        if (deliveryData.length === 0) {
          alert('No orders selected for delivery');
          return;
        }

        // Create Excel-like CSV format
        const headers = ['Invoice', 'Name', 'Address', 'Phone', 'Amount', 'Note'];
        const csvContent = [
          headers.join(','),
          ...deliveryData.map((row: any) => [
            row.Invoice,
            `"${row.Name}"`,
            `"${row.Address}"`,
            row.Phone,
            row.Amount,
            `"${row.Note}"`
          ].join(','))
        ].join('\n');

        // Download as CSV file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `delivery-voucher-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`Delivery voucher exported successfully! ${deliveryData.length} customers, ${response.data.totalOrders} orders.`);
        
        // Clear selections after export
        await deliveryAPI.clearSelections();
        setSelectedForDelivery(new Set());
      }
      
    } catch (error) {
      console.error('Failed to export delivery voucher:', error);
      alert('Failed to export delivery voucher. Please try again.');
    }
  };

  const openEditForm = (order: Order) => {
    setEditingOrder({ ...order });
    setShowEditForm(true);
  };

  const openDeleteConfirm = (order: Order) => {
    setDeletingOrder(order);
    setShowDeleteConfirm(true);
  };

  const duplicateOrder = (order: Order) => {
    // Create a copy of the order for duplication
    const duplicatedOrder = {
      name: order.name,
      address: order.address,
      phone: order.phone,
      deliveryCharge: order.deliveryCharge || 60,
      status: 'PENDING' as OrderStatus,
      reasonNote: '',
      pickupDate: '',
      items: order.items && order.items.length > 0 
        ? order.items.map(item => ({
            productCode: (item as any).productCode,
            finalCode: (item as any).finalCode || (item as any).productCode,
            size: (item as any).size,
            quantity: (item as any).quantity,
            unitPrice: (item as any).unitPrice || (item as any).unitSellingPrice || 0,
            totalPrice: ((item as any).quantity || 1) * ((item as any).unitPrice || (item as any).unitSellingPrice || 0),
            profit: (((item as any).unitPrice || (item as any).unitSellingPrice || 0) - ((item as any).unitBuyingPrice || 0)) * ((item as any).quantity || 1),
            unitBuyingPrice: (item as any).unitBuyingPrice || 0
          }))
        : [{
            productCode: (order as any).code || '',
            finalCode: (order as any).code || '',
            size: ((order as any).size || 'M') as 'M' | 'L' | 'XL' | 'XXL',
            quantity: (order as any).qty || 1,
            unitPrice: (order as any).price || 0,
            totalPrice: ((order as any).qty || 1) * ((order as any).price || 0),
            profit: ((order as any).price || 0) * ((order as any).qty || 1),
            unitBuyingPrice: 0
          }]
    };
    
    setNewOrder(duplicatedOrder);
    setShowCreateForm(true);
  };

  // Courier selection functions
  const handleCourierSelection = (orderId: string, selected: boolean) => {
    setSelectedForCourier(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleBulkCourierSelection = (selected: boolean) => {
    // Only include orders that haven't been sent to courier yet
    const availableOrderIds = orders.orders
      .filter(order => order.courierStatus !== 'sent')
      .map(order => order._id);
    setSelectedForCourier(selected ? new Set(availableOrderIds) : new Set());
  };

  const handleSendToCourier = async () => {
    if (selectedForCourier.size === 0) {
      alert('Please select at least one order to send to courier.');
      return;
    }

    const confirmMessage = `Are you sure you want to send ${selectedForCourier.size} order(s) to the courier service?\n\nThis action will:\n- Create courier orders for selected items\n- Generate tracking codes\n- Update order status\n\nDo you want to continue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setCourierOrderInProgress(true);

    try {
      // Validate selected orders before processing
      for (const orderId of selectedForCourier) {
        const order = orders.orders.find(o => o._id === orderId);
        if (!order) {
          alert(`Order ${orderId} not found. Please refresh and try again.`);
          return;
        }
        
        // Check if already sent via courier
        if ((order as any).courierTrackingCode && (order as any).courierStatus === 'sent') {
          alert(`Order ${(order as any).orderNumber || orderId} has already been sent via courier. Tracking: ${(order as any).courierTrackingCode}`);
          return;
        }
        
        // Validate required fields for courier API
        if (!(order as any).phone) {
          alert(`Order ${(order as any).orderNumber || orderId} is missing customer phone number, which is required for courier service.`);
          return;
        }
        
        if (!(order as any).address) {
          alert(`Order ${(order as any).orderNumber || orderId} is missing customer address, which is required for courier service.`);
          return;
        }
        
        // Validate phone number format
        const phone = (order as any).phone.replace(/[^\d]/g, '');
        if (phone.length < 10) {
          alert(`Order ${(order as any).orderNumber || orderId} has invalid phone number format. Must be at least 10 digits.`);
          return;
        }
      }

      // Filter out orders that have already been sent to courier
      const validOrderIds = Array.from(selectedForCourier).filter(orderId => {
        const order = orders.orders.find(o => o._id === orderId);
        return order && order.courierStatus !== 'sent';
      });

      if (validOrderIds.length === 0) {
        alert('All selected orders have already been sent to courier service.');
        return;
      }

      if (validOrderIds.length < selectedForCourier.size) {
        const alreadySentCount = selectedForCourier.size - validOrderIds.length;
        if (!confirm(`${alreadySentCount} order(s) have already been sent to courier and will be skipped.\n\nContinue with ${validOrderIds.length} remaining order(s)?`)) {
          return;
        }
      }
      
      console.log('Sending orders to courier:', validOrderIds);
      
      // Call the courier API
      const response = await courierAPI.bulkCreateOrders(validOrderIds);
      
      if (response.data && response.data.success) {
        const { successfulOrders, failedOrders, results } = response.data;
        
        let message = '';
        if (successfulOrders > 0) {
          message += `✅ Successfully sent ${successfulOrders} order(s) to courier.\n`;
        }
        if (failedOrders > 0) {
          message += `❌ Failed to send ${failedOrders} order(s).\n`;
          message += 'Check console for details.';
        }
        
        console.log('Courier API results:', results);
        alert(message);
        
        // Clear selections and refresh orders
        setSelectedForCourier(new Set());
        await fetchOrders(); // Wait for orders to refresh
        
        // Refresh API statuses for the successfully sent orders
        if (results && Array.isArray(results)) {
          const successfulOrderIds = results
            .filter(result => result.success)
            .map(result => result.orderId);
          
          console.log('Refreshing API status for successful orders:', successfulOrderIds);
          
          // Small delay to ensure database updates are propagated
          setTimeout(() => {
            fetchAllApiStatuses();
          }, 1000);
        }
      } else {
        // Handle failed response
        const errorMessage = response.data.message || 'Failed to send orders to courier service.';
        const validationIssues = response.data.validationIssues || [];
        
        let fullMessage = errorMessage;
        if (validationIssues.length > 0) {
          fullMessage += '\n\nValidation Issues:\n' + validationIssues.join('\n');
        }
        
        console.error('Courier API error details:', response.data);
        alert(fullMessage);
      }
    } catch (error: any) {
      console.error('Failed to send orders to courier:', error);
      
      let errorMessage = 'Failed to send orders to courier service. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error.response?.data?.message) {
        errorMessage = `Error: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setCourierOrderInProgress(false);
    }
  };

  const checkCourierStatus = async (order: Order) => {
    if (!order.courierTrackingCode && !order.courierConsignmentId && !order.courierInvoice) {
      alert('This order has not been sent to courier service yet.');
      return;
    }

    try {
      let response;
      let statusMethod = '';

      // Try to get status using the best available identifier
      if (order.courierConsignmentId) {
        statusMethod = 'Consignment ID';
        response = await courierAPI.getOrderStatusByConsignment(order.courierConsignmentId.toString());
      } else if (order.courierTrackingCode) {
        statusMethod = 'Tracking Code';
        response = await courierAPI.getOrderStatusByTracking(order.courierTrackingCode);
      } else if (order.courierInvoice) {
        statusMethod = 'Invoice';
        response = await courierAPI.getOrderStatusByInvoice(order.courierInvoice);
      }

      if (response && response.data.success && response.data.data) {
        const statusData = response.data.data;
        const statusInfo = getCourierStatusDescription(statusData.delivery_status);
        
        const statusMessage = `Courier Status for ${order.name}:\n\n` +
          `Status: ${statusInfo.label}\n` +
          `Tracking Code: ${order.courierTrackingCode || 'N/A'}\n` +
          `Consignment ID: ${order.courierConsignmentId || 'N/A'}\n` +
          `Checked via: ${statusMethod}\n\n` +
          `Raw Status: ${statusData.delivery_status}`;
        
        alert(statusMessage);
      } else {
        throw new Error('Invalid response from courier service');
      }
    } catch (error: any) {
      console.error('Failed to check courier status:', error);
      
      let errorMessage = 'Failed to check courier status. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = `Error: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // API Status functions
  const fetchApiStatus = async (order: Order) => {
    if (!order.courierTrackingCode && !order.courierConsignmentId && !order.courierInvoice) {
      return null;
    }

    try {
      // Set loading state
      setApiStatuses(prev => new Map(prev.set(order._id, { status: 'loading', loading: true })));

      let response;
      // Try to get status using the best available identifier
      if (order.courierConsignmentId) {
        response = await courierAPI.getOrderStatusByConsignment(order.courierConsignmentId.toString());
      } else if (order.courierTrackingCode) {
        response = await courierAPI.getOrderStatusByTracking(order.courierTrackingCode);
      } else if (order.courierInvoice) {
        response = await courierAPI.getOrderStatusByInvoice(order.courierInvoice);
      }

      if (response && response.data.success && response.data.data) {
        const apiStatus = response.data.data.delivery_status;
        
        // Update API status
        setApiStatuses(prev => new Map(prev.set(order._id, { status: apiStatus, loading: false })));
        
        // Sync dropdown status based on API status
        await syncDropdownStatus(order._id, apiStatus);
        
        return apiStatus;
      } else {
        throw new Error('Invalid response from courier service');
      }
    } catch (error: any) {
      console.error(`Failed to fetch API status for order ${order._id}:`, error);
      setApiStatuses(prev => new Map(prev.set(order._id, { status: 'error', loading: false })));
      return null;
    }
  };

  const syncDropdownStatus = async (orderId: string, apiStatus: string) => {
    // Don't auto-sync if user has manually changed the status
    if (manualStatusChanges.has(orderId)) {
      console.log(`Skipping auto-sync for order ${orderId} - user has manually changed status`);
      return;
    }

    try {
      let newDropdownStatus: OrderStatus;

      // Map API status to dropdown status based on requirements
      switch (apiStatus?.toLowerCase()) {
        case 'delivered':
          newDropdownStatus = 'PAID';
          break;
        case 'pending':
          newDropdownStatus = 'PENDING';
          break;
        case 'cancelled':
        case 'canceled':
          newDropdownStatus = 'CAN';
          break;
        default:
          // For any other status, set to default (PENDING)
          newDropdownStatus = 'PENDING';
          break;
      }

      // Get current order to check for existing notes
      const currentOrder = orders.orders.find(o => o._id === orderId);
      const existingNote = (currentOrder as any)?.reasonNote;
      
      // Only add auto-sync note if there's no existing user note
      const reasonNote = existingNote && existingNote.trim() !== '' 
        ? existingNote // Preserve user's existing note
        : `Auto-synced from API status: ${apiStatus}`; // Add auto-sync note only if no existing note

      // Update the order status via API
      await ordersAPI.updateStatus(orderId, { 
        status: newDropdownStatus,
        reasonNote: reasonNote,
        isAutoSync: true // This is an auto-sync operation
      });

      // Refresh orders to show updated status
      await fetchOrders();
    } catch (error) {
      console.error('Failed to sync dropdown status:', error);
    }
  };

  const fetchAllApiStatuses = async () => {
    const promises = orders.orders.map(order => fetchApiStatus(order));
    await Promise.allSettled(promises);
  };

  // Remove automatic API status fetching on load - only run when explicitly requested

  return (
    <HydrationSafe className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Orders Management</h1>
        
        {/* Action Buttons - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2">
          <Button 
            onClick={() => handleExportDeliveryVoucher('csv')}
            disabled={selectedForDelivery.size === 0}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span> ({selectedForDelivery.size})
          </Button>
          <Button 
            onClick={() => handleExportDeliveryVoucher('excel')}
            disabled={selectedForDelivery.size === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span> ({selectedForDelivery.size})
          </Button>
          <Button 
            onClick={() => window.open('/api/export/orders/excel' + new URLSearchParams(filters).toString() ? '?' + new URLSearchParams(filters).toString() : '', '_blank')}
            variant="outline"
            className="flex items-center justify-center gap-2 text-xs sm:text-sm"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button 
            onClick={() => window.open('/api/export/orders/pdf' + new URLSearchParams(filters).toString() ? '?' + new URLSearchParams(filters).toString() : '', '_blank')}
            variant="outline"
            className="flex items-center justify-center gap-2 text-xs sm:text-sm"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm col-span-1 sm:col-span-2 lg:col-span-1"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Multi-Item Order</span>
            <span className="sm:hidden">Create Order</span>
          </Button>
          <Button 
            onClick={handleSendToCourier}
            disabled={selectedForCourier.size === 0 || courierOrderInProgress}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-xs sm:text-sm col-span-1 sm:col-span-2 lg:col-span-1"
            size="sm"
          >
            {courierOrderInProgress ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Download className="h-4 w-4" />
            )}
            {courierOrderInProgress ? (
              <span>Sending...</span>
            ) : (
              <>
                <span className="hidden sm:inline">Send to Courier</span>
                <span className="sm:hidden">Courier</span> ({selectedForCourier.size})
              </>
            )}
          </Button>
          <Button 
            onClick={fetchAllApiStatuses}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm"
            size="sm"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh API Status</span>
            <span className="sm:hidden">API Status</span>
          </Button>
        </div>
      </div>

      {/* Filter Toggle Button */}
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <HydrationSafe className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <Input
                placeholder="Customer name..."
                value={filters.qName}
                onChange={(e) => handleFilterChange('qName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Input
                placeholder="Address..."
                value={filters.qAddress}
                onChange={(e) => handleFilterChange('qAddress', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                placeholder="Phone..."
                value={filters.phone}
                onChange={(e) => handleFilterChange('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
              <Input
                placeholder="Product code..."
                value={filters.code}
                onChange={(e) => handleFilterChange('code', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason/Note</label>
              <Input
                placeholder="Reason/note..."
                value={filters.reason}
                onChange={(e) => handleFilterChange('reason', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                style={{ color: '#111827' }}
              >
                <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>All Status</option>
                <option value="PENDING" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Pending</option>
                <option value="Phone" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone</option>
                <option value="DITC" style={{ color: '#111827', backgroundColor: '#ffffff' }}>DITC</option>
                <option value="Phone Off" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone Off</option>
                <option value="PAID" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Paid</option>
                <option value="Partial Delivered" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Partial Delivered</option>
                <option value="CAN" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Cancelled</option>
                <option value="HOLD" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Hold</option>
                <option value="Exchange" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Exchange</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <Input
                type="date"
                placeholder="From date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <Input
                type="date"
                placeholder="To date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                handleFilterChange('qName', '');
                handleFilterChange('qAddress', '');
                handleFilterChange('phone', '');
                handleFilterChange('code', '');
                handleFilterChange('reason', '');
                handleFilterChange('status', '');
                handleFilterChange('dateFrom', '');
                handleFilterChange('dateTo', '');
              }}
            >
              Clear All Filters
            </Button>
          </div>
        </HydrationSafe>
      )}

      {/* Export Controls */}
      <div className="mb-6">
        <ExportControls 
          type="orders" 
          currentFilters={{
            qName: filters.qName,
            qAddress: filters.qAddress,
            phone: filters.phone,
            code: filters.code,
            status: filters.status,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo
          }}
        />
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border-2 border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="overflow-auto" style={{ scrollbarGutter: 'stable', maxHeight: orders.orders.length > 10 ? '90vh' : 'auto' }}>
          <div className="min-w-[2400px]">
            <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-16 text-center">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedForDelivery.size > 0 && selectedForDelivery.size === orders.orders.length}
                    disabled={bulkSelectionInProgress}
                    onChange={(e) => handleBulkDeliverySelection(e.target.checked)}
                  />
                  {bulkSelectionInProgress && (
                    <div className="text-xs text-blue-600 mt-1">Processing...</div>
                  )}
                  <div className="text-xs text-gray-600 mt-1">Delivery</div>
                </TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-16 text-center">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={(() => {
                      const availableOrders = orders.orders.filter(order => order.courierStatus !== 'sent');
                      return selectedForCourier.size > 0 && selectedForCourier.size === availableOrders.length;
                    })()}
                    onChange={(e) => handleBulkCourierSelection(e.target.checked)}
                  />
                  <div className="text-xs text-gray-600 mt-1">Courier</div>
                  {(() => {
                    const sentCount = orders.orders.filter(order => order.courierStatus === 'sent').length;
                    return sentCount > 0 ? (
                      <div className="text-xs text-green-600 mt-1">{sentCount} sent</div>
                    ) : null;
                  })()}
                </TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-20 text-center">Date</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-24 text-center">Order ID</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-32">Name</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-48">Address</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-28 text-center">Phone</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-48">Items</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-20 text-center">DC</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-24 text-center">Total</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-24 text-center">Profit</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-32 text-center">Status</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-32 text-center">API Status</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-20 text-center">P.Date</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-48">Reason</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-32 text-center">Consignment ID</TableHead>
                <TableHead className="text-gray-900 font-bold border-r border-gray-200 w-36 text-center">Tracking Code</TableHead>
                <TableHead className="text-gray-900 font-bold w-32 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={17} className="text-center py-8">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : orders.orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={17} className="text-center py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.orders.map((order, orderIndex) => {
                // Handle both multi-item orders and legacy single-item orders
                const items = order.items && order.items.length > 0 
                  ? order.items 
                  : [{
                      productCode: (order as any).code || 'N/A',
                      finalCode: (order as any).code || 'N/A',
                      size: (order as any).size || 'N/A',
                      quantity: (order as any).qty || 0,
                      unitPrice: (order as any).price || 0,
                      totalPrice: ((order as any).qty || 0) * ((order as any).price || 0),
                      profit: ((order as any).price || 0) * ((order as any).qty || 0),
                      unitBuyingPrice: 0,
                      productImage: (order as any).productImage
                    }];
                    
                return items.map((item, itemIndex) => (
                  <TableRow 
                    key={`${order._id}-${itemIndex}`} 
                    className={`hover:bg-blue-50 transition-colors duration-200 ${
                      orderIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } border-b border-gray-200 ${
                      // Add visual grouping for multi-item orders
                      items.length > 1 ? (
                        itemIndex === 0 ? 'border-l-4 border-l-blue-500' : 
                        itemIndex === items.length - 1 ? 'border-l-4 border-l-blue-300 border-b-2 border-b-blue-300' :
                        'border-l-4 border-l-blue-300'
                      ) : ''
                    }`}
                  >
                    {/* Delivery Selection - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-slate-200' 
                        : items.length > 1 
                          ? 'bg-blue-50 border-l-2 border-l-blue-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-center align-middle`}>
                      {itemIndex === 0 ? (
                        <input
                          type="checkbox"
                          className={`rounded ${processingDeliverySelection.has(order._id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          checked={selectedForDelivery.has(order._id)}
                          disabled={processingDeliverySelection.has(order._id)}
                          onChange={(e) => handleDeliverySelection(order._id, e.target.checked)}
                        />
                      ) : null}
                    </TableCell>
                    
                    {/* Courier Selection - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? order.courierStatus === 'sent' 
                          ? 'bg-green-200' 
                          : 'bg-purple-200'
                        : items.length > 1 
                          ? order.courierStatus === 'sent'
                            ? 'bg-green-50 border-l-2 border-l-green-200'
                            : 'bg-purple-50 border-l-2 border-l-purple-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-center align-middle`}>
                      {itemIndex === 0 ? (
                        order.courierStatus === 'sent' ? (
                          <div className="text-xs">
                            <div className="text-green-700 font-semibold">✓ SENT</div>
                            <div className="text-green-600 text-[10px]">
                              {order.courierSentAt ? format(new Date(order.courierSentAt), 'dd MMM') : ''}
                            </div>
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedForCourier.has(order._id)}
                            onChange={(e) => handleCourierSelection(order._id, e.target.checked)}
                          />
                        )
                      ) : null}
                    </TableCell>
                    {/* Date - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-slate-200 text-slate-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-blue-50 border-l-2 border-l-blue-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-sm text-center align-middle`}>
                      {itemIndex === 0 ? (
                        <div>
                          {format(new Date(order.orderDate), 'dd MMM yy')}
                          {items.length > 1 && (
                            <div className="text-xs text-blue-600 font-semibold mt-1">
                              ({items.length} items)
                            </div>
                          )}
                        </div>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-blue-500 italic">
                          ↳ Item {itemIndex + 1}
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Order ID - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-indigo-200 text-indigo-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-indigo-50 border-l-2 border-l-indigo-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-sm text-center align-middle`}>
                      {itemIndex === 0 ? (
                        <div className="font-mono text-xs">
                          #{order._id.slice(-6).toUpperCase()}
                        </div>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-indigo-500 italic">
                          ↳ Same order
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Name - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-green-200 text-green-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-green-50 border-l-2 border-l-green-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-sm align-middle`}>
                      {itemIndex === 0 ? order.name : items.length > 1 ? (
                        <div className="text-xs text-green-600 italic pl-4">
                          ↳ Same customer
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Address - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-yellow-200 text-yellow-900' 
                        : items.length > 1 
                          ? 'bg-yellow-50 border-l-2 border-l-yellow-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-xs align-middle`}>
                      {itemIndex === 0 ? order.address : items.length > 1 ? (
                        <div className="text-xs text-yellow-600 italic pl-4">
                          ↳ Same address
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Phone - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-blue-200 text-blue-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-blue-50 border-l-2 border-l-blue-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 text-sm align-middle`}>
                      {itemIndex === 0 ? (
                        <div>
                          <div>{order.phone}</div>
                          {(() => {
                            const totalCount = getTotalPhoneCount(order.phone);
                            const occurrenceNumber = getPhoneOccurrenceNumber(order.phone, orderIndex);
                            return totalCount > 1 ? (
                              <div className="text-xs text-blue-600 mt-1">
                                (repeated for {occurrenceNumber === 1 ? '1st' : occurrenceNumber === 2 ? '2nd' : occurrenceNumber === 3 ? '3rd' : `${occurrenceNumber}th`} time)
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-blue-600 italic">
                          ↳ Same phone
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Item Details - show for each item with enhanced styling for grouped items */}
                    <TableCell className={`border-r border-gray-200 align-middle p-2 ${
                      items.length > 1 ? 'bg-purple-50 border-l-2 border-l-purple-300' : ''
                    }`}>
                      <div className="flex items-center gap-3">
                        {/* Product Image */}
                        <div className="w-12 h-12 rounded overflow-hidden border flex-shrink-0 relative">
                          {item.productImage ? (
                            <Image
                              src={item.productImage}
                              alt={`${item.productCode} product`}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                              No IMG
                            </div>
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1">
                          <div className="font-bold text-sm text-gray-900">
                            {items.length > 1 && itemIndex > 0 ? (
                              <span className="text-purple-600">├─ </span>
                            ) : ''}
                            {item.productCode}
                          </div>
                          <div className="text-xs text-gray-600">
                            Size: <span className="font-semibold text-indigo-700">{item.size}</span> | 
                            Qty: <span className="font-semibold text-purple-700">{item.quantity}</span> | 
                            Price: <span className="font-semibold text-green-700">${(item as any).unitPrice || (item as any).unitSellingPrice || 0}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Delivery Charge - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-orange-200 text-orange-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-orange-50 border-l-2 border-l-orange-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 align-middle`}>
                      {itemIndex === 0 ? `$${order.deliveryCharge || 0}` : items.length > 1 ? (
                        <div className="text-xs text-orange-600 italic">
                          ↳ Shared
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Total Amount - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-green-300 text-green-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-green-50 border-l-2 border-l-green-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 align-middle`}>
                      {itemIndex === 0 ? `$${order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}` : items.length > 1 ? (
                        <div className="text-xs text-green-600 font-medium">
                          $${(item.totalPrice || 0).toFixed(2)}
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Total Profit - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-emerald-300 text-emerald-900 font-bold' 
                        : items.length > 1 
                          ? 'bg-emerald-50 border-l-2 border-l-emerald-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 align-middle`}>
                      {itemIndex === 0 ? `$${order.totalProfit?.toFixed(2) || '0.00'}` : items.length > 1 ? (
                        <div className="text-xs text-emerald-600 font-medium">
                          $${(item.profit || 0).toFixed(2)}
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Status - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-pink-200' 
                        : items.length > 1 
                          ? 'bg-pink-50 border-l-2 border-l-pink-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 align-middle`}>
                      {itemIndex === 0 ? (
                        <select
                          value={order.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as OrderStatus;
                            try {
                              await ordersAPI.updateStatus(order._id, { 
                                status: newStatus,
                                reasonNote: order.reasonNote || 'Status manually updated by user',
                                isAutoSync: false // This is a manual change
                              });
                              // Refresh orders to show updated status and update manual changes tracking
                              await fetchOrders();
                              // Reload manual status changes from database
                              const newManualChanges = await loadManualStatusChanges();
                              setManualStatusChanges(newManualChanges);
                            } catch (error) {
                              console.error('Failed to update status:', error);
                              alert('Failed to update status. Please try again.');
                              // Reset the dropdown to original value
                              e.target.value = order.status;
                            }
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                          style={{ color: '#111827' }}
                        >
                          <option value="PENDING" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Pending</option>
                          <option value="Phone" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone</option>
                          <option value="DITC" style={{ color: '#111827', backgroundColor: '#ffffff' }}>DITC</option>
                          <option value="Phone Off" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone Off</option>
                          <option value="PAID" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Paid</option>
                          <option value="Partial Delivered" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Partial Delivered</option>
                          <option value="CAN" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Cancelled</option>
                          <option value="HOLD" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Hold</option>
                          <option value="Exchange" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Exchange</option>
                        </select>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-pink-600 italic">
                          ↳ Same status
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* API Status - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-indigo-200' 
                        : items.length > 1 
                          ? 'bg-indigo-50 border-l-2 border-l-indigo-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 align-middle`}>
                      {itemIndex === 0 ? (
                        <div className="text-xs">
                          {(() => {
                            const apiStatusData = apiStatuses.get(order._id);
                            const isManuallyChanged = manualStatusChanges.has(order._id);
                            
                            if (!order.courierTrackingCode && !order.courierConsignmentId && !order.courierInvoice) {
                              return <span className="text-gray-500">No courier</span>;
                            }
                            if (apiStatusData?.loading) {
                              return <span className="text-blue-600">Loading...</span>;
                            }
                            if (apiStatusData?.status === 'error') {
                              return (
                                <button 
                                  onClick={() => fetchApiStatus(order)}
                                  className="text-red-600 hover:text-red-800 underline"
                                >
                                  Retry
                                </button>
                              );
                            }
                            if (apiStatusData?.status && apiStatusData.status !== 'loading') {
                              const statusInfo = getCourierStatusDescription(apiStatusData.status);
                              return (
                                <div>
                                  <div className={`px-2 py-1 rounded text-xs ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </div>
                                  {isManuallyChanged && (
                                    <div className="mt-1">
                                      <span className="text-orange-600 text-[10px]">🔒 Manual</span>
                                      <button
                                        onClick={async () => {
                                          if (confirm('Re-enable auto-sync for this order? This will sync the dropdown status with the current API status.')) {
                                            await clearManualStatusOverride(order._id);
                                            syncDropdownStatus(order._id, apiStatusData.status);
                                          }
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800 text-[10px] underline"
                                        title="Re-enable auto-sync"
                                      >
                                        sync
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <button 
                                onClick={() => fetchApiStatus(order)}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Check
                              </button>
                            );
                          })()}
                        </div>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-indigo-600 italic">
                          ↳ Same API
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Pickup Date - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-yellow-200 text-yellow-900' 
                        : items.length > 1 
                          ? 'bg-yellow-50 border-l-2 border-l-yellow-200' 
                          : 'bg-gray-100'
                    } text-center border-r border-gray-200 text-xs align-middle`}>
                      {itemIndex === 0 && order.pickupDate ? format(new Date(order.pickupDate), 'dd MMM yy') : items.length > 1 && itemIndex > 0 ? (
                        <div className="text-xs text-yellow-600 italic">
                          ↳ Same date
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Reason - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-red-200 text-red-900' 
                        : items.length > 1 
                          ? 'bg-red-50 border-l-2 border-l-red-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-xs align-middle`}>
                      {itemIndex === 0 ? (order.reasonNote || '') : items.length > 1 ? (
                        <div className="text-xs text-red-600 italic pl-4">
                          ↳ Same reason
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Consignment ID - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-blue-50' 
                        : items.length > 1 
                          ? 'bg-blue-25 border-l-2 border-l-blue-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-xs align-middle text-center`}>
                      {itemIndex === 0 ? (
                        editingConsignmentId === order._id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempConsignmentId}
                              onChange={(e) => setTempConsignmentId(e.target.value)}
                              className="w-20 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="ID"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveConsignmentId(order._id)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelConsignmentEdit}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className={`${
                              order.courierConsignmentId ? 'text-green-700 font-medium' : 'text-gray-500 italic'
                            }`}>
                              {order.courierConsignmentId || 'Not set'}
                            </span>
                            <button
                              onClick={() => handleEditConsignmentId(order._id, order.courierConsignmentId)}
                              className="text-blue-600 hover:text-blue-800 ml-1"
                              title={order.courierConsignmentId ? 'Edit Consignment ID' : 'Add Consignment ID'}
                            >
                              ✏️
                            </button>
                          </div>
                        )
                      ) : items.length > 1 ? (
                        <div className="text-xs text-gray-500 italic text-center">
                          Item {itemIndex + 1}
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Tracking Code - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-yellow-50' 
                        : items.length > 1 
                          ? 'bg-yellow-25 border-l-2 border-l-yellow-200' 
                          : 'bg-gray-100'
                    } border-r border-gray-200 text-xs align-middle text-center`}>
                      {itemIndex === 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`${
                            order.courierTrackingCode ? 'text-green-700 font-medium' : 'text-gray-500 italic'
                          }`}>
                            {order.courierTrackingCode || 'No tracking'}
                          </span>
                          {order.courierTrackingCode && (
                            <button
                              onClick={() => copyTrackingCode(order.courierTrackingCode!)}
                              className="text-blue-600 hover:text-blue-800 ml-1 p-1"
                              title="Copy tracking code"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-gray-500 italic text-center">
                          Item {itemIndex + 1}
                        </div>
                      ) : ''}
                    </TableCell>
                    
                    {/* Actions - only show for first item of each order */}
                    <TableCell className={`${
                      itemIndex === 0 
                        ? 'bg-gray-300' 
                        : items.length > 1 
                          ? 'bg-gray-100 border-l-2 border-l-gray-300' 
                          : 'bg-gray-100'
                    } text-center align-middle`}>
                      {itemIndex === 0 ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditForm(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteConfirm(order)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateOrder(order)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {/* Courier Status Check Button */}
                          {(order.courierTrackingCode || order.courierConsignmentId || order.courierInvoice) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => checkCourierStatus(order)}
                              className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700"
                              title="Check Courier Status"
                            >
                              <Search className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : items.length > 1 ? (
                        <div className="text-xs text-gray-500 italic text-center">
                          Item {itemIndex + 1}
                        </div>
                      ) : ''}
                    </TableCell>
                  </TableRow>
                ));
              })
            )}
          </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-6 flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Showing {((parseInt(filters.page) - 1) * parseInt(filters.pageSize)) + 1} to {Math.min(parseInt(filters.page) * parseInt(filters.pageSize), orders.pagination.total)} of {orders.pagination.total} orders
          </span>
          <select
            value={filters.pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
            style={{ color: '#111827' }}
          >
            <option value="10" style={{ color: '#111827', backgroundColor: '#ffffff' }}>10 per page</option>
            <option value="20" style={{ color: '#111827', backgroundColor: '#ffffff' }}>20 per page</option>
            <option value="50" style={{ color: '#111827', backgroundColor: '#ffffff' }}>50 per page</option>
            <option value="100" style={{ color: '#111827', backgroundColor: '#ffffff' }}>100 per page</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(parseInt(filters.page) - 1)}
            disabled={parseInt(filters.page) <= 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, orders.pagination.totalPages) }, (_, i) => {
              const currentPage = parseInt(filters.page);
              const totalPages = orders.pagination.totalPages;
              let pageNumber;
              
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(parseInt(filters.page) + 1)}
            disabled={parseInt(filters.page) >= orders.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create Multi-Item Order</h2>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name *</label>
                  <Input
                    value={newOrder.name}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    required
                    value={newOrder.phone}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address *</label>
                  <Input
                    value={newOrder.address}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Order Items</h3>
                  <Button type="button" onClick={addNewItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {newOrder.items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {newOrder.items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-1">Product *</label>
                        <ProductSelector
                          items={inventoryItems}
                          selectedCode={item.productCode}
                          onSelect={(productCode: string) => updateItemWithProductInfo(index, productCode)}
                          onSearch={searchAllInventory}
                          isSearching={isSearching}
                          placeholder="Select product"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Size *</label>
                        <select
                          value={item.size}
                          onChange={(e) => updateItem(index, 'size', e.target.value as 'M' | 'L' | 'XL' | 'XXL')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                          style={{ color: '#111827' }}
                          required
                        >
                          {(() => {
                            const selectedProduct = inventoryItems.find(inv => inv.finalCode === item.productCode);
                            const sizes = ['M', 'L', 'XL', 'XXL'] as const;
                            
                            return sizes.map(size => {
                              const stock = selectedProduct?.sizes[size] || 0;
                              const isAvailable = stock > 0;
                              
                              return (
                                <option 
                                  key={size}
                                  value={size} 
                                  disabled={!isAvailable}
                                  style={{ 
                                    color: isAvailable ? '#111827' : '#9CA3AF', 
                                    backgroundColor: '#ffffff' 
                                  }}
                                >
                                  {size} {selectedProduct ? `(Stock: ${stock})` : ''}
                                </option>
                              );
                            });
                          })()}
                        </select>
                        {(() => {
                          const selectedProduct = inventoryItems.find(inv => inv.finalCode === item.productCode);
                          const currentStock = selectedProduct?.sizes[item.size] || 0;
                          
                          if (selectedProduct && currentStock === 0) {
                            return (
                              <p className="text-xs text-red-600 mt-1">
                                Size {item.size} is out of stock
                              </p>
                            );
                          }
                          
                          if (selectedProduct && currentStock > 0) {
                            return (
                              <p className="text-xs text-green-600 mt-1">
                                Available: {currentStock}
                              </p>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity *</label>
                        <Input
                          type="number"
                          min="1"
                          max={(() => {
                            const selectedProduct = inventoryItems.find(inv => inv.finalCode === item.productCode);
                            return selectedProduct?.sizes[item.size] || 999;
                          })()}
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                        />
                        {(() => {
                          const selectedProduct = inventoryItems.find(inv => inv.finalCode === item.productCode);
                          const maxStock = selectedProduct?.sizes[item.size] || 0;
                          
                          if (selectedProduct && maxStock > 0) {
                            return (
                              <p className="text-xs text-gray-600 mt-1">
                                Max: {maxStock}
                              </p>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Selling Price *</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Buy Price (Auto)</label>
                        <Input
                          type="number"
                          value={item.unitBuyingPrice}
                          placeholder="Select product first"
                          className="bg-gray-100"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      Item Total: ${(item.quantity * item.unitPrice).toFixed(2)} | 
                      Item Profit: ${((item.quantity * item.unitPrice) - (item.quantity * item.unitBuyingPrice)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Delivery Charge</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newOrder.deliveryCharge}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, deliveryCharge: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={newOrder.status}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, status: e.target.value as OrderStatus }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                      style={{ color: '#111827' }}
                    >
                      <option value="PENDING" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Pending</option>
                      <option value="Phone" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone</option>
                      <option value="DITC" style={{ color: '#111827', backgroundColor: '#ffffff' }}>DITC</option>
                      <option value="Phone Off" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone Off</option>
                      <option value="PAID" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Paid</option>
                      <option value="Partial Delivered" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Partial Delivered</option>
                      <option value="CAN" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Cancelled</option>
                      <option value="HOLD" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Hold</option>
                      <option value="Exchange" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Exchange</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pickup Date (Optional)</label>
                    <Input
                      type="date"
                      value={newOrder.pickupDate}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, pickupDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reason/Notes</label>
                    <Input
                      value={newOrder.reasonNote}
                      onChange={(e) => setNewOrder(prev => ({ ...prev, reasonNote: e.target.value }))}
                      placeholder="Optional reason or notes"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Total Amount</div>
                    <div className="text-xl font-bold text-blue-600">${calculateOrderTotal().toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600">Total Profit</div>
                    <div className="text-xl font-bold text-green-600">${calculateOrderProfit().toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Order ({newOrder.items.length} items)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditForm && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Order</h2>
              <Button variant="outline" onClick={() => setShowEditForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleEditOrder} className="space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer Name</label>
                  <Input
                    required
                    value={editingOrder.name}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    required
                    value={editingOrder.phone}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Input
                    required
                    value={editingOrder.address}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivery Charge</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingOrder.deliveryCharge || 0}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, deliveryCharge: Number(e.target.value) }) : null)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, status: e.target.value as OrderStatus }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    style={{ color: '#111827' }}
                  >
                    <option value="PENDING" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Pending</option>
                    <option value="Phone" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone</option>
                    <option value="DITC" style={{ color: '#111827', backgroundColor: '#ffffff' }}>DITC</option>
                    <option value="Phone Off" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Phone Off</option>
                    <option value="PAID" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Paid</option>
                    <option value="Partial Delivered" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Partial Delivered</option>
                    <option value="CAN" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Cancelled</option>
                    <option value="HOLD" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Hold</option>
                    <option value="Exchange" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Exchange</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Reason Note</label>
                  <Input
                    value={editingOrder.reasonNote || ''}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, reasonNote: e.target.value }) : null)}
                    placeholder="Optional reason note"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pickup Date</label>
                  <Input
                    type="date"
                    value={editingOrder.pickupDate ? format(new Date(editingOrder.pickupDate), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditingOrder(prev => prev ? ({ ...prev, pickupDate: e.target.value || undefined }) : null)}
                  />
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                {editingOrder.items && editingOrder.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-1">Product Code</label>
                        <Input
                          required
                          value={item.productCode}
                          onChange={(e) => {
                            const updatedItems = [...(editingOrder.items || [])];
                            updatedItems[index] = { ...item, productCode: e.target.value };
                            setEditingOrder(prev => prev ? ({ ...prev, items: updatedItems }) : null);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Size</label>
                        <select
                          value={item.size}
                          onChange={(e) => {
                            const updatedItems = [...(editingOrder.items || [])];
                            updatedItems[index] = { ...item, size: e.target.value as 'M' | 'L' | 'XL' | 'XXL' };
                            setEditingOrder(prev => prev ? ({ ...prev, items: updatedItems }) : null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                          style={{ color: '#111827' }}
                        >
                          <option value="M" style={{ color: '#111827', backgroundColor: '#ffffff' }}>M</option>
                          <option value="L" style={{ color: '#111827', backgroundColor: '#ffffff' }}>L</option>
                          <option value="XL" style={{ color: '#111827', backgroundColor: '#ffffff' }}>XL</option>
                          <option value="XXL" style={{ color: '#111827', backgroundColor: '#ffffff' }}>XXL</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <Input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => {
                            const updatedItems = [...(editingOrder.items || [])];
                            updatedItems[index] = { ...item, quantity: Number(e.target.value) };
                            setEditingOrder(prev => prev ? ({ ...prev, items: updatedItems }) : null);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Selling Price</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.unitSellingPrice}
                          onChange={(e) => {
                            const updatedItems = [...(editingOrder.items || [])];
                            updatedItems[index] = { ...item, unitSellingPrice: Number(e.target.value) };
                            setEditingOrder(prev => prev ? ({ ...prev, items: updatedItems }) : null);
                          }}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={(editingOrder.items?.length || 0) <= 1}
                          onClick={() => {
                            if ((editingOrder.items?.length || 0) <= 1) {
                              alert('Order must have at least one item.');
                              return;
                            }
                            const updatedItems = editingOrder.items?.filter((_, i) => i !== index) || [];
                            setEditingOrder(prev => prev ? ({ ...prev, items: updatedItems }) : null);
                          }}
                          title={(editingOrder.items?.length || 0) <= 1 ? 'Cannot remove the last item' : 'Remove this item'}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const newItem = {
                      productCode: '',
                      size: 'M' as const,
                      quantity: 1,
                      unitSellingPrice: 0,
                      unitBuyingPrice: 0,
                      totalPrice: 0,
                      profit: 0
                    };
                    setEditingOrder(prev => prev ? ({ 
                      ...prev, 
                      items: [...(prev.items || []), newItem] 
                    }) : null);
                  }}
                >
                  Add Item
                </Button>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Order</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the order for {deletingOrder.name}? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteOrder}>
                Delete Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </HydrationSafe>
  );
}
