import mongoose, { Document, Schema } from 'mongoose';

export interface INotice extends Document {
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const noticeSchema = new Schema<INotice>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for active notices
noticeSchema.index({ isActive: 1, createdAt: -1 });
noticeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notice = mongoose.models.Notice || mongoose.model<INotice>('Notice', noticeSchema);
