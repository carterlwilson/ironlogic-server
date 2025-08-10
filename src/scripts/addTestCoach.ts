import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { Gym } from '../mongooseSchemas/Gym';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to add a test coach to the development gym
 */
async function addTestCoach() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/ironlogic');
    console.log('Connected to MongoDB');

    // Find the first gym (assuming there's only one for testing)
    const gym = await Gym.findOne({});
    if (!gym) {
      console.error('No gym found in database. Please create a gym first.');
      return;
    }

    console.log(`Found gym: ${gym.name} (${(gym._id as any).toString()})`);

    // Check if test coach already exists
    const existingUser = await User.findOne({ email: 'coach@testgym.com' });
    if (existingUser) {
      console.log('Test coach already exists:', existingUser.email);
      
      // Check if they already have a gym membership
      const existingMembership = await GymMembership.findOne({
        userId: existingUser._id,
        gymId: (gym._id as any).toString()
      });
      
      if (existingMembership) {
        console.log('Test coach already has membership in this gym with role:', existingMembership.role);
        return;
      } else {
        console.log('Adding gym membership for existing test coach...');
        
        await GymMembership.create({
          userId: existingUser._id,
          gymId: (gym._id as any).toString(),
          role: 'trainer',
          status: 'active',
          joinedAt: new Date()
        });
        
        console.log('✅ Added gym membership for existing test coach');
        return;
      }
    }

    // Create new test coach user
    console.log('Creating new test coach user...');
    
    const hashedPassword = await bcrypt.hash('testpassword', 12);
    
    const newCoach = await User.create({
      email: 'coach@testgym.com',
      password: hashedPassword,
      name: 'Test Coach',
      role: 'user', // System role
      isActive: true
    });

    console.log('✅ Created test coach user:', newCoach.email);

    // Add gym membership with trainer role
    console.log('Creating gym membership...');
    
    await GymMembership.create({
      userId: newCoach._id,
      gymId: (gym._id as any).toString(),
      role: 'trainer',
      status: 'active',
      joinedAt: new Date()
    });

    console.log('✅ Created gym membership with trainer role');

    // Summary
    console.log('\n🎉 Test coach setup complete!');
    console.log('Login credentials:');
    console.log('  Email: coach@testgym.com');
    console.log('  Password: testpassword');
    console.log(`  Gym: ${gym.name}`);
    console.log('  Role: trainer');

  } catch (error) {
    console.error('❌ Error adding test coach:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  addTestCoach()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { addTestCoach };