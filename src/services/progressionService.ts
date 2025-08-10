/**
 * Service for managing client program progression
 */

import { Client } from '../mongooseSchemas/Client';
import { Program } from '../mongooseSchemas/Program';
import { IClient } from '../models/Client';
import { IProgram } from '../models/Program';

export interface ProgressionResult {
  client: IClient;
  previousBlock: number;
  previousWeek: number;
  newBlock: number;
  newWeek: number;
  programRestarted: boolean;
}

export interface BulkProgressionResult {
  totalClients: number;
  successfulUpdates: number;
  failedUpdates: number;
  results: ProgressionResult[];
  errors: Array<{ clientId: string; error: string }>;
}

/**
 * Advance a single client's progression by the specified amounts
 */
export async function progressClient(
  clientId: string,
  blockIncrement: number = 0,
  weekIncrement: number = 1
): Promise<ProgressionResult> {
  // Get client with populated program
  const client = await Client.findById(clientId).populate('programId');
  if (!client) {
    throw new Error('Client not found');
  }

  if (!client.programId) {
    throw new Error('Client has no assigned program');
  }

  const program = client.programId as any as IProgram;

  // Store previous values
  const previousBlock = client.currentBlock;
  const previousWeek = client.currentWeek;

  // Calculate new values
  let newBlock = client.currentBlock + blockIncrement;
  let newWeek = client.currentWeek + weekIncrement;
  let programRestarted = false;

  // Handle week overflow
  while (newWeek >= program.blocks[newBlock]?.weeks?.length) {
    if (!program.blocks[newBlock]?.weeks?.length) {
      throw new Error(`Invalid program structure: Block ${newBlock} has no weeks`);
    }
    
    newWeek -= program.blocks[newBlock].weeks.length;
    newBlock++;
  }

  // Handle block overflow - restart program from beginning
  if (newBlock >= program.blocks.length) {
    newBlock = 0;
    newWeek = 0;
    programRestarted = true;
  }

  // Handle negative values (shouldn't happen with current logic, but safety check)
  if (newBlock < 0) newBlock = 0;
  if (newWeek < 0) newWeek = 0;

  // Update client
  client.currentBlock = newBlock;
  client.currentWeek = newWeek;
  client.lastProgressionUpdate = new Date();

  await client.save();

  return {
    client,
    previousBlock,
    previousWeek,
    newBlock,
    newWeek,
    programRestarted
  };
}

/**
 * Get current workout for a client based on their progression
 */
export async function getCurrentWorkout(clientId: string) {
  const client = await Client.findById(clientId).populate('programId');
  if (!client || !client.programId) {
    return null;
  }

  const program = client.programId as any as IProgram;
  
  // Validate progression is within bounds
  if (client.currentBlock >= program.blocks.length) {
    throw new Error('Client block progression is out of bounds');
  }

  const currentBlock = program.blocks[client.currentBlock];
  if (client.currentWeek >= currentBlock.weeks.length) {
    throw new Error('Client week progression is out of bounds');
  }

  const currentWeek = currentBlock.weeks[client.currentWeek];

  return {
    client,
    program,
    currentBlock,
    currentWeek,
    progression: {
      block: client.currentBlock,
      week: client.currentWeek,
      blockName: `Block ${client.currentBlock + 1}`,
      weekName: `Week ${client.currentWeek + 1}`,
      totalBlocks: program.blocks.length,
      totalWeeksInBlock: currentBlock.weeks.length
    }
  };
}

/**
 * Reset client progression to specific block/week
 */
export async function resetClientProgression(
  clientId: string,
  targetBlock: number = 0,
  targetWeek: number = 0
): Promise<ProgressionResult> {
  const client = await Client.findById(clientId).populate('programId');
  if (!client) {
    throw new Error('Client not found');
  }

  if (!client.programId) {
    throw new Error('Client has no assigned program');
  }

  const program = client.programId as any as IProgram;

  // Validate target values
  if (targetBlock >= program.blocks.length || targetBlock < 0) {
    throw new Error(`Invalid target block: ${targetBlock}. Program has ${program.blocks.length} blocks.`);
  }

  if (targetWeek >= program.blocks[targetBlock].weeks.length || targetWeek < 0) {
    throw new Error(`Invalid target week: ${targetWeek}. Block ${targetBlock} has ${program.blocks[targetBlock].weeks.length} weeks.`);
  }

  const previousBlock = client.currentBlock;
  const previousWeek = client.currentWeek;

  client.currentBlock = targetBlock;
  client.currentWeek = targetWeek;
  client.lastProgressionUpdate = new Date();

  await client.save();

  return {
    client,
    previousBlock,
    previousWeek,
    newBlock: targetBlock,
    newWeek: targetWeek,
    programRestarted: false
  };
}

/**
 * Advance all clients in a gym by specified amounts (for testing/manual override)
 */
export async function bulkProgressClients(
  gymId: string,
  blockIncrement: number = 0,
  weekIncrement: number = 1
): Promise<BulkProgressionResult> {
  // Get all active clients with programs in the gym
  const clients = await Client.find({
    gymId,
    membershipStatus: 'active',
    programId: { $exists: true, $ne: null }
  });

  const results: ProgressionResult[] = [];
  const errors: Array<{ clientId: string; error: string }> = [];
  let successfulUpdates = 0;
  let failedUpdates = 0;

  for (const client of clients) {
    try {
      const result = await progressClient(client.id, blockIncrement, weekIncrement);
      results.push(result);
      successfulUpdates++;
    } catch (error) {
      errors.push({
        clientId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      failedUpdates++;
    }
  }

  return {
    totalClients: clients.length,
    successfulUpdates,
    failedUpdates,
    results,
    errors
  };
}

/**
 * Weekly auto-progression for all active clients (called by cron job)
 */
export async function weeklyAutoProgression(): Promise<BulkProgressionResult> {
  console.log('Starting weekly auto-progression...');

  // Get all active clients with programs across all gyms
  const clients = await Client.find({
    membershipStatus: 'active',
    programId: { $exists: true, $ne: null }
  });

  const results: ProgressionResult[] = [];
  const errors: Array<{ clientId: string; error: string }> = [];
  let successfulUpdates = 0;
  let failedUpdates = 0;

  for (const client of clients) {
    try {
      // Advance by 1 week
      const result = await progressClient(client.id, 0, 1);
      results.push(result);
      successfulUpdates++;
      
      console.log(
        `Client ${client.id}: ${result.previousBlock}.${result.previousWeek} → ${result.newBlock}.${result.newWeek}` +
        (result.programRestarted ? ' (program restarted)' : '')
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({
        clientId: client.id,
        error: errorMessage
      });
      failedUpdates++;
      console.error(`Failed to progress client ${client.id}:`, errorMessage);
    }
  }

  console.log(`Weekly auto-progression completed: ${successfulUpdates} successful, ${failedUpdates} failed`);

  return {
    totalClients: clients.length,
    successfulUpdates,
    failedUpdates,
    results,
    errors
  };
}

/**
 * Update client progression when a new program is assigned
 */
export async function resetProgressionForNewProgram(clientId: string): Promise<void> {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  client.currentBlock = 0;
  client.currentWeek = 0;
  client.programStartDate = new Date();
  client.lastProgressionUpdate = new Date();

  await client.save();
}