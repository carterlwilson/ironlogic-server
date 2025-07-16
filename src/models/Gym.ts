import { Document } from 'mongoose';

export interface IGym extends Document {
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  ownerId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}