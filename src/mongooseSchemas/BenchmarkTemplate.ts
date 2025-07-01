import mongoose, { Document, Schema } from 'mongoose';
import { IBenchmarkTemplate } from '../models/BenchmarkTemplate';
import { BenchmarkTemplateTypeEnum } from '../models/Benchmark';

const benchmarkTemplateSchema = new Schema<IBenchmarkTemplate>({
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
  },
  benchmarkType: {
    type: String,
    enum: Object.values(BenchmarkTemplateTypeEnum),
    required: [true, 'Benchmark type is required']
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
  toObject: { virtuals: true }
});

// Index for better query performance
benchmarkTemplateSchema.index({ name: 1 });
benchmarkTemplateSchema.index({ benchmarkType: 1 });

export const BenchmarkTemplate = mongoose.model<IBenchmarkTemplate>('BenchmarkTemplate', benchmarkTemplateSchema); 