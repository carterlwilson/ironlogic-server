import mongoose, { Document, Schema } from 'mongoose';
import { IBenchmark, BenchmarkTypeEnum } from '../models/Benchmark';

const benchmarkSchema = new Schema<IBenchmark>({
  type: {
    type: String,
    enum: Object.values(BenchmarkTypeEnum),
    required: [true, 'Benchmark type is required']
  },
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
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  benchmarkTemplateId: {
    type: Schema.Types.ObjectId,
    ref: 'BenchmarkTemplate',
    required: [true, 'Benchmark template ID is required']
  },
  recordedAt: {
    type: Date,
    required: [true, 'Recorded date is required'],
    default: Date.now
  },
  
  // Lift-specific fields (optional)
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  
  // Other-specific fields (optional)
  measurementNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Measurement notes cannot exceed 500 characters']
  },
  value: {
    type: Number
  },
  unit: {
    type: String,
    trim: true,
    maxlength: [50, 'Unit cannot exceed 50 characters']
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

// Validation: Lift benchmarks must have weight
benchmarkSchema.pre('save', function(next) {
  if (this.type === BenchmarkTypeEnum.Lift && (this.weight === undefined || this.weight === null)) {
    next(new Error('Weight is required for Lift benchmarks'));
  } else {
    next();
  }
});

// Indexes for better query performance
benchmarkSchema.index({ clientId: 1, type: 1 });
benchmarkSchema.index({ benchmarkTemplateId: 1 });
benchmarkSchema.index({ recordedAt: -1 });

export const Benchmark = mongoose.model<IBenchmark>('Benchmark', benchmarkSchema); 