import { Document } from 'mongoose';
import { IBlock } from './Block';

export interface ISchedule extends Document {
  name: string;
  blocks: IBlock[];
} 