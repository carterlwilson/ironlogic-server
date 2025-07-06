import { Document } from 'mongoose';
import { IBlock } from './Block';

export interface IProgram extends Document {
  name: string;
  blocks: IBlock[];
} 