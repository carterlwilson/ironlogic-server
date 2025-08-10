import mongoose from 'mongoose';
import { BenchmarkTemplate } from '../mongooseSchemas/BenchmarkTemplate';
import { BenchmarkTypeEnum } from '../models/Benchmark';

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/ironlogic';

const benchmarkTemplates = [
  // Lift benchmarks
  { name: 'Bench Press', benchmarkType: BenchmarkTypeEnum.Lift },
  { name: 'Squat', benchmarkType: BenchmarkTypeEnum.Lift },
  { name: 'Deadlift', benchmarkType: BenchmarkTypeEnum.Lift },
  { name: 'Overhead Press', benchmarkType: BenchmarkTypeEnum.Lift },
  { name: 'Barbell Row', benchmarkType: BenchmarkTypeEnum.Lift },
  { name: 'Pull-up', benchmarkType: BenchmarkTypeEnum.Lift },
  { name: 'Dip', benchmarkType: BenchmarkTypeEnum.Lift },
  
  // Other benchmarks
  { name: '5K Run Time', benchmarkType: BenchmarkTypeEnum.Other },
  { name: 'Max Push-ups', benchmarkType: BenchmarkTypeEnum.Other },
  { name: 'Plank Hold', benchmarkType: BenchmarkTypeEnum.Other },
  { name: 'Flexibility Assessment', benchmarkType: BenchmarkTypeEnum.Other },
];

async function seedBenchmarkTemplates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('Connected to MongoDB');

    // Check if templates already exist
    const existingCount = await BenchmarkTemplate.countDocuments();
    console.log(`Found ${existingCount} existing benchmark templates`);

    if (existingCount === 0) {
      console.log('Seeding benchmark templates...');
      await BenchmarkTemplate.insertMany(benchmarkTemplates);
      console.log(`Successfully seeded ${benchmarkTemplates.length} benchmark templates`);
    } else {
      console.log('Benchmark templates already exist, skipping seed');
    }

    // List all templates
    const allTemplates = await BenchmarkTemplate.find();
    console.log('Current benchmark templates:');
    allTemplates.forEach(template => {
      console.log(`- ${template.name} (${template.benchmarkType})`);
    });

  } catch (error) {
    console.error('Error seeding benchmark templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedBenchmarkTemplates();