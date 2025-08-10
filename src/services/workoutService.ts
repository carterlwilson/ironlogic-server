import { WorkoutSession } from '../mongooseSchemas/WorkoutSession';
import { Client } from '../mongooseSchemas/Client';
import { Program } from '../mongooseSchemas/Program';
import { IWorkoutSession, CompletedSet } from '../models/WorkoutSession';

export interface CurrentWorkoutData {
  client: any;
  program: any;
  currentBlock: any;
  currentWeek: any;
  currentDay: any;
  activities: any[];
  allDays: any[];
  session?: IWorkoutSession;
}

export interface SetCompletionResult {
  success: boolean;
  session: IWorkoutSession;
  exerciseCompleted: boolean;
  nextExerciseId?: string;
}

/**
 * Get current workout data for a client
 */
export async function getCurrentWorkout(userIdOrClientId: string): Promise<CurrentWorkoutData | null> {
  console.log('getCurrentWorkout called for userIdOrClientId:', userIdOrClientId);
  
  // Try to find client by ID first, then by userId - include current benchmarks
  let client = await Client.findById(userIdOrClientId)
    .populate('programId')
    .populate('currentBenchmarks.benchmarkTemplateId');
  
  if (!client) {
    // If not found by ID, try to find by userId (for when user ID is passed instead of client ID)
    client = await Client.findOne({ userId: userIdOrClientId })
      .populate('programId')
      .populate('currentBenchmarks.benchmarkTemplateId');
    console.log('Client found by userId:', client ? { id: client.id, userId: client.userId, programId: client.programId, currentBlock: client.currentBlock, currentWeek: client.currentWeek } : 'null');
  } else {
    console.log('Client found by ID:', client ? { id: client.id, programId: client.programId, currentBlock: client.currentBlock, currentWeek: client.currentWeek } : 'null');
  }
  
  if (!client) {
    console.log('Client not found');
    return null;
  }
  
  if (!client.programId) {
    console.log('Client has no programId assigned');
    return null;
  }

  // Get full program with populated structure
  const program = await Program.findById(client.programId)
    .populate({
      path: 'blocks.weeks.days.primaryLiftActivities',
      populate: {
        path: 'activityGroup benchmarkTemplate'
      }
    })
    .populate({
      path: 'blocks.weeks.days.accessoryLiftActivities',
      populate: {
        path: 'activityGroup benchmarkTemplate'
      }
    })
    .populate({
      path: 'blocks.weeks.days.otherActivities',
      populate: {
        path: 'activityGroup benchmarkTemplate'
      }
    });

  console.log('Program found:', program ? { id: program.id, name: program.name, blocksLength: program.blocks?.length } : 'null');

  if (!program) {
    console.log('Program not found');
    return null;
  }
  
  if (!program.blocks) {
    console.log('Program has no blocks');
    return null;
  }

  // Get current block, week, and day
  console.log('Looking for block at index:', client.currentBlock, 'total blocks:', program.blocks.length);
  const currentBlock = program.blocks[client.currentBlock];
  if (!currentBlock) {
    console.log('Current block not found at index:', client.currentBlock);
    return null;
  }

  console.log('Looking for week at index:', client.currentWeek, 'total weeks:', currentBlock.weeks?.length);
  const currentWeek = currentBlock.weeks[client.currentWeek];
  if (!currentWeek) {
    console.log('Current week not found at index:', client.currentWeek);
    return null;
  }

  // Helper function to calculate recommended weight for an activity
  const calculateActivityWeight = (activity: any): number | null => {
    // Only calculate for activities with percentOfMax and benchmarkTemplateId
    if (!activity.percentOfMax || !activity.benchmarkTemplateId || !client.currentBenchmarks) {
      return null;
    }
    
    // Find matching benchmark by benchmarkTemplateId
    const benchmark = client.currentBenchmarks.find((b: any) => 
      b.benchmarkTemplateId && 
      b.benchmarkTemplateId._id.toString() === activity.benchmarkTemplateId.toString()
    );
    
    if (!benchmark || !benchmark.weight) {
      return null;
    }
    
    // Calculate weight: benchmark weight * percentage (percentOfMax is already in decimal or needs conversion)
    const percentage = activity.percentOfMax > 1 ? activity.percentOfMax / 100 : activity.percentOfMax;
    return benchmark.weight * percentage;
  };

  // Get the current day (default to day 0) but also return all days
  console.log('Looking for day at index 0, total days:', currentWeek.days?.length);
  const currentDay = currentWeek.days[0];
  if (!currentDay) {
    console.log('Current day not found at index 0');
    return null;
  }

  // Process all days with their activities and calculated weights
  const allDays = currentWeek.days.map((day: any, dayIndex: number) => {
    const dayActivities = [
      ...(day.primaryLiftActivities || []).map((activity: any) => ({
        ...activity.toObject(),
        calculatedWeight: calculateActivityWeight(activity)
      })),
      ...(day.accessoryLiftActivities || []).map((activity: any) => ({
        ...activity.toObject(),
        calculatedWeight: calculateActivityWeight(activity)
      })),
      ...(day.otherActivities || []).map((activity: any) => ({
        ...activity.toObject(),
        calculatedWeight: calculateActivityWeight(activity)
      }))
    ];

    return {
      ...day.toObject(),
      dayIndex,
      activities: dayActivities
    };
  });

  // Combine all activities from the day and add calculated weights
  const activities = [
    ...(currentDay.primaryLiftActivities || []).map((activity: any) => ({
      ...activity.toObject(),
      calculatedWeight: calculateActivityWeight(activity)
    })),
    ...(currentDay.accessoryLiftActivities || []).map((activity: any) => ({
      ...activity.toObject(),
      calculatedWeight: calculateActivityWeight(activity)
    })),
    ...(currentDay.otherActivities || []).map((activity: any) => ({
      ...activity.toObject(),
      calculatedWeight: calculateActivityWeight(activity)
    }))
  ];

  // Get current active workout session if exists
  const session = await WorkoutSession.findOne({
    clientId: client.id,
    gymId: client.gymId,
    block: client.currentBlock,
    week: client.currentWeek,
    day: 0,
    isActive: true
  });

  return {
    client,
    program,
    currentBlock,
    currentWeek,
    currentDay,
    activities,
    allDays,
    session: session || undefined
  };
}

