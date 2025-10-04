import mongoose, { Document, Schema } from 'mongoose';

export interface IUserActivity extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: 'order_created' | 'order_updated' | 'order_deleted' | 'inventory_added' | 'inventory_updated' | 'inventory_deleted' | 'login' | 'export_data';
  details: {
    entityType?: 'order' | 'inventory';
    entityId?: mongoose.Types.ObjectId;
    description?: string;
    oldValues?: any;
    newValues?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const userActivitySchema = new Schema<IUserActivity>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: [
      'order_created', 
      'order_updated', 
      'order_deleted', 
      'inventory_added', 
      'inventory_updated', 
      'inventory_deleted', 
      'login',
      'export_data'
    ],
    required: true,
    index: true
  },
  details: {
    entityType: {
      type: String,
      enum: ['order', 'inventory']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    description: {
      type: String
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient queries
userActivitySchema.index({ userId: 1, createdAt: -1 });
userActivitySchema.index({ action: 1, createdAt: -1 });
userActivitySchema.index({ userId: 1, action: 1, createdAt: -1 });

export const UserActivity = mongoose.models.UserActivity || mongoose.model<IUserActivity>('UserActivity', userActivitySchema);
