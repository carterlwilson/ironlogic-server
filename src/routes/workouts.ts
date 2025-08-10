import express, { RequestHandler } from 'express';
import passport from 'passport';
import { addGymContext, requireGymAccess } from '../middleware/auth';
import {
  getCurrentWorkout,
  createWorkoutSession,
  completeSet,
  getWorkoutSession,
  endWorkoutSession
} from '../services/workoutService';

const router = express.Router();

/**
 * GET /api/gyms/:gymId/clients/:clientId/current-workout
 * Get current workout data for a client
 */
const getCurrentWorkoutHandler: RequestHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const workoutData = await getCurrentWorkout(clientId);
    
    if (!workoutData) {
      res.status(404).json({
        success: false,
        message: 'No current workout found for client'
      });
      return;
    }

    res.json({
      success: true,
      data: workoutData,
      meta: {
        userRole: (req as any).gymRole,
        gymId: req.params.gymId
      }
    });
  } catch (error: any) {
    console.error('Error fetching current workout:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch current workout'
    });
  }
};

router.get('/gyms/:gymId/clients/:clientId/current-workout', 
  passport.authenticate('jwt', { session: false }),
  addGymContext as any, 
  requireGymAccess as any,
  getCurrentWorkoutHandler
);

/**
 * POST /api/gyms/:gymId/clients/:clientId/workout-sessions
 * Create a new workout session
 */
const createWorkoutSessionHandler: RequestHandler = async (req, res) => {
  try {
    const { gymId, clientId } = req.params;
    const { programId, block, week, day } = req.body;

    const session = await createWorkoutSession(
      clientId,
      gymId,
      programId,
      block,
      week,
      day || 0
    );

    res.json({
      success: true,
      data: session,
      meta: {
        userRole: (req as any).gymRole,
        gymId
      }
    });
  } catch (error: any) {
    console.error('Error creating workout session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create workout session'
    });
  }
};

router.post('/gyms/:gymId/clients/:clientId/workout-sessions',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any, 
  requireGymAccess as any,
  createWorkoutSessionHandler
);

/**
 * PUT /api/gyms/:gymId/clients/:clientId/workout-sessions/:sessionId/sets
 * Complete a set in a workout session
 */
const completeSetHandler: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { activityId, setNumber } = req.body;

    if (!activityId || !setNumber) {
      res.status(400).json({
        success: false,
        message: 'activityId and setNumber are required'
      });
      return;
    }

    const result = await completeSet(sessionId, activityId, setNumber);

    res.json({
      success: true,
      data: result,
      meta: {
        userRole: (req as any).gymRole,
        gymId: req.params.gymId
      }
    });
  } catch (error: any) {
    console.error('Error completing set:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete set'
    });
  }
};

router.put('/gyms/:gymId/clients/:clientId/workout-sessions/:sessionId/sets',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any, 
  requireGymAccess as any,
  completeSetHandler
);

/**
 * GET /api/gyms/:gymId/clients/:clientId/workout-sessions/:sessionId
 * Get workout session details
 */
const getWorkoutSessionHandler: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await getWorkoutSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Workout session not found'
      });
      return;
    }

    res.json({
      success: true,
      data: session,
      meta: {
        userRole: (req as any).gymRole,
        gymId: req.params.gymId
      }
    });
  } catch (error: any) {
    console.error('Error fetching workout session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch workout session'
    });
  }
};

router.get('/gyms/:gymId/clients/:clientId/workout-sessions/:sessionId',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any, 
  requireGymAccess as any,
  getWorkoutSessionHandler
);

/**
 * PUT /api/gyms/:gymId/clients/:clientId/workout-sessions/:sessionId/end
 * End a workout session
 */
const endWorkoutSessionHandler: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await endWorkoutSession(sessionId);

    res.json({
      success: true,
      data: session,
      meta: {
        userRole: (req as any).gymRole,
        gymId: req.params.gymId
      }
    });
  } catch (error: any) {
    console.error('Error ending workout session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to end workout session'
    });
  }
};

router.put('/gyms/:gymId/clients/:clientId/workout-sessions/:sessionId/end',
  passport.authenticate('jwt', { session: false }),
  addGymContext as any, 
  requireGymAccess as any,
  endWorkoutSessionHandler
);

export default router;