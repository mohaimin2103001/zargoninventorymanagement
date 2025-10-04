import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditEntry {
  at: Date;
  by: mongoose.Types.ObjectId;
  action: 'CREATED' | 'STATUS_CHANGED' | 'EDIT' | 'CANCELLED' | 'CREATED_WITH_INSUFFICIENT_STOCK';
  meta: Record<string, any>;
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

export interface IOrderItem {
  productCode: string;
  productImage?: string;
  size: 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  unitSellingPrice: number;
  unitBuyingPrice: number; // For profit calculation
  totalPrice: number; // unitSellingPrice * quantity
  profit: number; // (unitSellingPrice - unitBuyingPrice) * quantity
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderDate: Date;
  name: string;
  address: string;
  phone: string;
  items: IOrderItem[]; // Multiple items per order
  deliveryCharge: number;
  totalAmount: number; // Sum of all items (excluding delivery charge)
  totalProfit: number; // Sum of all item profits (selling price - buying price)
  status: OrderStatus;
  processedDate?: Date;
  pickupDate?: Date;
  reasonNote?: string;
  selectedForDelivery?: boolean; // For delivery voucher selection (deprecated)
  deliverySelections?: mongoose.Types.ObjectId[]; // User IDs who selected this order for delivery
  // Courier fields
  courierConsignmentId?: number;
  courierTrackingCode?: string;
  courierInvoice?: string;
  courierStatus?: 'pending' | 'sent' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  courierSentAt?: Date;
  courierDeliveredAt?: Date;
  // Manual status override tracking
  manualStatusOverride?: boolean; // Track if user manually changed status
  manualStatusOverrideBy?: mongoose.Types.ObjectId; // Who made the manual change
  manualStatusOverrideAt?: Date; // When the manual change was made
  audit: IAuditEntry[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const auditEntrySchema = new Schema<IAuditEntry>({
  at: {
    type: Date,
    default: Date.now
  },
  by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['CREATED', 'STATUS_CHANGED', 'EDIT', 'CANCELLED', 'CREATED_WITH_INSUFFICIENT_STOCK'],
    required: true
  },
  meta: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const orderItemSchema = new Schema<IOrderItem>({
  productCode: {
    type: String,
    required: true,
    trim: true
  },
  productImage: {
    type: String,
    trim: true
  },
  size: {
    type: String,
    enum: ['M', 'L', 'XL', 'XXL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitSellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  unitBuyingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  profit: {
    type: Number,
    required: true
  }
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  items: [orderItemSchema],
  deliveryCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalProfit: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Phone', 'DITC', 'Phone Off', 'PAID', 'Partial Delivered', 'CAN', 'HOLD', 'Exchange', 'PENDING'],
    default: 'PENDING'
  },
  processedDate: {
    type: Date
  },
  pickupDate: {
    type: Date
  },
  reasonNote: {
    type: String,
    trim: true
  },
  selectedForDelivery: {
    type: Boolean,
    default: false
  },
  deliverySelections: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Courier fields
  courierConsignmentId: {
    type: Number
  },
  courierTrackingCode: {
    type: String,
    trim: true
  },
  courierInvoice: {
    type: String,
    trim: true
  },
  courierStatus: {
    type: String,
    enum: ['pending', 'sent', 'in_transit', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },
  courierSentAt: {
    type: Date
  },
  courierDeliveredAt: {
    type: Date
  },
  // Manual status override tracking
  manualStatusOverride: {
    type: Boolean,
    default: false
  },
  manualStatusOverrideBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  manualStatusOverrideAt: {
    type: Date
  },
  audit: [auditEntrySchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
orderSchema.index({ status: 1 });
orderSchema.index({ phone: 1 });
orderSchema.index({ 'items.productCode': 1 });
orderSchema.index({ orderDate: 1 });
orderSchema.index({ name: 'text', address: 'text' });
orderSchema.index({ courierTrackingCode: 1 });
orderSchema.index({ courierConsignmentId: 1 });

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0); // Exclude delivery charge
  // Total profit is just selling price - buying price
  this.totalProfit = this.items.reduce((sum, item) => sum + item.profit, 0);
  next();
});

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
