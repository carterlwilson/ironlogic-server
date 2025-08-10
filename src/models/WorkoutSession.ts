export interface IWorkoutSession {
  id: string;
  clientId: string;
  gymId: string;
  programId: string;
  block: number;
  week: number;
  day: number; // Day index within the week
  startedAt: Date;
  completedAt?: Date;
  completedSets: CompletedSet[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompletedSet {
  activityId: string;
  setNumber: number; // 1-based index (1, 2, 3, etc.)
  completedAt: Date;
}