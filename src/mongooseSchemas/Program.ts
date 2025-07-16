import mongoose, { Document, Schema } from 'mongoose';
import { IProgram } from '../models/Program';

// Embedded block schema (simplified for program context)
const blockSubSchema = new Schema({
  id: {
    type: String,
    required: [true, 'Block ID is required'],
    trim: true
  },
  weeks: [{
    id: String,
    days: [{
      id: String,
      primaryLiftActivities: [{
        id: String,
        name: String,
        notes: String,
        activityGroupId: String,
        percentOfMax: Number,
        sets: Number,
        repetitions: Number,
        benchmarkTemplateId: String
      }],
      accessoryLiftActivities: [{
        id: String,
        name: String,
        notes: String,
        activityGroupId: String,
        percentOfMax: Number,
        sets: Number,
        repetitions: Number,
        benchmarkTemplateId: String
      }],
      otherActivities: [{
        id: String,
        name: String,
        notes: String,
        activityGroupId: String,
        measurementNotes: String
      }]
    }],
    groupTargetPercentages: [{
      id: String,
      groupId: String,
      percentage: Number
    }]
  }],
  groupTargetPercentages: [{
    id: String,
    groupId: String,
    percentage: Number
  }]
}, { _id: false });

const programSchema = new Schema<IProgram>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character long'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  blocks: [{
    id: {
      type: String,
      required: [true, 'Block ID is required'],
      trim: true
    },
    weeks: [{
      id: {
        type: String,
        required: [true, 'Week ID is required'],
        trim: true
      },
      days: [{
        id: {
          type: String,
          required: [true, 'Day ID is required'],
          trim: true
        },
        primaryLiftActivities: [{
          id: {
            type: String,
            required: [true, 'Activity ID is required'],
            trim: true
          },
          name: {
            type: String,
            required: [true, 'Activity name is required'],
            trim: true
          },
          notes: {
            type: String,
            trim: true
          },
          activityGroupId: {
            type: String,
            required: [true, 'Activity group ID is required'],
            trim: true
          },
          percentOfMax: {
            type: Number,
            required: [true, 'Percent of Max is required'],
            min: [0, 'Percent of Max must be non-negative'],
            max: [100, 'Percent of Max cannot exceed 100']
          },
          sets: {
            type: Number,
            required: [true, 'Sets are required'],
            min: [1, 'Sets must be at least 1']
          },
          repetitions: {
            type: Number,
            required: [true, 'Repetitions are required'],
            min: [1, 'Repetitions must be at least 1']
          },
          benchmarkTemplateId: {
            type: String,
            trim: true
          }
        }],
        accessoryLiftActivities: [{
          id: {
            type: String,
            required: [true, 'Activity ID is required'],
            trim: true
          },
          name: {
            type: String,
            required: [true, 'Activity name is required'],
            trim: true
          },
          notes: {
            type: String,
            trim: true
          },
          activityGroupId: {
            type: String,
            required: [true, 'Activity group ID is required'],
            trim: true
          },
          percentOfMax: {
            type: Number,
            required: [true, 'Percent of Max is required'],
            min: [0, 'Percent of Max must be non-negative'],
            max: [100, 'Percent of Max cannot exceed 100']
          },
          sets: {
            type: Number,
            required: [true, 'Sets are required'],
            min: [1, 'Sets must be at least 1']
          },
          repetitions: {
            type: Number,
            required: [true, 'Repetitions are required'],
            min: [1, 'Repetitions must be at least 1']
          },
          benchmarkTemplateId: {
            type: String,
            trim: true
          }
        }],
        otherActivities: [{
          id: {
            type: String,
            required: [true, 'Activity ID is required'],
            trim: true
          },
          name: {
            type: String,
            required: [true, 'Activity name is required'],
            trim: true
          },
          notes: {
            type: String,
            trim: true
          },
          activityGroupId: {
            type: String,
            required: [true, 'Activity group ID is required'],
            trim: true
          },
          measurementNotes: {
            type: String,
            trim: true
          }
        }]
      }],
      groupTargetPercentages: [{
        id: {
          type: String,
          required: [true, 'Group percentage ID is required'],
          trim: true
        },
        groupId: {
          type: String,
          required: [true, 'Group ID is required'],
          trim: true
        },
        percentage: {
          type: Number,
          required: [true, 'Percentage is required'],
          min: [0, 'Percentage must be non-negative'],
          max: [100, 'Percentage cannot exceed 100']
        }
      }]
    }],
    groupTargetPercentages: [{
      id: {
        type: String,
        required: [true, 'Group percentage ID is required'],
        trim: true
      },
      groupId: {
        type: String,
        required: [true, 'Group ID is required'],
        trim: true
      },
      percentage: {
        type: Number,
        required: [true, 'Percentage is required'],
        min: [0, 'Percentage must be non-negative'],
        max: [100, 'Percentage cannot exceed 100']
      }
    }]
  }],
  
  // New fields
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
    trim: true
  },
  isTemplate: {
    type: Boolean,
    required: [true, 'isTemplate is required'],
    default: false
  },
  templateId: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: [true, 'Creator user ID is required'],
    trim: true
  },
  clientId: {
    type: String,
    trim: true
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

// Indexes for better query performance
programSchema.index({ gymId: 1, isTemplate: 1 });
programSchema.index({ gymId: 1, clientId: 1 });
programSchema.index({ templateId: 1 });
programSchema.index({ name: 1 });

export const Program = mongoose.model<IProgram>('Program', programSchema); 