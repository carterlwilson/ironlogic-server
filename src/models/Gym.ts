import { Document } from 'mongoose';

export interface IGym extends Document {
  name: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  ownerId?: string;
  isActive: boolean;
  timezone: string; // IANA timezone identifier (e.g., 'America/New_York')
  createdAt: Date;
  updatedAt: Date;
}