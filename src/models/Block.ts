import { Document } from 'mongoose';
import { IWeek } from './Week';
import { IGroupPercentage } from './GroupPercentage';

export interface IBlock extends Document {
  id: string;
  weeks: IWeek[];
  groupTargetPercentages: IGroupPercentage[];
} 