import express, { RequestHandler } from 'express';
import WeeklySchedule from '../models/WeeklySchedule';
import { addGymContext, requireGymAccess, requireGymOwner } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all schedules for a location
const getLocationSchedules: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId } = req.params;
    
    const schedules = await WeeklySchedule.find({ 
      gymId,
      locationId 
    }).select('-__v').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: schedules.length,
      data: schedules,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        locationId: locationId
      }
    });
  } catch (error) {
    console.error('Error fetching location schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single schedule by ID
const getScheduleById: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId
    }).select('-__v');
    
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

// POST create new schedule (gym owners only)
const createSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId } = req.params;
    const { name, description, days } = req.body;
    
    const schedule = await WeeklySchedule.create({
      gymId,
      locationId,
      name,
      description,
      days
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

// PUT update schedule (gym owners only)
const updateSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { name, description, days } = req.body;
    
    const schedule = await WeeklySchedule.findOneAndUpdate(
      { _id: scheduleId, gymId, locationId },
      { name, description, days },
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

// DELETE schedule (gym owners only)
const deleteSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    
    const schedule = await WeeklySchedule.findOneAndDelete({
      _id: scheduleId,
      gymId,
      locationId
    });
    
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

// POST enroll client in a time slot
const enrollClient: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex, clientId } = req.body;
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId
    });
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    // Find the specific day and time slot
    const day = schedule.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!day || !day.timeSlots[timeSlotIndex]) {
      res.status(400).json({
        success: false,
        message: 'Invalid day or time slot'
      });
      return;
    }
    
    const timeSlot = day.timeSlots[timeSlotIndex];
    
    // Check if client is already enrolled
    if (timeSlot.clientIds.includes(clientId)) {
      res.status(400).json({
        success: false,
        message: 'Client already enrolled in this time slot'
      });
      return;
    }
    
    // Check capacity
    if (timeSlot.clientIds.length >= timeSlot.maxCapacity) {
      res.status(400).json({
        success: false,
        message: 'Time slot is at maximum capacity'
      });
      return;
    }
    
    // Add client to the time slot
    timeSlot.clientIds.push(clientId);
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Client enrolled successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error enrolling client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE unenroll client from a time slot
const unenrollClient: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex, clientId } = req.body;
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId
    });
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    // Find the specific day and time slot
    const day = schedule.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!day || !day.timeSlots[timeSlotIndex]) {
      res.status(400).json({
        success: false,
        message: 'Invalid day or time slot'
      });
      return;
    }
    
    const timeSlot = day.timeSlots[timeSlotIndex];
    
    // Check if client is enrolled
    const clientIndex = timeSlot.clientIds.indexOf(clientId);
    if (clientIndex === -1) {
      res.status(400).json({
        success: false,
        message: 'Client not enrolled in this time slot'
      });
      return;
    }
    
    // Remove client from the time slot
    timeSlot.clientIds.splice(clientIndex, 1);
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Client unenrolled successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error unenrolling client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions (all routes are gym and location scoped)
router.get('/', addGymContext as any, requireGymAccess as any, getLocationSchedules);
router.get('/:scheduleId', addGymContext as any, requireGymAccess as any, getScheduleById);
router.post('/', addGymContext as any, requireGymOwner as any, createSchedule);
router.put('/:scheduleId', addGymContext as any, requireGymOwner as any, updateSchedule);
router.delete('/:scheduleId', addGymContext as any, requireGymOwner as any, deleteSchedule);
router.post('/:scheduleId/enroll', addGymContext as any, requireGymAccess as any, enrollClient);
router.delete('/:scheduleId/unenroll', addGymContext as any, requireGymAccess as any, unenrollClient);

export default router;