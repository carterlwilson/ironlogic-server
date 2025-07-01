import { IBenchmark } from './Benchmark';

export interface ILiftBenchmark extends IBenchmark {
  weight: number;
  benchmarkTemplateId?: string; // Reference to benchmark template
} 