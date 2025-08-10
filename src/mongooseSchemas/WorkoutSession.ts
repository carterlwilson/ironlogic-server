import { Schema, model } from 'mongoose';
import { IWorkoutSession, CompletedSet } from '../models/WorkoutSession';

const CompletedSetSchema = new Schema<CompletedSet>({
  activityId: {
    type: String,
    required: true
  },
  setNumber: {
    type: Number,
    required: true,
    min: 1
  },
  completedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

const WorkoutSessionSchema = new Schema<IWorkoutSession>({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  gymId: {
    type: String,
    required: true,
    index: true
  },
  programId: {
    type: String,
    required: true
  },
  block: {
    type: Number,
    required: true,
    min: 0
  },
  week: {
    type: Number,
    required: true,
    min: 0
  },
  day: {
    type: Number,
    required: true,
    min: 0
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  completedSets: [CompletedSetSchema],
  isActive: {
    type: Boolean,
    required: true,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
WorkoutSessionSchema.index({ clientId: 1, gymId: 1, isActive: 1 });
WorkoutSessionSchema.index({ clientId: 1, block: 1, week: 1, day: 1 });

export const WorkoutSession = model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema);