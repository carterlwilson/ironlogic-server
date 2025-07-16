import mongoose, { Schema } from 'mongoose';
import { IGym } from '../models/Gym';

const gymSchema = new Schema<IGym>({
  name: {
    type: String,
    required: [true, 'Gym name is required'],
    trim: true,
    minlength: [1, 'Gym name must be at least 1 character long'],
    maxlength: [100, 'Gym name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
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
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[(]?[\+]?[0-9\s\-\(\)]{10,}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  ownerId: {
    type: String,
    trim: true
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
gymSchema.index({ email: 1 });
gymSchema.index({ isActive: 1 });
gymSchema.index({ name: 1 });

export const Gym = mongoose.model<IGym>('Gym', gymSchema);