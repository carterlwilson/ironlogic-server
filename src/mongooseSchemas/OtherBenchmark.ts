import mongoose, { Document, Schema } from 'mongoose';
import { Benchmark } from './Benchmark';
import { IOtherBenchmark } from '../models/OtherBenchmark';

const otherBenchmarkSchema = new Schema<IOtherBenchmark>({
  measurementNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Measurement notes cannot exceed 1000 characters']
  },
  value: {
    type: Number,
    min: [0, 'Value must be non-negative']
  },
  unit: {
    type: String,
    trim: true,
    maxlength: [50, 'Unit cannot exceed 50 characters']
  },
  benchmarkTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'BenchmarkTemplate',
    required: false
  }
});

export const OtherBenchmark = Benchmark.discriminator<IOtherBenchmark>('OtherBenchmark', otherBenchmarkSchema); 