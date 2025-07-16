import { Document } from 'mongoose';

export interface ILocation extends Document {
  gymId: string;
  name: string;
  address: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}