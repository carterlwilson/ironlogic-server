import { Document } from 'mongoose';

export interface IGroupPercentage extends Document {
  id: string;
  groupId: string;
  percentage: number;
} 