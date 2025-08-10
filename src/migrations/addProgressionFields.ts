/**
 * Migration script to add program progression fields to existing clients and gyms
 * Run this script after updating the models to add default values for existing records
 */

import mongoose from 'mongoose';
import { Client } from '../mongooseSchemas/Client';
import { Gym } from '../mongooseSchemas/Gym';

export async function addProgressionFields() {
  console.log('Starting migration: Adding progression fields...');

  try {
    // Update all existing clients with default progression values
    const clientUpdateResult = await Client.updateMany(
      {
        $or: [
          { currentBlock: { $exists: false } },
          { currentWeek: { $exists: false } },
          { programStartDate: { $exists: false } },
          { lastProgressionUpdate: { $exists: false } }
        ]
      },
      {
        $set: {
          currentBlock: 0,
          currentWeek: 0,
          programStartDate: new Date(),
          lastProgressionUpdate: new Date()
        }
      }
    );

    console.log(`Updated ${clientUpdateResult.modifiedCount} clients with progression fields`);

    // Update all existing gyms with default timezone
    const gymUpdateResult = await Gym.updateMany(
      { timezone: { $exists: false } },
      { $set: { timezone: 'America/New_York' } }
    );

    console.log(`Updated ${gymUpdateResult.modifiedCount} gyms with timezone field`);

    console.log('Migration completed successfully!');
    
    return {
      clientsUpdated: clientUpdateResult.modifiedCount,
      gymsUpdated: gymUpdateResult.modifiedCount
    };

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Allow running this migration directly
if (require.main === module) {
  // Connect to MongoDB
  const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/ironlogic';
  
  mongoose.connect(MONGODB_URL)
    .then(async () => {
      console.log('Connected to MongoDB');
      await addProgressionFields();
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database connection failed:', error);
      process.exit(1);
    });
}