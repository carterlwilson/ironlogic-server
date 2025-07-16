import { Document } from 'mongoose';
import { IBlock } from './Block';

export interface IProgram extends Document {
  name: string;
  blocks: IBlock[];
  
  // New fields
  gymId: string;
  isTemplate: boolean; // True for gym templates, false for assigned programs
  templateId?: string; // For assigned programs, references the template
  createdBy: string; // User ID
  clientId?: string; // Only for assigned programs
  createdAt: Date;
  updatedAt: Date;
} 