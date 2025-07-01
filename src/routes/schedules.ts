import express, { RequestHandler } from 'express';
import { Schedule } from '../mongooseSchemas/Schedule';
import { ISchedule } from '../models/Schedule';

const router = express.Router();

// GET all schedules
const getAllSchedules: RequestHandler = async (req, res): Promise<void> => {
  try {
    const schedules = await Schedule.find().select('-__v');
    
    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single schedule by ID
const getScheduleById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const schedule = await Schedule.findById(req.params.id).select('-__v');
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new schedule
const createSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { name, blocks } = req.body;
    
    const schedule = await Schedule.create({
      name,
      blocks: blocks || []
    });
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    
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

// PUT update schedule
const updateSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { name, blocks } = req.body;
    
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      { name, blocks },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update schedule
const patchSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error patching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE schedule
const deleteSchedule: RequestHandler = async (req, res): Promise<void> => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllSchedules);
router.get('/:id', getScheduleById);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);
router.patch('/:id', patchSchedule);
router.delete('/:id', deleteSchedule);

export default router; 