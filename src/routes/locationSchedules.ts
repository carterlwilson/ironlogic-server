import express, { RequestHandler } from 'express';
import passport from 'passport';
import WeeklySchedule from '../models/WeeklySchedule';
import { addGymContext, requireGymAccess, requireGymOwner, requireGymTrainer } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all schedules for a location
const getLocationSchedules: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId } = req.params;
    const { isTemplate } = req.query;
    
    let filter: any = { gymId, locationId };
    if (isTemplate !== undefined) {
      filter.isTemplate = isTemplate === 'true';
    }
    
    const schedules = await WeeklySchedule.find(filter)
      .select('-__v').sort({ createdAt: -1 });
    
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

// POST create new schedule (gym owners and trainers)
const createSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId } = req.params;
    const { name, description, days, isTemplate, templateId, weekStartDate } = req.body;
    
    const schedule = await WeeklySchedule.create({
      gymId,
      locationId,
      name,
      description,
      days,
      isTemplate: isTemplate || false,
      templateId,
      weekStartDate
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

// PUT update schedule (gym owners and trainers)
const updateSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { name, description, days, isTemplate, templateId, weekStartDate } = req.body;
    
    const schedule = await WeeklySchedule.findOneAndUpdate(
      { _id: scheduleId, gymId, locationId },
      { name, description, days, isTemplate, templateId, weekStartDate },
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
    
    // Check if client is already enrolled in this specific time slot
    if (timeSlot.clientIds.includes(clientId)) {
      res.status(400).json({
        success: false,
        message: 'Client already enrolled in this time slot'
      });
      return;
    }
    
    // Check for overlapping time conflicts
    const startTime = timeSlot.startTime;
    const endTime = timeSlot.endTime;
    
    // Check all timeslots on the same day for conflicts
    for (const otherSlot of day.timeSlots) {
      if (otherSlot.clientIds.includes(clientId)) {
        // Parse times for comparison (HH:MM format)
        const otherStart = otherSlot.startTime;
        const otherEnd = otherSlot.endTime;
        
        // Check if timeslots overlap
        const currentStart = new Date(`2000-01-01T${startTime}:00`);
        const currentEnd = new Date(`2000-01-01T${endTime}:00`);
        const existingStart = new Date(`2000-01-01T${otherStart}:00`);
        const existingEnd = new Date(`2000-01-01T${otherEnd}:00`);
        
        // Two timeslots overlap if: start1 < end2 && start2 < end1
        if (currentStart < existingEnd && existingStart < currentEnd) {
          res.status(400).json({
            success: false,
            message: `Client already has a conflicting time slot from ${otherStart} to ${otherEnd}`
          });
          return;
        }
      }
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
    
    // If this is a template, also try to sync to corresponding active schedules
    if (schedule.isTemplate) {
      try {
        const activeSchedules = await WeeklySchedule.find({
          gymId,
          locationId,
          isTemplate: false,
          templateId: schedule._id
        });

        for (const activeSchedule of activeSchedules) {
          const activeDay = activeSchedule.days.find(d => d.dayOfWeek === dayOfWeek);
          if (activeDay && activeDay.timeSlots[timeSlotIndex]) {
            const activeTimeSlot = activeDay.timeSlots[timeSlotIndex];
            
            // Only add if there's capacity and client isn't already enrolled
            if (activeTimeSlot.clientIds.length < activeTimeSlot.maxCapacity && 
                !activeTimeSlot.clientIds.includes(clientId)) {
              
              // Check for time conflicts on the same day in active schedule
              const hasConflict = activeDay.timeSlots.some(slot => {
                if (!slot.clientIds.includes(clientId)) return false;
                
                const currentStart = new Date(`2000-01-01T${timeSlot.startTime}:00`);
                const currentEnd = new Date(`2000-01-01T${timeSlot.endTime}:00`);
                const slotStart = new Date(`2000-01-01T${slot.startTime}:00`);
                const slotEnd = new Date(`2000-01-01T${slot.endTime}:00`);
                
                return currentStart < slotEnd && slotStart < currentEnd;
              });
              
              if (!hasConflict) {
                activeTimeSlot.clientIds.push(clientId);
                await activeSchedule.save();
              }
            }
          }
        }
      } catch (syncError) {
        console.error('Error syncing template assignment to active schedules:', syncError);
        // Don't fail the main operation if sync fails
      }
    }
    
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
    
    // If this is a template, also try to sync removal to corresponding active schedules
    if (schedule.isTemplate) {
      try {
        const activeSchedules = await WeeklySchedule.find({
          gymId,
          locationId,
          isTemplate: false,
          templateId: schedule._id
        });

        for (const activeSchedule of activeSchedules) {
          const activeDay = activeSchedule.days.find(d => d.dayOfWeek === dayOfWeek);
          if (activeDay && activeDay.timeSlots[timeSlotIndex]) {
            const activeTimeSlot = activeDay.timeSlots[timeSlotIndex];
            const activeClientIndex = activeTimeSlot.clientIds.indexOf(clientId);
            
            if (activeClientIndex !== -1) {
              activeTimeSlot.clientIds.splice(activeClientIndex, 1);
              await activeSchedule.save();
            }
          }
        }
      } catch (syncError) {
        console.error('Error syncing template unenrollment to active schedules:', syncError);
        // Don't fail the main operation if sync fails
      }
    }
    
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

// POST create active schedule from template
const createActiveFromTemplate: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId } = req.params;
    const { templateId, weekStartDate, name } = req.body;
    
    // Find the template
    const template = await WeeklySchedule.findOne({
      _id: templateId,
      gymId,
      locationId,
      isTemplate: true
    });
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found'
      });
      return;
    }
    
    // Create active schedule from template (preserve client assignments from template)
    const activeDays = template.days.map(day => ({
      dayOfWeek: day.dayOfWeek,
      timeSlots: day.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxCapacity: slot.maxCapacity,
        clientIds: [...slot.clientIds], // Preserve client assignments from template
        // trainerIds removed in coach-based scheduling
        notes: slot.notes,
        activityType: slot.activityType
      }))
    }));
    
    const activeSchedule = await WeeklySchedule.create({
      gymId,
      locationId,
      name: name || `${template.name} - Week of ${new Date(weekStartDate).toLocaleDateString()}`,
      description: template.description,
      days: activeDays,
      isTemplate: false,
      templateId: templateId,
      weekStartDate: new Date(weekStartDate)
    });
    
    res.status(201).json({
      success: true,
      data: activeSchedule
    });
  } catch (error) {
    console.error('Error creating active schedule from template:', error);
    
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

// POST rollover active schedule (reset from template)
const rolloverSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    
    // Find the active schedule
    const activeSchedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId,
      isTemplate: false
    });
    
    if (!activeSchedule) {
      res.status(404).json({
        success: false,
        message: 'Active schedule not found'
      });
      return;
    }
    
    if (!activeSchedule.templateId) {
      res.status(400).json({
        success: false,
        message: 'Cannot rollover schedule without a template reference'
      });
      return;
    }
    
    // Find the template
    const template = await WeeklySchedule.findOne({
      _id: activeSchedule.templateId,
      gymId,
      locationId,
      isTemplate: true
    });
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found for rollover'
      });
      return;
    }
    
    // Reset schedule from template (restore template's client assignments)
    const resetDays = template.days.map(day => ({
      dayOfWeek: day.dayOfWeek,
      timeSlots: day.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxCapacity: slot.maxCapacity,
        clientIds: [...slot.clientIds], // Restore template's client assignments
        // trainerIds removed in coach-based scheduling
        notes: slot.notes,
        activityType: slot.activityType
      }))
    }));
    
    // Update the active schedule with template data
    const updatedSchedule = await WeeklySchedule.findByIdAndUpdate(
      scheduleId,
      { 
        days: resetDays,
        // Optionally update to next week
        weekStartDate: req.body.newWeekStartDate ? new Date(req.body.newWeekStartDate) : activeSchedule.weekStartDate
      },
      { new: true, runValidators: true }
    ).select('-__v');
    
    res.json({
      success: true,
      data: updatedSchedule,
      message: 'Schedule rolled over successfully'
    });
  } catch (error) {
    console.error('Error rolling over schedule:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST client self-enrollment in a time slot
const selfEnrollClient: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex } = req.body;
    const clientId = (req.user as any).client?.id; // Client can only enroll themselves
    
    // Ensure only clients can use this endpoint
    if (req.gymContext?.userRole !== 'client') {
      res.status(403).json({
        success: false,
        message: 'This endpoint is only available for clients'
      });
      return;
    }
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId,
      isTemplate: false // Clients can only enroll in active schedules
    });
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Active schedule not found'
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
    
    // Check if client is already enrolled in this specific time slot
    if (timeSlot.clientIds.includes(clientId)) {
      res.status(400).json({
        success: false,
        message: 'You are already enrolled in this time slot'
      });
      return;
    }
    
    // Check for overlapping time conflicts across ALL active schedules in the gym
    const allActiveSchedules = await WeeklySchedule.find({
      gymId,
      isTemplate: false
    });
    
    for (const otherSchedule of allActiveSchedules) {
      const sameDayInOtherSchedule = otherSchedule.days.find(d => d.dayOfWeek === dayOfWeek);
      if (sameDayInOtherSchedule) {
        for (const otherSlot of sameDayInOtherSchedule.timeSlots) {
          if (otherSlot.clientIds.includes(clientId)) {
            // Parse times for comparison (HH:MM format)
            const currentStart = new Date(`2000-01-01T${timeSlot.startTime}:00`);
            const currentEnd = new Date(`2000-01-01T${timeSlot.endTime}:00`);
            const existingStart = new Date(`2000-01-01T${otherSlot.startTime}:00`);
            const existingEnd = new Date(`2000-01-01T${otherSlot.endTime}:00`);
            
            // Two timeslots overlap if: start1 < end2 && start2 < end1
            if (currentStart < existingEnd && existingStart < currentEnd) {
              res.status(400).json({
                success: false,
                message: `You have a conflicting class from ${otherSlot.startTime} to ${otherSlot.endTime}`
              });
              return;
            }
          }
        }
      }
    }
    
    // Check capacity
    if (timeSlot.clientIds.length >= timeSlot.maxCapacity) {
      res.status(400).json({
        success: false,
        message: 'This class is at maximum capacity'
      });
      return;
    }
    
    // Add client to the time slot
    timeSlot.clientIds.push(clientId);
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Successfully enrolled in class',
      data: schedule
    });
  } catch (error) {
    console.error('Error in self-enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE client self-unenrollment from a time slot
const selfUnenrollClient: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex } = req.body;
    const clientId = (req.user as any).client?.id; // Client can only unenroll themselves
    
    // Ensure only clients can use this endpoint
    if (req.gymContext?.userRole !== 'client') {
      res.status(403).json({
        success: false,
        message: 'This endpoint is only available for clients'
      });
      return;
    }
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId,
      isTemplate: false // Clients can only unenroll from active schedules
    });
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Active schedule not found'
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
        message: 'You are not enrolled in this time slot'
      });
      return;
    }
    
    // Remove client from the time slot
    timeSlot.clientIds.splice(clientIndex, 1);
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Successfully unenrolled from class',
      data: schedule
    });
  } catch (error) {
    console.error('Error in self-unenrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions (all routes are gym and location scoped)
// All routes require JWT authentication
router.get('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getLocationSchedules);
router.get('/:scheduleId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getScheduleById);
router.post('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, createSchedule);
router.post('/active-from-template', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, createActiveFromTemplate);
router.put('/:scheduleId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, updateSchedule);
router.post('/:scheduleId/rollover', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, rolloverSchedule);
router.delete('/:scheduleId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, deleteSchedule);
router.post('/:scheduleId/enroll', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, enrollClient);
router.delete('/:scheduleId/unenroll', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, unenrollClient);

// Client-only routes for self-enrollment
router.post('/:scheduleId/self-enroll', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, selfEnrollClient);
router.delete('/:scheduleId/self-unenroll', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, selfUnenrollClient);

export default router;