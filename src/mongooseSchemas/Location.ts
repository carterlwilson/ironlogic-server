import mongoose, { Schema } from 'mongoose';
import { ILocation } from '../models/Location';

const locationSchema = new Schema<ILocation>({
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    minlength: [1, 'Location name must be at least 1 character long'],
    maxlength: [100, 'Location name cannot exceed 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [1, 'Address must be at least 1 character long'],
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[(]?[\+]?[0-9\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  isActive: {
    type: Boolean,
    default: true
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

// Indexes for better query performance
locationSchema.index({ gymId: 1, isActive: 1 });
locationSchema.index({ gymId: 1, name: 1 });

export const Location = mongoose.model<ILocation>('Location', locationSchema);