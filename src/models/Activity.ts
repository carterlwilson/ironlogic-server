import { Document } from 'mongoose';

export interface IActivity extends Document {
  name: string;
  notes: string;
  activityGroupId: string;
} 