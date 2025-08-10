import express, { RequestHandler } from 'express';
import passport from 'passport';
import WeeklySchedule from '../models/WeeklySchedule';
import { User } from '../mongooseSchemas/User';
import { Location } from '../mongooseSchemas/Location';
import { addGymContext, requireGymAccess } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all schedules with timeslots at a specific location
const getSchedulesByLocation: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId } = req.params;
    const { isTemplate } = req.query;
    
    // Verify location exists in this gym
    const location = await Location.findOne({ _id: locationId, gymId });
    if (!location) {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
      return;
    }
    
    let filter: any = { gymId };
    if (isTemplate !== undefined) {
      filter.isTemplate = isTemplate === 'true';
    }
    
    // Find all schedules that have time slots at this location
    const schedules = await WeeklySchedule.find(filter).select('-__v');
    
    // Filter and transform schedules to only include relevant time slots
    const locationSchedules = [];
    
    for (const schedule of schedules) {
      // Check if this schedule has any time slots at the specified location
      const hasLocationSlots = schedule.days.some(day => 
        day.timeSlots.some(slot => (slot as any).locationId === locationId)
      );
      
      if (hasLocationSlots) {
        // Get coach information
        const coach = await User.findById(schedule.coachId);
        
        // Filter days to only include time slots at this location
        const filteredDays = schedule.days.map(day => ({
          dayOfWeek: day.dayOfWeek,
          timeSlots: day.timeSlots.filter(slot => (slot as any).locationId === locationId)
        })).filter(day => day.timeSlots.length > 0);
        
        if (filteredDays.length > 0) {
          locationSchedules.push({
            id: (schedule._id as any).toString(),
            name: schedule.name,
            description: schedule.description,
            coachId: schedule.coachId,
            coachName: coach?.name || 'Unknown Coach',
            coachEmail: coach?.email || '',
            gymId: schedule.gymId,
            isTemplate: schedule.isTemplate,
            templateId: schedule.templateId,
            weekStartDate: schedule.weekStartDate,
            days: filteredDays,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt
          });
        }
      }
    }
    
    res.json({
      success: true,
      count: locationSchedules.length,
      data: locationSchedules,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        locationId: locationId,
        locationName: location.name
      }
    });
  } catch (error) {
    console.error('Error fetching schedules by location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET overview of all schedules across all locations
const getScheduleOverview: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { isTemplate, date } = req.query;
    
    let filter: any = { gymId };
    if (isTemplate !== undefined) {
      filter.isTemplate = isTemplate === 'true';
    }
    
    // If date is provided, filter by week containing that date
    if (date && filter.isTemplate === false) {
      const targetDate = new Date(date as string);
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      filter.weekStartDate = {
        $gte: startOfWeek,
        $lte: endOfWeek
      };
    }
    
    const schedules = await WeeklySchedule.find(filter).select('-__v');
    
    // Get all locations for this gym
    const locations = await Location.find({ gymId });
    const locationMap = new Map(locations.map((loc: any) => [(loc._id as any).toString(), loc]));
    
    // Organize schedules by location and day
    const overview: any = {
      locations: {},
      coaches: {},
      summary: {
        totalSchedules: schedules.length,
        totalTimeSlots: 0,
        totalEnrollments: 0
      }
    };
    
    // Initialize locations
    locations.forEach((location: any) => {
      overview.locations[location._id.toString()] = {
        id: location._id.toString(),
        name: location.name,
        address: location.address,
        days: Array(7).fill(null).map((_, index) => ({
          dayOfWeek: index,
          timeSlots: []
        }))
      };
    });
    
    // Process each schedule
    for (const schedule of schedules) {
      const coach = await User.findById(schedule.coachId);
      
      // Track coach info
      if (coach && !overview.coaches[schedule.coachId]) {
        overview.coaches[schedule.coachId] = {
          id: schedule.coachId,
          name: coach.name,
          email: coach.email,
          scheduleCount: 0,
          totalTimeSlots: 0
        };
      }
      
      if (overview.coaches[schedule.coachId]) {
        overview.coaches[schedule.coachId].scheduleCount++;
      }
      
      // Process days and time slots
      schedule.days.forEach(day => {
        day.timeSlots.forEach(slot => {
          const slotLocationId = (slot as any).locationId;
          
          if (slotLocationId && overview.locations[slotLocationId]) {
            const locationDay = overview.locations[slotLocationId].days[day.dayOfWeek];
            
            locationDay.timeSlots.push({
              startTime: slot.startTime,
              endTime: slot.endTime,
              maxCapacity: slot.maxCapacity,
              clientIds: slot.clientIds,
              enrolledCount: slot.clientIds.length,
              availableSpots: slot.maxCapacity - slot.clientIds.length,
              notes: slot.notes,
              activityType: slot.activityType,
              scheduleId: (schedule._id as any).toString(),
              scheduleName: schedule.name,
              coachId: schedule.coachId,
              coachName: coach?.name || 'Unknown Coach',
              isTemplate: schedule.isTemplate
            });
            
            // Update summary counts
            overview.summary.totalTimeSlots++;
            overview.summary.totalEnrollments += slot.clientIds.length;
            
            if (overview.coaches[schedule.coachId]) {
              overview.coaches[schedule.coachId].totalTimeSlots++;
            }
          }
        });
      });
    }
    
    // Sort time slots by start time within each day
    Object.values(overview.locations).forEach((location: any) => {
      location.days.forEach((day: any) => {
        day.timeSlots.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      });
    });
    
    res.json({
      success: true,
      data: overview,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        dateFilter: date || null,
        isTemplate: filter.isTemplate
      }
    });
  } catch (error) {
    console.error('Error fetching schedule overview:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET schedule conflicts - find overlapping time slots at the same location
const getScheduleConflicts: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;
    const { date } = req.query;
    
    let filter: any = { gymId, isTemplate: false };
    
    // If date is provided, filter by week containing that date
    if (date) {
      const targetDate = new Date(date as string);
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      filter.weekStartDate = {
        $gte: startOfWeek,
        $lte: endOfWeek
      };
    }
    
    const schedules = await WeeklySchedule.find(filter);
    const conflicts: any[] = [];
    
    // Group time slots by location and day
    const locationDaySlots: any = {};
    
    for (const schedule of schedules) {
      const coach = await User.findById(schedule.coachId);
      
      schedule.days.forEach(day => {
        day.timeSlots.forEach((slot, slotIndex) => {
          const locationId = (slot as any).locationId;
          const key = `${locationId}-${day.dayOfWeek}`;
          
          if (!locationDaySlots[key]) {
            locationDaySlots[key] = [];
          }
          
          locationDaySlots[key].push({
            schedule,
            coach,
            day: day.dayOfWeek,
            slot,
            slotIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
            locationId
          });
        });
      });
    }
    
    // Check for conflicts within each location-day group
    for (const [key, slots] of Object.entries(locationDaySlots) as [string, any][]) {
      const [locationId, dayOfWeek] = key.split('-');
      
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const slot1 = slots[i];
          const slot2 = slots[j];
          
          // Parse times for comparison
          const start1 = new Date(`2000-01-01T${slot1.startTime}:00`);
          const end1 = new Date(`2000-01-01T${slot1.endTime}:00`);
          const start2 = new Date(`2000-01-01T${slot2.startTime}:00`);
          const end2 = new Date(`2000-01-01T${slot2.endTime}:00`);
          
          // Check if slots overlap: start1 < end2 && start2 < end1
          if (start1 < end2 && start2 < end1) {
            const location = await Location.findById(locationId) as any;
            
            conflicts.push({
              locationId,
              locationName: location?.name || 'Unknown Location',
              dayOfWeek: parseInt(dayOfWeek),
              dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(dayOfWeek)],
              conflict: {
                schedule1: {
                  id: slot1.schedule._id.toString(),
                  name: slot1.schedule.name,
                  coachId: slot1.schedule.coachId,
                  coachName: slot1.coach?.name || 'Unknown Coach',
                  timeSlot: `${slot1.startTime} - ${slot1.endTime}`
                },
                schedule2: {
                  id: slot2.schedule._id.toString(),
                  name: slot2.schedule.name,
                  coachId: slot2.schedule.coachId,
                  coachName: slot2.coach?.name || 'Unknown Coach',
                  timeSlot: `${slot2.startTime} - ${slot2.endTime}`
                },
                overlapPeriod: {
                  start: start1 > start2 ? slot1.startTime : slot2.startTime,
                  end: end1 < end2 ? slot1.endTime : slot2.endTime
                }
              }
            });
          }
        }
      }
    }
    
    res.json({
      success: true,
      count: conflicts.length,
      data: conflicts,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        dateFilter: date || null
      }
    });
  } catch (error) {
    console.error('Error finding schedule conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/overview', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getScheduleOverview);
router.get('/conflicts', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getScheduleConflicts);
router.get('/by-location/:locationId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getSchedulesByLocation);

export default router;