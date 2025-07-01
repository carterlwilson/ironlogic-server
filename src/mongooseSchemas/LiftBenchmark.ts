import mongoose, { Document, Schema } from 'mongoose';
import { Benchmark } from './Benchmark';
import { ILiftBenchmark } from '../models/LiftBenchmark';

const liftBenchmarkSchema = new Schema<ILiftBenchmark>({
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be non-negative']
  },
  benchmarkTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'BenchmarkTemplate',
    required: false
  }
});

export const LiftBenchmark = Benchmark.discriminator<ILiftBenchmark>('LiftBenchmark', liftBenchmarkSchema); 