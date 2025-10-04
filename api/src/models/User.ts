import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  passwordHash: string;
  isActive: boolean;
  passwordSetRequired: boolean; // For staff who need to set their password
  lastLogin?: Date;
  createdBy?: mongoose.Types.ObjectId; // Admin who created this staff
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  },
  passwordHash: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordSetRequired: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This will automatically handle createdAt and updatedAt
});

// Indexes
userSchema.index({ role: 1 });

// Use default mongoose connection (which will be set by DatabaseManager)
export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
