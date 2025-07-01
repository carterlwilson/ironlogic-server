import mongoose, { Document, Schema } from 'mongoose';

export interface IGroupPercentage extends Document {
  id: string;
  groupId: string;
  percentage: number;
}

const groupPercentageSchema = new Schema<IGroupPercentage>({
  id: {
    type: String,
    required: [true, 'ID is required'],
    unique: true,
    trim: true
  },
  groupId: {
    type: String,
    required: [true, 'Group ID is required'],
    trim: true
  },
  percentage: {
    type: Number,
    required: [true, 'Percentage is required'],
    min: [0, 'Percentage must be non-negative'],
    max: [100, 'Percentage cannot exceed 100']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
groupPercentageSchema.index({ groupId: 1 });
groupPercentageSchema.index({ id: 1 });

export const GroupPercentage = mongoose.model<IGroupPercentage>('GroupPercentage', groupPercentageSchema); 