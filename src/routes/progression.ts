/**
 * Routes for managing client program progression
 */

import express, { RequestHandler } from 'express';
import passport from 'passport';
import { addGymContext, requireGymTrainer, requireGymOwner } from '../middleware/auth';
import {
  progressClient,
  getCurrentWorkout,
  resetClientProgression,
  bulkProgressClients
} from '../services/progressionService';

const router = express.Router({ mergeParams: true });

/**
 * Get current workout for a client
 * GET /api/gyms/:gymId/clients/:clientId/progress
 */
const getClientProgress: RequestHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const workout = await getCurrentWorkout(clientId);

    if (!workout) {
      res.status(404).json({
        success: false,
        message: 'Client not found or has no assigned program'
      });
      return;
    }

    res.json({
      success: true,
      data: workout,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: req.params.gymId
      }
    });
  } catch (error) {
    console.error('Error getting client progress:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get client progress'
    });
  }
};

/**
 * Manually advance a single client's progression
 * POST /api/gyms/:gymId/clients/:clientId/progress/advance
 * Body: { blocks?: number, weeks?: number }
 */
const advanceClientProgress: RequestHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { blocks = 0, weeks = 1 } = req.body;

    // Validate input
    if (typeof blocks !== 'number' || typeof weeks !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Blocks and weeks must be numbers'
      });
      return;
    }

    if (blocks < 0 || weeks < 0) {
      res.status(400).json({
        success: false,
        message: 'Blocks and weeks cannot be negative'
      });
      return;
    }

    const result = await progressClient(clientId, blocks, weeks);

    res.json({
      success: true,
      data: result,
      message: `Client progressed from Block ${result.previousBlock}, Week ${result.previousWeek} to Block ${result.newBlock}, Week ${result.newWeek}` +
        (result.programRestarted ? ' (program restarted)' : ''),
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: req.params.gymId
      }
    });
  } catch (error) {
    console.error('Error advancing client progression:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to advance client progression'
    });
  }
};

/**
 * Reset a client's progression to specific block/week
 * POST /api/gyms/:gymId/clients/:clientId/progress/reset
 * Body: { block?: number, week?: number }
 */
const resetProgress: RequestHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { block = 0, week = 0 } = req.body;

    // Validate input
    if (typeof block !== 'number' || typeof week !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Block and week must be numbers'
      });
      return;
    }

    if (block < 0 || week < 0) {
      res.status(400).json({
        success: false,
        message: 'Block and week cannot be negative'
      });
      return;
    }

    const result = await resetClientProgression(clientId, block, week);

    res.json({
      success: true,
      data: result,
      message: `Client progression reset to Block ${result.newBlock}, Week ${result.newWeek}`,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: req.params.gymId
      }
    });
  } catch (error) {
    console.error('Error resetting client progression:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reset client progression'
    });
  }
};

/**
 * Bulk advance all clients in a gym (for manual override/testing)
 * POST /api/gyms/:gymId/clients/progress/advance-all
 * Body: { blocks?: number, weeks?: number }
 */
const bulkAdvanceProgress: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { blocks = 0, weeks = 1 } = req.body;

    // Validate input
    if (typeof blocks !== 'number' || typeof weeks !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Blocks and weeks must be numbers'
      });
      return;
    }

    if (blocks < 0 || weeks < 0) {
      res.status(400).json({
        success: false,
        message: 'Blocks and weeks cannot be negative'
      });
      return;
    }

    // Additional safety check for bulk operations
    if (blocks > 10 || weeks > 10) {
      res.status(400).json({
        success: false,
        message: 'Bulk advancement is limited to 10 blocks/weeks at a time for safety'
      });
      return;
    }

    const result = await bulkProgressClients(gymId, blocks, weeks);

    res.json({
      success: true,
      data: result,
      message: `Bulk progression completed: ${result.successfulUpdates} clients updated, ${result.failedUpdates} failed`,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: req.params.gymId
      }
    });
  } catch (error) {
    console.error('Error in bulk client progression:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to advance all clients'
    });
  }
};

/**
 * Development-only endpoint for testing weekly progression
 * POST /api/dev/trigger-weekly-progression
 */
const triggerWeeklyProgression: RequestHandler = async (req, res) => {
  try {
    const { weeklyAutoProgression } = await import('../services/progressionService');
    const result = await weeklyAutoProgression();

    res.json({
      success: true,
      data: result,
      message: `Weekly progression test completed: ${result.successfulUpdates} clients updated, ${result.failedUpdates} failed`
    });
  } catch (error) {
    console.error('Error in test weekly progression:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to run weekly progression test'
    });
  }
};

// Route definitions - All routes require JWT authentication
router.get('/gyms/:gymId/clients/:clientId/progress', 
  passport.authenticate('jwt', { session: false }),
  addGymContext as any, 
  requireGymTrainer as any,
  getClientProgress
);

router.post('/gyms/:gymId/clients/:clientId/progress/advance',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any,
  requireGymTrainer as any,
  advanceClientProgress
);

router.post('/gyms/:gymId/clients/:clientId/progress/reset',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any,
  requireGymTrainer as any,
  resetProgress
);

router.post('/gyms/:gymId/clients/progress/advance-all',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any,
  requireGymOwner as any, // Only gym owners can bulk advance
  bulkAdvanceProgress
);

// Development-only route
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/trigger-weekly-progression',
    triggerWeeklyProgression
  );
}

export default router;