/**
 * Create a new workout session
 */
export async function createWorkoutSession(
  clientId: string,
  gymId: string,
  programId: string,
  block: number,
  week: number,
  day: number
): Promise<IWorkoutSession> {
  // Deactivate any existing sessions for this client
  await WorkoutSession.updateMany(
    { clientId, isActive: true },
    { isActive: false, completedAt: new Date() }
  );

  // Create new session
  const session = new WorkoutSession({
    clientId,
    gymId,
    programId,
    block,
    week,
    day,
    completedSets: [],
    isActive: true
  });

  await session.save();
  return session.toObject();
}

/**
 * Complete a set for an exercise
 */
export async function completeSet(
  sessionId: string,
  activityId: string,
  setNumber: number
): Promise<SetCompletionResult> {
  const session = await WorkoutSession.findById(sessionId);
  if (!session) {
    throw new Error('Workout session not found');
  }

  // Check if this set is already completed
  const existingSet = session.completedSets.find(
    set => set.activityId === activityId && set.setNumber === setNumber
  );

  if (existingSet) {
    return {
      success: false,
      session: session.toObject(),
      exerciseCompleted: false
    };
  }

  // Add completed set
  const completedSet: CompletedSet = {
    activityId,
    setNumber,
    completedAt: new Date()
  };

  session.completedSets.push(completedSet);
  await session.save();

  // Get current workout data to check if exercise is completed
  const workoutData = await getCurrentWorkout(session.clientId);
  if (!workoutData) {
    throw new Error('Could not load workout data');
  }

  // Find the activity and check if all sets are completed
  const activity = workoutData.activities.find(a => a.id === activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  const totalSets = activity.sets || 1;
  const completedSetsForActivity = session.completedSets.filter(
    set => set.activityId === activityId
  ).length;

  const exerciseCompleted = completedSetsForActivity >= totalSets;

  // If exercise is completed, find next exercise
  let nextExerciseId: string | undefined;
  if (exerciseCompleted) {
    const currentActivityIndex = workoutData.activities.findIndex(a => a.id === activityId);
    const nextActivity = workoutData.activities[currentActivityIndex + 1];
    nextExerciseId = nextActivity?.id;
  }

  return {
    success: true,
    session: session.toObject(),
    exerciseCompleted,
    nextExerciseId
  };
}

/**
 * Get workout session by ID
 */
export async function getWorkoutSession(sessionId: string): Promise<IWorkoutSession | null> {
  const session = await WorkoutSession.findById(sessionId);
  return session ? session.toObject() : null;
}

/**
 * End a workout session
 */
export async function endWorkoutSession(sessionId: string): Promise<IWorkoutSession> {
  const session = await WorkoutSession.findById(sessionId);
  if (!session) {
    throw new Error('Workout session not found');
  }

  session.isActive = false;
  session.completedAt = new Date();
  await session.save();

  return session.toObject();
}