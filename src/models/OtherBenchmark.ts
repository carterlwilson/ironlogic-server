import { IBenchmark } from './Benchmark';

export interface IOtherBenchmark extends IBenchmark {
  measurementNotes?: string;
  value?: number;
  unit?: string;
  benchmarkTemplateId?: string; // Reference to benchmark template
} 