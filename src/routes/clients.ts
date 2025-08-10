import express, { RequestHandler } from 'express';
import passport from 'passport';
import { Client } from '../mongooseSchemas/Client';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { Program } from '../mongooseSchemas/Program';
import { IClient } from '../models/Client';
import { addGymContext, requireGymAccess, requireGymOwner, requireGymTrainer } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all clients for a gym
const getAllClients: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const clients = await Client.find({ gymId })
      .populate({
        path: 'programId',
        select: 'name isTemplate',
        match: { isTemplate: true } // Only populate if it's a template
      })
      .select('-__v')
      .sort({ firstName: 1, lastName: 1 });
    
    res.json({
      success: true,
      count: clients.length,
      data: clients,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single client by ID
const getClientById: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const client = await Client.findOne({ 
      _id: req.params.id, 
      gymId 
    }).select('-__v');
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET client by email
const getClientByEmail: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const client = await Client.findOne({ 
      email: req.params.email, 
      gymId 
    }).select('-__v');
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client by email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET client names (id and name only)
const getClientNames: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const clients = await Client.find({ gymId }).select('id firstName lastName').sort({ firstName: 1, lastName: 1 });
    
    const clientNames = clients.map(client => ({
      id: client.id,
      name: `${client.firstName} ${client.lastName}`.trim()
    }));
    
    res.json({
      success: true,
      count: clientNames.length,
      data: clientNames
    });
  } catch (error) {
    console.error('Error fetching client names:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new client (with dual User creation)
const createClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const { email, firstName, lastName, programId, weight, membershipStatus } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'A user with this email already exists. Please use a different email address.'
      });
      return;
    }
    
    // Check if client with this email already exists in this gym
    const existingClient = await Client.findOne({ email: normalizedEmail, gymId });
    if (existingClient) {
      res.status(400).json({
        success: false,
        message: 'A client with this email already exists in this gym'
      });
      return;
    }
    
    // Validate program template if provided
    if (programId) {
      const program = await Program.findOne({ _id: programId, gymId, isTemplate: true });
      if (!program) {
        res.status(400).json({
          success: false,
          message: 'Program template not found'
        });
        return;
      }
    }
    
    // Create user first
    const newUser = await User.create({
      email: normalizedEmail,
      password: 'test123', // Default password as specified
      name: `${firstName} ${lastName}`.trim(),
      role: 'user', // System role
      isActive: true
    });
    
    // Create gym membership for the new user
    await GymMembership.create({
      userId: newUser._id,
      gymId: gymId,
      role: 'client', // Gym role
      status: 'active'
    });
    
    // Create client
    const client = await Client.create({
      email: normalizedEmail,
      firstName,
      lastName,
      userId: newUser._id,
      gymId,
      programId: programId || undefined,
      weight,
      membershipStatus: membershipStatus || 'active'
    });
    
    // Populate the program template for response
    await client.populate({
      path: 'programId',
      select: 'name isTemplate',
      match: { isTemplate: true }
    });
    
    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully. Default password is "password123" - user should change on first login.'
    });
  } catch (error) {
    console.error('Error creating client:', error);
    
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

// PUT update client
const updateClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const { email, firstName, lastName, programId, weight, membershipStatus } = req.body;
    
    // Validate program template if provided
    if (programId) {
      const program = await Program.findOne({ _id: programId, gymId, isTemplate: true });
      if (!program) {
        res.status(400).json({
          success: false,
          message: 'Program template not found'
        });
        return;
      }
    }
    
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, gymId },
      { 
        email: email ? email.toLowerCase().trim() : undefined,
        firstName, 
        lastName, 
        programId: programId || undefined, 
        weight, 
        membershipStatus 
      },
      { new: true, runValidators: true }
    ).populate({
      path: 'programId',
      select: 'name isTemplate',
      match: { isTemplate: true }
    }).select('-__v');
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error updating client:', error);
    
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

// PATCH partial update client
const patchClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, gymId },
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error patching client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE client (with user deactivation)
const deleteClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const client = await Client.findOne({ _id: req.params.id, gymId });
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    // Deactivate the associated user as specified
    await User.findByIdAndUpdate(client.userId, { isActive: false });
    
    // Set gym membership to inactive
    await GymMembership.findOneAndUpdate(
      { userId: client.userId, gymId: gymId },
      { status: 'inactive' }
    );
    
    // Delete the client record
    await Client.findByIdAndDelete(client._id);
    
    res.json({
      success: true,
      message: 'Client deleted successfully and user deactivated'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions (all routes are gym-scoped via :gymId parameter)
// All routes require JWT authentication
router.get('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getAllClients);
router.get('/names', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getClientNames);
router.get('/email/:email', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getClientByEmail);
router.get('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getClientById);
router.post('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, createClient);
router.put('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, updateClient);
router.patch('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymTrainer as any, patchClient);
router.delete('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymOwner as any, deleteClient); // Keep delete as owner-only

export default router; 