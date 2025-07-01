import mongoose, { Document, Schema } from 'mongoose';
import { IDay } from '../models/Day';

// Embedded primary lift activity schema
const primaryLiftActivitySubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Activity ID is required'],
    trim: true
  },
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
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be non-negative']
  },
  sets: {
    type: Number,
    required: [true, 'Sets are required'],
    min: [1, 'Sets must be at least 1']
  },
  repetitions: {
    type: Number,
    required: [true, 'Repetitions are required'],
    min: [1, 'Repetitions must be at least 1']
  }
}, { _id: false });

// Embedded accessory lift activity schema
const accessoryLiftActivitySubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Activity ID is required'],
    trim: true
  },
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
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be non-negative']
  },
  sets: {
    type: Number,
    required: [true, 'Sets are required'],
    min: [1, 'Sets must be at least 1']
  },
  repetitions: {
    type: Number,
    required: [true, 'Repetitions are required'],
    min: [1, 'Repetitions must be at least 1']
  }
}, { _id: false });

// Embedded other activity schema
const otherActivitySubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Activity ID is required'],
    trim: true
  },
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
  },
  measurementNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Measurement notes cannot exceed 1000 characters']
  }
}, { _id: false });

const daySchema = new Schema<IDay>({
  id: {
    type: String,
    required: [true, 'ID is required'],
    unique: true,
    trim: true
  },
  primaryLiftActivities: [primaryLiftActivitySubSchema],
  accessoryLiftActivities: [accessoryLiftActivitySubSchema],
  otherActivities: [otherActivitySubSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
daySchema.index({ id: 1 });

export const Day = mongoose.model<IDay>('Day', daySchema); 