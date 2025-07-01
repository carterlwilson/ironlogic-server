import { Document } from 'mongoose';
import { BenchmarkTemplateTypeEnum } from "./Benchmark";

export interface IBenchmarkTemplate extends Document {
  name: string;
  notes?: string;
  benchmarkType: BenchmarkTemplateTypeEnum;
} 