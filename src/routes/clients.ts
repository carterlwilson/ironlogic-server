import express, { RequestHandler } from 'express';
import { Client } from '../mongooseSchemas/Client';
import { IClient } from '../models/Client';

const router = express.Router();

// GET all clients
const getAllClients: RequestHandler = async (req, res) => {
  try {
    const clients = await Client.find().select('-__v');
    
    res.json({
      success: true,
      count: clients.length,
      data: clients
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
    const client = await Client.findById(req.params.id).select('-__v');
    
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
    const client = await Client.findOne({ email: req.params.email }).select('-__v');
    
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

// POST create new client
const createClient: RequestHandler = async (req, res) => {
  try {
    const { email, firstName, lastName, userId, liftBenchmarks, otherBenchmarks, scheduleId, weight } = req.body;
    
    const client = await Client.create({
      email,
      firstName,
      lastName,
      userId,
      liftBenchmarks: liftBenchmarks || [],
      otherBenchmarks: otherBenchmarks || [],
      scheduleId,
      weight
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
    const { email, firstName, lastName, userId, liftBenchmarks, otherBenchmarks, scheduleId, weight } = req.body;
    
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { email, firstName, lastName, userId, liftBenchmarks, otherBenchmarks, scheduleId, weight },
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
    const client = await Client.findByIdAndUpdate(
      req.params.id,
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
    const client = await Client.findByIdAndDelete(req.params.id);
    
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

// Route definitions
router.get('/', getAllClients);
router.get('/email/:email', getClientByEmail);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.patch('/:id', patchClient);
router.delete('/:id', deleteClient);

export default router; 