import { IActivity } from './Activity';

export interface IPrimaryLiftActivity extends IActivity {
  percentOfMax: number;
  sets: number;
  repetitions: number;
  benchmarkTemplateId?: string; // Reference to benchmark template
} 