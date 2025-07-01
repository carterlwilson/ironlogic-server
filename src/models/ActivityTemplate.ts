import { Document } from 'mongoose';

export interface IActivityTemplate extends Document {
  name: string;
  activityGroupId: string;
} 