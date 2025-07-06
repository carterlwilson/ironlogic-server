import mongoose, { Document, Schema } from 'mongoose';
import { IClient } from '../models/Client';
import { ILiftBenchmark } from '../models/LiftBenchmark';
import { IOtherBenchmark } from '../models/OtherBenchmark';

// Embedded lift benchmark schema
const liftBenchmarkSubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Benchmark ID is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Benchmark name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be non-negative']
  },
  benchmarkTemplateId: {
    type: String,
    trim: true
  }
}, { _id: false });

// Embedded other benchmark schema
const otherBenchmarkSubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Benchmark ID is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Benchmark name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
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
    type: String,
    trim: true
  }
}, { _id: false });

const clientSchema = new Schema<IClient>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [1, 'First name must be at least 1 character long'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [1, 'Last name must be at least 1 character long'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    unique: true
  },
  liftBenchmarks: [liftBenchmarkSubSchema],
  otherBenchmarks: [otherBenchmarkSubSchema],
  programId: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight must be non-negative']
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      // Add fullName if it exists
      if ((doc as any).fullName) {
        ret.fullName = (doc as any).fullName;
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better query performance
clientSchema.index({ email: 1 });
clientSchema.index({ programId: 1 });

// Virtual for full name
clientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export const Client = mongoose.model<IClient>('Client', clientSchema); 