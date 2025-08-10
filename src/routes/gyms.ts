import express, { RequestHandler } from 'express';
import passport from 'passport';
import { Gym } from '../mongooseSchemas/Gym';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { User } from '../mongooseSchemas/User';
import { IGym } from '../models/Gym';
import { isAuthenticated, isAdmin, addGymContext, requireGymOwner } from '../middleware/auth';

const router = express.Router();

// GET all gyms (admin only)
const getAllGyms: RequestHandler = async (req, res) => {
  try {
    const gyms = await Gym.find().select('-__v');
    
    res.json({
      success: true,
      count: gyms.length,
      data: gyms
    });
  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single gym by ID (admin or gym members)
const getGymById: RequestHandler = async (req, res) => {
  try {
    const gym = await Gym.findById(req.params.gymId).select('-__v');
    
    if (!gym) {
      res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: gym
    });
  } catch (error) {
    console.error('Error fetching gym:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new gym (admin only)
const createGym: RequestHandler = async (req, res) => {
  try {
    const { name, description, address, phone, email } = req.body;
    
    // Check if gym with email already exists
    const existingGym = await Gym.findOne({ email: email.toLowerCase() });
    if (existingGym) {
      res.status(400).json({
        success: false,
        message: 'Gym with this email already exists'
      });
      return;
    }
    
    const gym = await Gym.create({
      name,
      description,
      address,
      phone,
      email
    });
    
    res.status(201).json({
      success: true,
      data: gym
    });
  } catch (error) {
    console.error('Error creating gym:', error);
    
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

// PUT update gym (admin or gym owner)
const updateGym: RequestHandler = async (req, res) => {
  try {
    const { name, description, address, phone, email, isActive } = req.body;
    
    const gym = await Gym.findByIdAndUpdate(
      req.params.gymId,
      { name, description, address, phone, email, isActive },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!gym) {
      res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: gym
    });
  } catch (error) {
    console.error('Error updating gym:', error);
    
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

// DELETE gym (admin only)
const deleteGym: RequestHandler = async (req, res) => {
  try {
    const gym = await Gym.findByIdAndDelete(req.params.gymId);
    
    if (!gym) {
      res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
      return;
    }
    
    // TODO: Handle cleanup of related data (locations, memberships, etc.)
    // For now, we'll leave this as a simple delete
    
    res.json({
      success: true,
      message: 'Gym deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gym:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET gym members (gym owners only)
const getGymMembers: RequestHandler = async (req, res) => {
  try {
    const memberships = await GymMembership.find({ 
      gymId: req.params.gymId 
    }).select('-__v');
    
    // Get user details for each membership
    const memberDetails = await Promise.all(
      memberships.map(async (membership) => {
        const user = await User.findById(membership.userId).select('email name isActive');
        return {
          membership: membership.toObject(),
          user: user?.toObject()
        };
      })
    );
    
    res.json({
      success: true,
      count: memberDetails.length,
      data: memberDetails
    });
  } catch (error) {
    console.error('Error fetching gym members:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST add member to gym (gym owners only)
const addGymMember: RequestHandler = async (req, res) => {
  try {
    const { userId, role = 'client' } = req.body;
    const gymId = req.params.gymId;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // Check if membership already exists
    const existingMembership = await GymMembership.findOne({ userId, gymId });
    if (existingMembership) {
      res.status(400).json({
        success: false,
        message: 'User is already a member of this gym'
      });
      return;
    }
    
    const membership = await GymMembership.create({
      userId,
      gymId,
      role,
      status: 'active'
    });
    
    res.status(201).json({
      success: true,
      data: membership
    });
  } catch (error) {
    console.error('Error adding gym member:', error);
    
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

// PUT update member role (gym owners only)
const updateGymMember: RequestHandler = async (req, res) => {
  try {
    const { role, status } = req.body;
    const { gymId, userId } = req.params;
    
    const membership = await GymMembership.findOneAndUpdate(
      { userId, gymId },
      { role, status },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Gym membership not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: membership
    });
  } catch (error) {
    console.error('Error updating gym member:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE remove member from gym (gym owners only)
const removeGymMember: RequestHandler = async (req, res) => {
  try {
    const { gymId, userId } = req.params;
    
    const membership = await GymMembership.findOneAndDelete({ userId, gymId });
    
    if (!membership) {
      res.status(404).json({
        success: false,
        message: 'Gym membership not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Member removed from gym successfully'
    });
  } catch (error) {
    console.error('Error removing gym member:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions - All routes require JWT authentication
router.get('/', passport.authenticate('jwt', { session: false }), isAdmin as any, getAllGyms);
router.get('/:gymId', passport.authenticate('jwt', { session: false }), addGymContext as any, getGymById);
router.post('/', passport.authenticate('jwt', { session: false }), isAdmin as any, createGym);
router.put('/:gymId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, updateGym);
router.delete('/:gymId', passport.authenticate('jwt', { session: false }), isAdmin as any, deleteGym);

// Gym membership management routes - All require JWT authentication
router.get('/:gymId/members', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, getGymMembers);
router.post('/:gymId/members', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, addGymMember);
router.put('/:gymId/members/:userId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, updateGymMember);
router.delete('/:gymId/members/:userId', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, removeGymMember);

export default router;