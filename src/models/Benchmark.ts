import { Document, Types } from 'mongoose';

export enum BenchmarkTypeEnum {
  Lift = 'Lift',
  Other = 'Other'
}

export interface IBenchmark extends Document {
  id: string;
  type: BenchmarkTypeEnum;
  name: string;
  notes?: string;
  clientId: Types.ObjectId;
  benchmarkTemplateId: Types.ObjectId; // Required - must select template for consistency
  recordedAt: Date;
  
  // Lift-specific fields (optional)
  weight?: number;
  
  // Other-specific fields (optional) 
  measurementNotes?: string;
  value?: number;
  unit?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
} 