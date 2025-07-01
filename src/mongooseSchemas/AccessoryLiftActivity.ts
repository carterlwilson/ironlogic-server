import mongoose, { Document, Schema } from 'mongoose';
import { Activity } from './Activity';
import { IAccessoryLiftActivity } from '../models/AccessoryLiftActivity';

const accessoryLiftActivitySchema = new Schema<IAccessoryLiftActivity>({
  percentOfMax: {
    type: Number,
    required: [true, 'Percent of max is required'],
    min: [0, 'Percent of max must be non-negative'],
    max: [100, 'Percent of max cannot exceed 100%']
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
  },
  benchmarkTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'BenchmarkTemplate',
    required: false
  }
});

export const AccessoryLiftActivity = Activity.discriminator<IAccessoryLiftActivity>('AccessoryLiftActivity', accessoryLiftActivitySchema); 