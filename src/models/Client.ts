import { Document } from 'mongoose';
import { ILiftBenchmark } from './LiftBenchmark';
import { IOtherBenchmark } from './OtherBenchmark';

export interface IClient extends Document {
  // Existing fields
  email: string;
  firstName: string;
  lastName: string;
  userId: string;
  liftBenchmarks: ILiftBenchmark[];
  otherBenchmarks: IOtherBenchmark[];
  programId?: string;
  weight: number;
  
  // New required field
  gymId: string;
  
  // Enhanced fields
  membershipStatus: 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
} 