import { Document } from 'mongoose';

export enum BenchmarkTemplateTypeEnum {
  Lift = 'Lift',
  Other = 'Other'
}

export interface IBenchmark extends Document {
  name: string;
  notes: string;
} 