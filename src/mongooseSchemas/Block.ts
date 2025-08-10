import mongoose, { Document, Schema } from 'mongoose';
import { IBlock } from '../models/Block';

// Embedded week schema (simplified for block context)
const weekSubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Week ID is required'],
    trim: true
  },
  days: [{
    id: String,
    name: String,
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
  }],
  groupTargetPercentages: [{
    id: String,
    groupId: String,
    percentage: Number
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

const blockSchema = new Schema<IBlock>({
  id: {
    type: String,
    required: [true, 'ID is required'],
    unique: true,
    trim: true
  },
  weeks: [weekSubSchema],
  groupTargetPercentages: [groupPercentageSubSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
blockSchema.index({ id: 1 });

export const Block = mongoose.model<IBlock>('Block', blockSchema); 