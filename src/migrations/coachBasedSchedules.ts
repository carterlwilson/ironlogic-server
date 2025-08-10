import mongoose from 'mongoose';
import WeeklySchedule from '../models/WeeklySchedule';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership'; 
import { Gym } from '../mongooseSchemas/Gym';

/**
 * Migration script to convert location-based schedules to coach-based schedules
 * 
 * Changes:
 * 1. Remove locationId from WeeklySchedule root level
 * 2. Add coachId to WeeklySchedule (assign to gym owner or first trainer)
 * 3. Add locationId to each TimeSlot
 * 4. Remove trainerIds from TimeSlots
 */
export async function migrateToCoachBasedSchedules() {
  console.log('Starting migration to coach-based schedules...');
  
  try {
    // Get all gyms
    const gyms = await Gym.find({});
    console.log(`Found ${gyms.length} gyms to migrate`);
    
    for (const gym of gyms) {
      console.log(`\nMigrating gym: ${gym.name} (${gym._id})`);
      
      // Find gym owner or first trainer
      const ownerMembership = await GymMembership.findOne({
        gymId: (gym._id as any).toString(),
        role: 'owner',
        status: 'active'
      });
      
      let coachMembership = ownerMembership;
      if (!coachMembership) {
        // Fallback to first trainer if no owner
        coachMembership = await GymMembership.findOne({
          gymId: (gym._id as any).toString(),
          role: 'trainer',
          status: 'active'
        });
      }
      
      if (!coachMembership) {
        console.warn(`  No owner or trainer found for gym ${gym.name}, skipping...`);
        continue;
      }
      
      const coach = await User.findById(coachMembership.userId);
      if (!coach) {
        console.warn(`  Coach user not found for gym ${gym.name}, skipping...`);
        continue;
      }
      
      console.log(`  Assigning schedules to coach: ${coach.name} (${coach.email})`);
      
      // Find all schedules for this gym (old location-based format)
      const schedules = await WeeklySchedule.find({ gymId: (gym._id as any).toString() });
      console.log(`  Found ${schedules.length} schedules to migrate`);
      
      for (const schedule of schedules) {
        console.log(`    Migrating schedule: ${schedule.name}`);
        
        // Store the old locationId before we lose it
        const oldLocationId = (schedule as any).locationId;
        
        if (!oldLocationId) {
          console.warn(`    Schedule ${schedule.name} has no locationId, skipping...`);
          continue;
        }
        
        // Update the schedule structure
        const updateData: any = {
          coachId: (coach._id as any).toString()
        };
        
        // Update all time slots to include locationId and remove trainerIds
        const updatedDays = schedule.days.map(day => ({
          dayOfWeek: day.dayOfWeek,
          timeSlots: day.timeSlots.map(slot => {
            const updatedSlot: any = {
              startTime: slot.startTime,
              endTime: slot.endTime,
              maxCapacity: slot.maxCapacity,
              clientIds: slot.clientIds || [],
              locationId: oldLocationId, // Move locationId to time slot level
              notes: slot.notes,
              activityType: slot.activityType
            };
            
            // Remove trainerIds if it exists
            delete (updatedSlot as any).trainerIds;
            
            return updatedSlot;
          })
        }));
        
        updateData.days = updatedDays;
        
        // Remove the old locationId field and update with new structure
        await WeeklySchedule.updateOne(
          { _id: schedule._id },
          {
            $set: updateData,
            $unset: { locationId: "" }
          }
        );
        
        console.log(`    ✓ Migrated schedule: ${schedule.name}`);
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify migration
    console.log('\nVerifying migration...');
    const migratedSchedules = await WeeklySchedule.find({});
    const schedulesWithCoachId = migratedSchedules.filter(s => s.coachId);
    const schedulesWithLocationInTimeSlots = migratedSchedules.filter(s => 
      s.days.some(day => 
        day.timeSlots.some(slot => (slot as any).locationId)
      )
    );
    
    console.log(`Total schedules: ${migratedSchedules.length}`);
    console.log(`Schedules with coachId: ${schedulesWithCoachId.length}`);
    console.log(`Schedules with locationId in timeSlots: ${schedulesWithLocationInTimeSlots.length}`);
    
    if (schedulesWithCoachId.length === migratedSchedules.length && 
        schedulesWithLocationInTimeSlots.length === migratedSchedules.length) {
      console.log('✅ Migration verification passed!');
    } else {
      console.warn('⚠️  Migration verification failed - some schedules may not have been migrated correctly');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function to reverse the migration (for testing purposes)
 */
export async function rollbackCoachBasedSchedules() {
  console.log('Rolling back coach-based schedules migration...');
  
  try {
    const schedules = await WeeklySchedule.find({});
    
    for (const schedule of schedules) {
      if (!schedule.coachId) continue;
      
      // Find the first location from time slots
      let locationId = null;
      for (const day of schedule.days) {
        for (const slot of day.timeSlots) {
          if ((slot as any).locationId) {
            locationId = (slot as any).locationId;
            break;
          }
        }
        if (locationId) break;
      }
      
      if (!locationId) {
        console.warn(`No locationId found in timeSlots for schedule ${schedule.name}`);
        continue;
      }
      
      // Restore old structure
      const updateData: any = {
        locationId: locationId
      };
      
      // Remove locationId from time slots and restore trainerIds
      const updatedDays = schedule.days.map(day => ({
        dayOfWeek: day.dayOfWeek,
        timeSlots: day.timeSlots.map(slot => {
          const updatedSlot: any = {
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxCapacity: slot.maxCapacity,
            clientIds: slot.clientIds || [],
            trainerIds: [schedule.coachId], // Restore coachId as trainerId
            notes: slot.notes,
            activityType: slot.activityType
          };
          
          // Remove locationId
          delete updatedSlot.locationId;
          
          return updatedSlot;
        })
      }));
      
      updateData.days = updatedDays;
      
      await WeeklySchedule.updateOne(
        { _id: schedule._id },
        {
          $set: updateData,
          $unset: { coachId: "" }
        }
      );
      
      console.log(`Rolled back schedule: ${schedule.name}`);
    }
    
    console.log('✅ Rollback completed!');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// CLI runner
if (require.main === module) {
  const command = process.argv[2];
  
  mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/ironlogic')
    .then(async () => {
      console.log('Connected to MongoDB');
      
      if (command === 'rollback') {
        await rollbackCoachBasedSchedules();
      } else {
        await migrateToCoachBasedSchedules();
      }
      
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}