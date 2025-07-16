import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  role: 'admin' | 'user'; // Simplified - gym roles in GymMembership
  isActive: boolean;
  lastLogin?: Date;
  currentGymId?: string; // For session context when user has multiple gyms
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
} 