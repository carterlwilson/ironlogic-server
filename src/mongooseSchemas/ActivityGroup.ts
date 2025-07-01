import mongoose, { Document, Schema } from 'mongoose';
import { IActivityGroup } from '../models/ActivityGroup';

const activityGroupSchema = new Schema<IActivityGroup>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  toObject: { virtuals: true }
});

// Index for better query performance
activityGroupSchema.index({ name: 1 });

export const ActivityGroup = mongoose.model<IActivityGroup>('ActivityGroup', activityGroupSchema); 