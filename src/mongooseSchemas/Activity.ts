import mongoose, { Document, Schema } from 'mongoose';
import { IActivity } from '../models/Activity';

const activitySchema = new Schema<IActivity>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  activityGroupId: {
    type: String,
    required: [true, 'Activity group ID is required'],
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true },
  discriminatorKey: 'activityType'
});

// Index for better query performance
activitySchema.index({ activityGroupId: 1 });
activitySchema.index({ name: 1 });

export const Activity = mongoose.model<IActivity>('Activity', activitySchema); 