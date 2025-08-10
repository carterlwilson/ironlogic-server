import mongoose, { Document, Schema } from 'mongoose';
import { IClient } from '../models/Client';
import { BenchmarkTypeEnum } from '../models/Benchmark';

const clientSchema = new Schema<IClient>({
  email: {
    type: String,
    required: [true, 'Email is required'],
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
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  gymId: {
    type: Schema.Types.ObjectId,
    ref: 'Gym',
    required: [true, 'Gym ID is required']
  },
  programId: {
    type: Schema.Types.ObjectId,
    ref: 'Program'
  },
  weight: {
    type: Number,
    min: [0, 'Weight must be non-negative']
  },
  
  // Enhanced fields
  membershipStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  
  // Program progression tracking
  currentBlock: {
    type: Number,
    default: 0,
    min: 0
  },
  currentWeek: {
    type: Number,
    default: 0,
    min: 0
  },
  programStartDate: {
    type: Date,
    default: Date.now
  },
  lastProgressionUpdate: {
    type: Date,
    default: Date.now
  },
  
  // Current benchmarks: One per template (most recent/best)
  currentBenchmarks: [{
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
  }],
  
  // Historical benchmarks: All previous benchmarks for tracking progress
  historicalBenchmarks: [{
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
  }]
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
clientSchema.index({ gymId: 1, email: 1 });
clientSchema.index({ gymId: 1, userId: 1 });
clientSchema.index({ gymId: 1, membershipStatus: 1 });
clientSchema.index({ programId: 1 });
clientSchema.index({ currentBlock: 1, currentWeek: 1 });
clientSchema.index({ gymId: 1, currentBlock: 1, currentWeek: 1 });

// Virtual for full name
clientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export const Client = mongoose.model<IClient>('Client', clientSchema); 