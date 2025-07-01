import mongoose, { Document, Schema } from 'mongoose';
import { IWeek } from '../models/Week';

// Embedded day schema (simplified for week context)
const daySubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Day ID is required'],
    trim: true
  },
  primaryLiftActivities: [{
    id: String,
    name: String,
    notes: String,
    activityGroupId: String,
    weight: Number,
    sets: Number,
    repetitions: Number
  }],
  accessoryLiftActivities: [{
    id: String,
    name: String,
    notes: String,
    activityGroupId: String,
    weight: Number,
    sets: Number,
    repetitions: Number
  }],
  otherActivities: [{
    id: String,
    name: String,
    notes: String,
    activityGroupId: String,
    measurementNotes: String
  }]
}, { _id: false });

// Embedded group percentage schema
const groupPercentageSubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Group percentage ID is required'],
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
}, { _id: false });

const weekSchema = new Schema<IWeek>({
  id: {
    type: String,
    required: [true, 'ID is required'],
    unique: true,
    trim: true
  },
  days: [daySubSchema],
  groupTargetPercentages: [groupPercentageSubSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
weekSchema.index({ id: 1 });

export const Week = mongoose.model<IWeek>('Week', weekSchema); 