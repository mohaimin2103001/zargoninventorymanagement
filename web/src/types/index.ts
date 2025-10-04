export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface Sizes {
  M: number;
  L: number;
  XL: number;
  XXL: number;
}

export interface InventoryItem {
  _id: string;
  pid: number;
  ad?: string;
  color: string;
  images: string[];
  sizes: Sizes;
  totalQty: number;
  finalCode: string;
  sellPrice: number;
  buyPrice: number; // Add buying price
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  dateAdded?: string;
}

export type OrderStatus = 
  | 'Phone' 
  | 'DITC' 
  | 'Phone Off' 
  | 'PAID' 
  | 'Partial Delivered' 
  | 'CAN' 
  | 'HOLD' 
  | 'Exchange' 
  | 'PENDING';

export interface AuditEntry {
  at: string;
  by: string;
  action: 'CREATED' | 'STATUS_CHANGED' | 'EDIT' | 'CANCELLED' | 'CREATED_WITH_INSUFFICIENT_STOCK';
  meta: Record<string, unknown>;
}

export interface OrderItem {
  productCode: string;
  productImage?: string;
  size: 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  unitSellingPrice: number;
  unitBuyingPrice: number;
  totalPrice: number;
  profit: number;
}

export interface Order {
  _id: string;
  orderDate: string;
  name: string;
  address: string;
  phone: string;
  items: OrderItem[]; // Multiple items per order
  deliveryCharge: number;
  totalAmount: number;
  totalProfit: number;
  status: OrderStatus;
  processedDate?: string;
  pickupDate?: string;
  reasonNote?: string;
  selectedForDelivery?: boolean; // For delivery voucher selection
  // Courier fields
  courierConsignmentId?: number;
  courierTrackingCode?: string;
  courierInvoice?: string;
  courierStatus?: 'pending' | 'sent' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  courierSentAt?: string;
  courierDeliveredAt?: string;
  audit: AuditEntry[];
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ReportsData {
  overview: {
    totalProductsSold: {
      amount: number;
      worth: number;
      deliveryCharges: number;
    };
    totalAvailableProducts: {
      amount: number;
      worth: number;
      productCount: number;
    };
    lowStockItems: number;
    outOfStockItems: number;
  };
  statusBreakdown: Array<{
    _id: OrderStatus;
    count: number;
    totalAmount: number;
    totalWorth: number;
  }>;
  recentActivity: Array<{
    _id: string;
    orderCount: number;
    totalUnits: number;
    dailyRevenue: number;
    deliveryCharges: number;
    grossAmount: number;
  }>;
  topSellingProducts: Array<{
    _id: string;
    totalSold: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
}

// Analytics Types
export interface CustomerAnalytics {
  overview: {
    totalCustomers: number;
    vipCustomers: number;
    loyalCustomers: number;
    recentActiveCustomers: number;
    avgCustomerValue: number;
  };
  insights: {
    repeatCustomerRate: number;
    vipContribution: number;
    topGeographicArea: string;
  };
  topCustomers: Array<{
    _id: { phone: string };
    totalOrders: number;
    totalSpent: number;
    totalRevenue: number;
  }>;
  geographicAnalysis: Array<{
    division: string;
    totalCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  }>;
}

export interface ABCAnalysis {
  summary: {
    A: number;
    B: number;
    C: number;
  };
  products: Array<{
    _id: string;
    classification: string;
    totalRevenue: number;
    totalQuantitySold: number;
    revenuePercentage: number;
    orderCount: number;
  }>;
}

export interface DemandForecast {
  summary: {
    totalForecasts: number;
    highConfidenceForecasts: number;
    averageForecastDemand: number;
    trendingUp: number;
  };
  forecasts: Array<{
    productCode: string;
    currentAvgDaily: number;
    forecastedDemand: number;
    trend: string;
    confidence: string;
  }>;
}

export interface FinancialAnalytics {
  insights: {
    totalRevenue: number;
    totalProfit: number;
    avgProfitMargin: number;
    topPerformingProduct: string;
  };
  profitability: {
    totalProductsAnalyzed: number;
    highMarginProducts: number;
    avgProfitPerOrder: number;
    products: Array<{
      productCode: string;
      totalRevenue: number;
      totalProfit: number;
      profitMargin: number;
      avgProfitPerUnit: number;
    }>;
  };
}
