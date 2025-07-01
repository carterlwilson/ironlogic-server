import { Document } from 'mongoose';
import { ILiftBenchmark } from './LiftBenchmark';
import { IOtherBenchmark } from './OtherBenchmark';

export interface IClient extends Document {
  email: string;
  firstName: string;
  lastName: string;
  userId: string;
  liftBenchmarks: ILiftBenchmark[];
  otherBenchmarks: IOtherBenchmark[];
  scheduleId: string;
  weight: number;
} 