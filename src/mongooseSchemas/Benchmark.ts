import mongoose, { Document, Schema } from 'mongoose';
import { IBenchmark, BenchmarkTemplateTypeEnum } from '../models/Benchmark';

const benchmarkSchema = new Schema<IBenchmark>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true },
  discriminatorKey: 'benchmarkType'
});

// Index for better query performance
benchmarkSchema.index({ name: 1 });

export const Benchmark = mongoose.model<IBenchmark>('Benchmark', benchmarkSchema); 