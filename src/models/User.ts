import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'trainer' | 'user';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 