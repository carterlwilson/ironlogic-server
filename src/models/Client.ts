import { Document, Types } from 'mongoose';
import { IBenchmark } from './Benchmark';

export interface IClient extends Document {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId: Types.ObjectId;
  gymId: Types.ObjectId;
  programId?: Types.ObjectId; // References a program template
  weight?: number;
  
  // Enhanced fields
  membershipStatus: 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Program progression tracking
  currentBlock: number;
  currentWeek: number;
  programStartDate?: Date;
  lastProgressionUpdate?: Date;
  
  // Current benchmarks: One per template (most recent/best)
  currentBenchmarks: IBenchmark[];
  
  // Historical benchmarks: All previous benchmarks for tracking progress
  historicalBenchmarks: IBenchmark[];
} 