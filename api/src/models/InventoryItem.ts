import mongoose, { Document, Schema } from 'mongoose';

export interface ISizes {
  M: number;
  L: number;
  XL: number;
  XXL: number;
}

export interface IInventoryItem extends Document {
  _id: mongoose.Types.ObjectId;
  pid: number;
  ad?: string;
  color: string;
  images: string[];
  sizes: ISizes;
  totalQty: number;
  finalCode: string;
  buyPrice: number; // Renamed from sellPrice - this is the stock buying price
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  dateAdded?: Date;
}

const sizesSchema = new Schema<ISizes>({
  M: { type: Number, default: 0, min: 0 },
  L: { type: Number, default: 0, min: 0 },
  XL: { type: Number, default: 0, min: 0 },
  XXL: { type: Number, default: 0, min: 0 }
}, { _id: false });

const inventoryItemSchema = new Schema<IInventoryItem>({
  pid: {
    type: Number,
    required: true
  },
  ad: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  sizes: {
    type: sizesSchema,
    required: true
  },
  totalQty: {
    type: Number,
    required: true,
    min: 0
  },
  finalCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totalQty
inventoryItemSchema.pre('save', function(next) {
  if (this.sizes) {
    this.totalQty = this.sizes.M + this.sizes.L + this.sizes.XL + this.sizes.XXL;
  }
  next();
});

// Indexes
inventoryItemSchema.index({ color: 'text' });
inventoryItemSchema.index({ pid: 1 });
inventoryItemSchema.index({ isActive: 1 });
inventoryItemSchema.index({ finalCode: 1, color: 1 });

export const InventoryItem = mongoose.models.InventoryItem || mongoose.model<IInventoryItem>('InventoryItem', inventoryItemSchema);
