import { Document } from 'mongoose';
import { BenchmarkTypeEnum } from "./Benchmark";

export interface IBenchmarkTemplate extends Document {
  name: string;
  notes?: string;
  benchmarkType: BenchmarkTypeEnum;
} 