import mongoose, { Schema } from 'mongoose';

const timeSlotSchema = new Schema({
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  maxCapacity: {
    type: Number,
    required: true,
    min: 1
  },
  clientIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Client'
  }],
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const daySchema = new Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  timeSlots: [timeSlotSchema]
}, { _id: false });

const weeklyScheduleSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  days: [daySchema],
  isBaseline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
      ret.id = (doc as any)._id.toString();
      return ret;
    }
  }
});

// Validate that endTime is after startTime for each time slot
weeklyScheduleSchema.pre('validate', function(next) {
  for (const day of this.days) {
    for (const timeSlot of day.timeSlots) {
      if (timeSlot.startTime && timeSlot.endTime) {
        const start = new Date(`2000-01-01T${timeSlot.startTime}:00`);
        const end = new Date(`2000-01-01T${timeSlot.endTime}:00`);
        
        if (end <= start) {
          return next(new Error(`End time must be after start time for time slot ${timeSlot.startTime}-${timeSlot.endTime} on day ${day.dayOfWeek}`));
        }
      }
    }
  }
  next();
});

export default weeklyScheduleSchema; 