import express, { RequestHandler } from 'express';
import { Client } from '../mongooseSchemas/Client';
import { IClient } from '../models/Client';
import { addGymContext, requireGymAccess, requireGymOwner } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// GET all clients for a gym
const getAllClients: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const clients = await Client.find({ gymId }).select('-__v');
    
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

// POST create new client
const createClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const { email, firstName, lastName, userId, liftBenchmarks, otherBenchmarks, programId, weight, membershipStatus } = req.body;
    
    // Check if client with this email already exists in this gym
    const existingClient = await Client.findOne({ email: email.toLowerCase(), gymId });
    if (existingClient) {
      res.status(400).json({
        success: false,
        message: 'Client with this email already exists in this gym'
      });
      return;
    }
    
    const client = await Client.create({
      email,
      firstName,
      lastName,
      userId,
      gymId,
      liftBenchmarks: liftBenchmarks || [],
      otherBenchmarks: otherBenchmarks || [],
      programId,
      weight,
      membershipStatus: membershipStatus || 'active'
    });
    
    res.status(201).json({
      success: true,
      data: client
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
    const { email, firstName, lastName, userId, liftBenchmarks, otherBenchmarks, programId, weight, membershipStatus } = req.body;
    
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, gymId },
      { email, firstName, lastName, userId, liftBenchmarks, otherBenchmarks, programId, weight, membershipStatus },
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
    console.error('Error updating client:', error);
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

// DELETE client
const deleteClient: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const client = await Client.findOneAndDelete({ 
      _id: req.params.id, 
      gymId 
    });
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Client deleted successfully'
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
router.get('/', addGymContext as any, requireGymAccess as any, getAllClients);
router.get('/names', addGymContext as any, requireGymAccess as any, getClientNames);
router.get('/email/:email', addGymContext as any, requireGymAccess as any, getClientByEmail);
router.get('/:id', addGymContext as any, requireGymAccess as any, getClientById);
router.post('/', addGymContext as any, requireGymOwner as any, createClient);
router.put('/:id', addGymContext as any, requireGymOwner as any, updateClient);
router.patch('/:id', addGymContext as any, requireGymOwner as any, patchClient);
router.delete('/:id', addGymContext as any, requireGymOwner as any, deleteClient);

export default router; 