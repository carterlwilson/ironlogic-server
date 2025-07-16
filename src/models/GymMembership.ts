import { Document } from 'mongoose';

export interface IGymMembership extends Document {
  userId: string;
  gymId: string;
  role: 'owner' | 'trainer' | 'client';
  status: 'active' | 'inactive';
  joinedAt: Date;
}