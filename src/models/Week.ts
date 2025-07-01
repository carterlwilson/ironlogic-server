import { Document } from 'mongoose';
import { IDay } from './Day';
import { IGroupPercentage } from './GroupPercentage';

export interface IWeek extends Document {
  id: string;
  days: IDay[];
  groupTargetPercentages: IGroupPercentage[];
} 