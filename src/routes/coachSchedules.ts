import express, { RequestHandler } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import WeeklySchedule from '../models/WeeklySchedule';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { addGymContext, requireGymAccess, requireGymOwner, requireGymTrainer } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all coaches for a gym
const getGymCoaches: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;
    
    // Find all users with trainer or owner role in this gym
    const memberships = await GymMembership.find({
      gymId,
      role: { $in: ['owner', 'trainer'] },
      status: 'active'
    }).populate('userId');
    
    const coaches = await Promise.all(
      memberships.map(async (membership) => {
        const user = await User.findById(membership.userId);
        if (!user) return null;
        
        // Count schedules for this coach
        const scheduleCount = await WeeklySchedule.countDocuments({
          gymId,
          coachId: (user._id as any).toString()
        });
        
        return {
          id: (user._id as any).toString(),
          name: user.name,
          email: user.email,
          role: membership.role,
          scheduleCount
        };
      })
    );
    
    const validCoaches = coaches.filter(coach => coach !== null);
    
    res.json({
      success: true,
      count: validCoaches.length,
      data: validCoaches,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId
      }
    });
  } catch (error) {
    console.error('Error fetching gym coaches:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET all schedules for a specific coach
const getCoachSchedules: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId } = req.params;
    const { isTemplate } = req.query;
    
    // Verify coach exists and has access to this gym
    const membership = await GymMembership.findOne({
      userId: coachId,
      gymId,
      role: { $in: ['owner', 'trainer'] },
      status: 'active'
    });
    
    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Coach not found or not authorized for this gym'
      });
      return;
    }
    
    // Check authorization - coaches can only see their own schedules unless user is owner
    if (req.gymContext?.userRole !== 'owner' && (req.user as any)?._id?.toString() !== coachId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view these schedules'
      });
      return;
    }
    
    let filter: any = { gymId, coachId };
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
        coachId: coachId
      }
    });
  } catch (error) {
    console.error('Error fetching coach schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single schedule by ID for a coach
const getCoachScheduleById: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId, scheduleId } = req.params;
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      coachId
    }).select('-__v');
    
    if (!schedule) {
      res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
      return;
    }
    
    // Check authorization
    if (req.gymContext?.userRole !== 'owner' && (req.user as any)?._id?.toString() !== coachId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this schedule'
      });
      return;
    }
    
    res.json({
      success: true,
      data: schedule,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        coachId: coachId
      }
    });
  } catch (error) {
    console.error('Error fetching coach schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new schedule for a coach
const createCoachSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId } = req.params;
    const { name, description, days, isTemplate, templateId, weekStartDate } = req.body;
    
    // Verify coach exists and has access to this gym
    const membership = await GymMembership.findOne({
      userId: coachId,
      gymId,
      role: { $in: ['owner', 'trainer'] },
      status: 'active'
    });
    
    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Coach not found or not authorized for this gym'
      });
      return;
    }
    
    // Check authorization - coaches can only create their own schedules unless user is owner
    if (req.gymContext?.userRole !== 'owner' && (req.user as any)?._id?.toString() !== coachId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to create schedules for this coach'
      });
      return;
    }
    
    // Validate that all time slots have locationId
    if (days) {
      for (const day of days) {
        for (const slot of day.timeSlots || []) {
          if (!slot.locationId) {
            res.status(400).json({
              success: false,
              message: 'All time slots must have a locationId specified'
            });
            return;
          }
        }
      }
    }
    
    const schedule = await WeeklySchedule.create({
      gymId,
      coachId,
      name,
      description,
      days,
      isTemplate: isTemplate || false,
      templateId,
      weekStartDate
    });
    
    res.status(201).json({
      success: true,
      data: schedule,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        coachId: coachId
      }
    });
  } catch (error) {
    console.error('Error creating coach schedule:', error);
    
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

// PUT update schedule for a coach
const updateCoachSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId, scheduleId } = req.params;
    const { name, description, days, isTemplate, templateId, weekStartDate } = req.body;
    
    // Check authorization
    if (req.gymContext?.userRole !== 'owner' && (req.user as any)?._id?.toString() !== coachId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this schedule'
      });
      return;
    }
    
    // Validate that all time slots have locationId
    if (days) {
      for (const day of days) {
        for (const slot of day.timeSlots || []) {
          if (!slot.locationId) {
            res.status(400).json({
              success: false,
              message: 'All time slots must have a locationId specified'
            });
            return;
          }
        }
      }
    }
    
    const schedule = await WeeklySchedule.findOneAndUpdate(
      { _id: scheduleId, gymId, coachId },
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
      data: schedule,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        coachId: coachId
      }
    });
  } catch (error) {
    console.error('Error updating coach schedule:', error);
    
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

// DELETE schedule for a coach (owners and the coach themselves)
const deleteCoachSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId, scheduleId } = req.params;
    
    // Check authorization
    if (req.gymContext?.userRole !== 'owner' && (req.user as any)?._id?.toString() !== coachId) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this schedule'
      });
      return;
    }
    
    const schedule = await WeeklySchedule.findOneAndDelete({
      _id: scheduleId,
      gymId,
      coachId
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
    console.error('Error deleting coach schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST enroll client in a time slot
const enrollClientInCoachSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex, clientId } = req.body;
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      coachId
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
    
    // Check for overlapping time conflicts across ALL schedules in the gym
    const allSchedules = await WeeklySchedule.find({
      gymId,
      isTemplate: false
    });
    
    for (const otherSchedule of allSchedules) {
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
                message: `Client already has a conflicting time slot from ${otherSlot.startTime} to ${otherSlot.endTime}`
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
    console.error('Error enrolling client in coach schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE unenroll client from a time slot
const unenrollClientFromCoachSchedule: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex, clientId } = req.body;
    
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      coachId
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
    console.error('Error unenrolling client from coach schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST add new coach to gym (owners only)
const addCoachToGym: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { email, name, password, role } = req.body;
    
    // Validate required fields
    if (!email || !name || !password || !role) {
      res.status(400).json({
        success: false,
        message: 'Email, name, password, and role are required'
      });
      return;
    }
    
    // Validate role
    if (!['trainer', 'owner'].includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Role must be either "trainer" or "owner"'
      });
      return;
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    let user = existingUser;
    
    if (!user) {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);
      user = await User.create({
        email,
        name,
        password: hashedPassword,
        role: 'user', // System role
        isActive: true
      });
    }
    
    // Check if user already has membership in this gym
    const existingMembership = await GymMembership.findOne({
      userId: (user._id as any).toString(),
      gymId
    });
    
    if (existingMembership) {
      res.status(400).json({
        success: false,
        message: 'User already has a membership in this gym'
      });
      return;
    }
    
    // Create gym membership
    await GymMembership.create({
      userId: (user._id as any).toString(),
      gymId,
      role,
      status: 'active',
      joinedAt: new Date()
    });
    
    // Count schedules for this coach
    const scheduleCount = await WeeklySchedule.countDocuments({
      gymId,
      coachId: (user._id as any).toString()
    });
    
    const coachData = {
      id: (user._id as any).toString(),
      name: user.name,
      email: user.email,
      role,
      scheduleCount
    };
    
    res.status(201).json({
      success: true,
      data: coachData,
      message: 'Coach added successfully'
    });
  } catch (error) {
    console.error('Error adding coach:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PUT update coach information (owners only)
const updateCoach: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId } = req.params;
    const { name, role } = req.body;
    
    // Find the user
    const user = await User.findById(coachId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
      return;
    }
    
    // Find gym membership
    const membership = await GymMembership.findOne({
      userId: coachId,
      gymId
    });
    
    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Coach membership not found in this gym'
      });
      return;
    }
    
    // Update user name if provided
    if (name && name !== user.name) {
      await User.findByIdAndUpdate(coachId, { name });
    }
    
    // Update membership role if provided and valid
    if (role && ['trainer', 'owner'].includes(role) && role !== membership.role) {
      await GymMembership.findOneAndUpdate(
        { userId: coachId, gymId },
        { role }
      );
    }
    
    // Get updated data
    const updatedUser = await User.findById(coachId);
    const updatedMembership = await GymMembership.findOne({ userId: coachId, gymId });
    
    const scheduleCount = await WeeklySchedule.countDocuments({
      gymId,
      coachId
    });
    
    const coachData = {
      id: coachId,
      name: updatedUser?.name || user.name,
      email: updatedUser?.email || user.email,
      role: updatedMembership?.role || membership.role,
      scheduleCount
    };
    
    res.json({
      success: true,
      data: coachData,
      message: 'Coach updated successfully'
    });
  } catch (error) {
    console.error('Error updating coach:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE remove coach from gym (owners only)
const removeCoachFromGym: RequestHandler = async (req, res) => {
  try {
    const { gymId, coachId } = req.params;
    
    // Find gym membership
    const membership = await GymMembership.findOne({
      userId: coachId,
      gymId
    });
    
    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Coach membership not found in this gym'
      });
      return;
    }
    
    // Check if coach has any schedules
    const scheduleCount = await WeeklySchedule.countDocuments({
      gymId,
      coachId
    });
    
    if (scheduleCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot remove coach who has ${scheduleCount} schedule(s). Please delete or reassign their schedules first.`
      });
      return;
    }
    
    // Remove gym membership
    await GymMembership.findOneAndDelete({
      userId: coachId,
      gymId
    });
    
    res.json({
      success: true,
      message: 'Coach removed from gym successfully'
    });
  } catch (error) {
    console.error('Error removing coach:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
// All routes require JWT authentication and gym context
router.get('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getGymCoaches);

// Coach management routes (owners only)
router.post('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, addCoachToGym);
router.put('/:coachId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, updateCoach);
router.delete('/:coachId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, removeCoachFromGym);

// Schedule management routes
router.get('/:coachId/schedules', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getCoachSchedules);
router.get('/:coachId/schedules/:scheduleId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getCoachScheduleById);
router.post('/:coachId/schedules', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, createCoachSchedule);
router.put('/:coachId/schedules/:scheduleId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, updateCoachSchedule);
router.delete('/:coachId/schedules/:scheduleId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, deleteCoachSchedule);

// Enrollment routes
router.post('/:coachId/schedules/:scheduleId/enroll', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, enrollClientInCoachSchedule);
router.delete('/:coachId/schedules/:scheduleId/unenroll', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, unenrollClientFromCoachSchedule);

export default router;