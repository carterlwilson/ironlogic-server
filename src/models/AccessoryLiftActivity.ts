import { IActivity } from './Activity';

export interface IAccessoryLiftActivity extends IActivity {
  percentOfMax: number;
  sets: number;
  repetitions: number;
  benchmarkTemplateId?: string; // Reference to benchmark template
} 