import { Document } from 'mongoose';
import { IPrimaryLiftActivity } from './PrimaryLiftActivity';
import { IAccessoryLiftActivity } from './AccessoryLiftActivity';
import { IOtherActivity } from './OtherActivity';

export interface IDay extends Document {
  id: string;
  name?: string;
  primaryLiftActivities: IPrimaryLiftActivity[];
  accessoryLiftActivities: IAccessoryLiftActivity[];
  otherActivities: IOtherActivity[];
} 