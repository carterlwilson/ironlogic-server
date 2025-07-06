import express, { RequestHandler } from 'express';
import WeeklySchedule from '../models/WeeklySchedule';
import { isAuthenticatedAsAdmin, isAuthenticated } from '../middleware/auth';

const router = express.Router();

// GET all weekly schedules (admin only)
const getAllWeeklySchedules: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { isBaseline } = req.query;
    
    let filter: any = {};
    if (isBaseline !== undefined) {
      filter.isBaseline = isBaseline === 'true';
    }
    
    const weeklySchedules = await WeeklySchedule.find(filter)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: weeklySchedules.length,
      data: weeklySchedules
    });
  } catch (error) {
    console.error('Error fetching weekly schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single weekly schedule by ID
const getWeeklyScheduleById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const weeklySchedule = await WeeklySchedule.findById(req.params.id);
    
    if (!weeklySchedule) {
      res.status(404).json({
        success: false,
        message: 'Weekly schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: weeklySchedule
    });
  } catch (error) {
    console.error('Error fetching weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new weekly schedule (admin only)
const createWeeklySchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const weeklySchedule = await WeeklySchedule.create(req.body);
    
    const populatedSchedule = await WeeklySchedule.findById(weeklySchedule.id);
    
    res.status(201).json({
      success: true,
      data: populatedSchedule
    });
  } catch (error) {
    console.error('Error creating weekly schedule:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      const messages = Object.values((error as any).errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PUT update weekly schedule
const updateWeeklySchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const weeklySchedule = await WeeklySchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!weeklySchedule) {
      res.status(404).json({
        success: false,
        message: 'Weekly schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: weeklySchedule
    });
  } catch (error) {
    console.error('Error updating weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PUT update current schedule (any authenticated user)
const updateCurrentSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    // Find the current schedule (most recent non-baseline)
    const currentSchedule = await WeeklySchedule.findOne({ isBaseline: false })
      .sort({ createdAt: -1 });
    
    if (!currentSchedule) {
      res.status(404).json({
        success: false,
        message: 'No current schedule found'
      });
      return;
    }
    
    // Update the current schedule, but ensure it stays as current (not baseline)
    const updateData = { ...req.body, isBaseline: false };
    
    const updatedSchedule = await WeeklySchedule.findByIdAndUpdate(
      currentSchedule.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating current schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE weekly schedule (admin only)
const deleteWeeklySchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const weeklySchedule = await WeeklySchedule.findByIdAndDelete(req.params.id);
    
    if (!weeklySchedule) {
      res.status(404).json({
        success: false,
        message: 'Weekly schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Weekly schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting weekly schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET baseline schedule
const getBaselineSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const baselineSchedule = await WeeklySchedule.findOne({ isBaseline: true });
    
    if (!baselineSchedule) {
      res.status(404).json({
        success: false,
        message: 'No baseline schedule found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: baselineSchedule
    });
  } catch (error) {
    console.error('Error fetching baseline schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET current schedule (first non-baseline schedule found)
const getCurrentSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const currentSchedule = await WeeklySchedule.findOne({ isBaseline: false })
      .sort({ createdAt: -1 }); // Get the most recent current schedule
    
    if (!currentSchedule) {
      res.status(404).json({
        success: false,
        message: 'No current schedule found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: currentSchedule
    });
  } catch (error) {
    console.error('Error fetching current schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create baseline from existing schedule
const createBaselineFromSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { scheduleId } = req.params;
    
    // Get the existing schedule
    const existingSchedule = await WeeklySchedule.findById(scheduleId);
    if (!existingSchedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    // Remove any existing baseline
    await WeeklySchedule.updateMany({}, { isBaseline: false });
    
    // Create a new baseline schedule
    const baselineSchedule = new WeeklySchedule({
      name: existingSchedule.name,
      description: existingSchedule.description,
      days: existingSchedule.days,
      isBaseline: true
    });
    
    await baselineSchedule.save();
    
    const populatedSchedule = await WeeklySchedule.findById(baselineSchedule.id);
    
    res.status(201).json({
      success: true,
      data: populatedSchedule
    });
  } catch (error) {
    console.error('Error creating baseline schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', isAuthenticatedAsAdmin as any, getAllWeeklySchedules);
router.get('/baseline', getBaselineSchedule);
router.get('/current', isAuthenticated as any, getCurrentSchedule);
router.get('/:id', getWeeklyScheduleById);
router.post('/', isAuthenticatedAsAdmin as any, createWeeklySchedule);
router.post('/baseline/:scheduleId', isAuthenticatedAsAdmin as any, createBaselineFromSchedule);
router.put('/current', isAuthenticated as any, updateCurrentSchedule);
router.put('/:id', isAuthenticatedAsAdmin as any, updateWeeklySchedule);
router.delete('/:id', isAuthenticatedAsAdmin as any, deleteWeeklySchedule);

export default router; 