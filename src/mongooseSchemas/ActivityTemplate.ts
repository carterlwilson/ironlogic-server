import mongoose, { Document, Schema } from 'mongoose';
import { IActivityTemplate } from '../models/ActivityTemplate';

const activityTemplateSchema = new Schema<IActivityTemplate>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [200, 'Name cannot exceed 200 characters']
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
  toObject: { virtuals: true }
});

// Index for better query performance
activityTemplateSchema.index({ name: 1 });
activityTemplateSchema.index({ activityGroupId: 1 });

export const ActivityTemplate = mongoose.model<IActivityTemplate>('ActivityTemplate', activityTemplateSchema); 