import express, { RequestHandler } from 'express';
import passport from 'passport';
import { Location } from '../mongooseSchemas/Location';
import { ILocation } from '../models/Location';
import { addGymContext, requireGymAccess, requireGymOwner } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all locations for a gym
const getGymLocations: RequestHandler = async (req, res) => {
  try {
    const locations = await Location.find({ 
      gymId: req.params.gymId 
    }).select('-__v');
    
    res.json({
      success: true,
      count: locations.length,
      data: locations,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: req.params.gymId
      }
    });
  } catch (error) {
    console.error('Error fetching gym locations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single location by ID
const getLocationById: RequestHandler = async (req, res) => {
  try {
    const location = await Location.findOne({
      _id: req.params.locationId,
      gymId: req.params.gymId
    }).select('-__v');
    
    if (!location) {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new location (gym owners only)
const createLocation: RequestHandler = async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const gymId = req.params.gymId;
    
    const location = await Location.create({
      gymId,
      name,
      address,
      phone
    });
    
    res.status(201).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error creating location:', error);
    
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

// PUT update location (gym owners only)
const updateLocation: RequestHandler = async (req, res) => {
  try {
    const { name, address, phone, isActive } = req.body;
    
    const location = await Location.findOneAndUpdate(
      { _id: req.params.locationId, gymId: req.params.gymId },
      { name, address, phone, isActive },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!location) {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error updating location:', error);
    
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

// DELETE location (gym owners only)
const deleteLocation: RequestHandler = async (req, res) => {
  try {
    const location = await Location.findOneAndDelete({
      _id: req.params.locationId,
      gymId: req.params.gymId
    });
    
    if (!location) {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
      return;
    }
    
    // TODO: Handle cleanup of related data (schedules, etc.)
    
    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions (all routes are gym-scoped via :gymId parameter)
// All routes require JWT authentication
router.get('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getGymLocations);
router.get('/:locationId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getLocationById);
router.post('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, createLocation);
router.put('/:locationId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, updateLocation);
router.delete('/:locationId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, deleteLocation);

export default router;