import mongoose, { Document, Schema } from 'mongoose';
import { Activity } from './Activity';
import { IOtherActivity } from '../models/OtherActivity';

const otherActivitySchema = new Schema<IOtherActivity>({
  measurementNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Measurement notes cannot exceed 1000 characters']
  }
});

export const OtherActivity = Activity.discriminator<IOtherActivity>('OtherActivity', otherActivitySchema); 