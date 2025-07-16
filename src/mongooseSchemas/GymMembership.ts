import mongoose, { Schema } from 'mongoose';
import { IGymMembership } from '../models/GymMembership';

const gymMembershipSchema = new Schema<IGymMembership>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    trim: true
  },
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['owner', 'trainer', 'client'],
    default: 'client'
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['active', 'inactive'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now
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

// Ensure a user can only have one membership per gym
gymMembershipSchema.index({ userId: 1, gymId: 1 }, { unique: true });

// Indexes for better query performance
gymMembershipSchema.index({ userId: 1, status: 1 });
gymMembershipSchema.index({ gymId: 1, role: 1 });
gymMembershipSchema.index({ gymId: 1, status: 1 });

export const GymMembership = mongoose.model<IGymMembership>('GymMembership', gymMembershipSchema);