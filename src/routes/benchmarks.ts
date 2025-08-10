import express, { RequestHandler } from 'express';
import passport from 'passport';
import { BenchmarkTemplate } from '../mongooseSchemas/BenchmarkTemplate';
import { Client } from '../mongooseSchemas/Client';
import { IBenchmark, BenchmarkTypeEnum } from '../models/Benchmark';
import { addGymContext, requireGymAccess, requireGymTrainer } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// Middleware to allow clients to manage their own benchmarks or trainers/owners to manage any
const requireClientBenchmarkAccess: express.RequestHandler = (req, res, next) => {
  if (!req.gymContext) {
    res.status(500).json({
      success: false,
      message: 'Gym context not found. Make sure addGymContext middleware is used first.'
    });
    return;
  }

  const userRole = req.gymContext.userRole;
  const requestedClientId = req.params.clientId;
  const userClientId = (req.user as any)?.client?.id;

  // Trainers and owners can manage any client's benchmarks
  if (userRole === 'owner' || userRole === 'trainer') {
    next();
    return;
  }

  // Clients can only manage their own benchmarks
  // Check both client ID and user ID since the frontend might pass either
  const userId = (req.user as any)?.id;
  if (userRole === 'client' && (userClientId === requestedClientId || userId === requestedClientId)) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Access denied. You can only manage your own benchmarks.'
  });
};

// GET all benchmarks for a client (only current benchmarks)
const getClientBenchmarks: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const userIdOrClientId = req.params.clientId;
    
    // Try to find client by ID first, then by userId (same logic as workout service)
    let client = await Client.findOne({ _id: userIdOrClientId, gymId })
      .populate({
        path: 'currentBenchmarks.benchmarkTemplateId',
        select: 'name benchmarkType notes'
      });
    
    if (!client) {
      // If not found by ID, try to find by userId
      client = await Client.findOne({ userId: userIdOrClientId, gymId })
        .populate({
          path: 'currentBenchmarks.benchmarkTemplateId',
          select: 'name benchmarkType notes'
        });
    }
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    // Return only current benchmarks
    const currentBenchmarks = client.currentBenchmarks || [];
    
    res.json({
      success: true,
      count: currentBenchmarks.length,
      data: currentBenchmarks,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId,
        clientId: client._id
      }
    });
  } catch (error) {
    console.error('Error fetching client benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single benchmark by ID
const getBenchmarkById: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const userIdOrClientId = req.params.clientId;
    const benchmarkId = req.params.id;
    
    // Try to find client by ID first, then by userId
    let client = await Client.findOne({ _id: userIdOrClientId, gymId })
      .populate({
        path: 'currentBenchmarks.benchmarkTemplateId',
        select: 'name benchmarkType notes'
      });
    
    if (!client) {
      client = await Client.findOne({ userId: userIdOrClientId, gymId })
        .populate({
          path: 'currentBenchmarks.benchmarkTemplateId',
          select: 'name benchmarkType notes'
        });
    }
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    // Find benchmark in current benchmarks
    const benchmark = client.currentBenchmarks.find(
      (b: any) => b._id.toString() === benchmarkId
    );
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error fetching benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new benchmark
const createBenchmark: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const userIdOrClientId = req.params.clientId;
    const { benchmarkTemplateId, notes, weight, measurementNotes, value, unit, recordedAt } = req.body;
    
    // Try to find client by ID first, then by userId
    let client = await Client.findOne({ _id: userIdOrClientId, gymId });
    if (!client) {
      client = await Client.findOne({ userId: userIdOrClientId, gymId });
    }
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    // Verify benchmark template exists and get its type
    const template = await BenchmarkTemplate.findById(benchmarkTemplateId);
    if (!template) {
      res.status(400).json({
        success: false,
        message: 'Benchmark template not found'
      });
      return;
    }
    
    // Create new benchmark object
    const newBenchmark = {
      type: template.benchmarkType as BenchmarkTypeEnum,
      name: template.name,
      notes,
      benchmarkTemplateId,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      // Type-specific fields
      weight: template.benchmarkType === 'Lift' ? weight : undefined,
      measurementNotes: template.benchmarkType === 'Other' ? measurementNotes : undefined,
      value: template.benchmarkType === 'Other' ? value : undefined,
      unit: template.benchmarkType === 'Other' ? unit : undefined
    };
    
    // Check if client already has a current benchmark for this template
    const existingBenchmarkIndex = client.currentBenchmarks.findIndex(
      (b: any) => b.benchmarkTemplateId.toString() === benchmarkTemplateId.toString()
    );
    
    if (existingBenchmarkIndex !== -1) {
      // Move existing benchmark to history
      const existingBenchmark = client.currentBenchmarks[existingBenchmarkIndex];
      client.historicalBenchmarks.push(existingBenchmark);
      
      // Replace with new benchmark
      client.currentBenchmarks[existingBenchmarkIndex] = newBenchmark as any;
    } else {
      // First benchmark for this template, add to current
      client.currentBenchmarks.push(newBenchmark as any);
    }
    
    // Save the client document
    await client.save();
    
    // Get the saved benchmark with populated template
    await client.populate({
      path: 'currentBenchmarks.benchmarkTemplateId',
      select: 'name benchmarkType notes'
    });
    
    // Find the newly created benchmark
    const savedBenchmark = client.currentBenchmarks.find(
      (b: any) => b.benchmarkTemplateId._id.toString() === benchmarkTemplateId.toString()
    );
    
    res.status(201).json({
      success: true,
      data: savedBenchmark
    });
  } catch (error) {
    console.error('Error creating benchmark:', error);
    
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

// PUT update benchmark
const updateBenchmark: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const userIdOrClientId = req.params.clientId;
    const benchmarkId = req.params.id;
    const { notes, weight, measurementNotes, value, unit, recordedAt } = req.body;
    
    // Try to find client by ID first, then by userId
    let client = await Client.findOne({ _id: userIdOrClientId, gymId });
    if (!client) {
      client = await Client.findOne({ userId: userIdOrClientId, gymId });
    }
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    // Find benchmark in current benchmarks
    const benchmarkIndex = client.currentBenchmarks.findIndex(
      (b: any) => b._id.toString() === benchmarkId
    );
    
    if (benchmarkIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Benchmark not found'
      });
      return;
    }
    
    // Update the benchmark
    const benchmark = client.currentBenchmarks[benchmarkIndex];
    if (notes !== undefined) benchmark.notes = notes;
    if (weight !== undefined) benchmark.weight = weight;
    if (measurementNotes !== undefined) benchmark.measurementNotes = measurementNotes;
    if (value !== undefined) benchmark.value = value;
    if (unit !== undefined) benchmark.unit = unit;
    if (recordedAt !== undefined) benchmark.recordedAt = new Date(recordedAt);
    
    // Save the client document
    await client.save();
    
    // Populate the template for response
    await client.populate({
      path: 'currentBenchmarks.benchmarkTemplateId',
      select: 'name benchmarkType notes'
    });
    
    res.json({
      success: true,
      data: client.currentBenchmarks[benchmarkIndex]
    });
  } catch (error) {
    console.error('Error updating benchmark:', error);
    
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

// DELETE benchmark
const deleteBenchmark: RequestHandler = async (req, res) => {
  try {
    const gymId = req.params.gymId;
    const userIdOrClientId = req.params.clientId;
    const benchmarkId = req.params.id;
    
    // Try to find client by ID first, then by userId
    let client = await Client.findOne({ _id: userIdOrClientId, gymId });
    if (!client) {
      client = await Client.findOne({ userId: userIdOrClientId, gymId });
    }
    
    if (!client) {
      res.status(404).json({
        success: false,
        message: 'Client not found'
      });
      return;
    }
    
    // Find benchmark in current benchmarks
    const benchmarkIndex = client.currentBenchmarks.findIndex(
      (b: any) => b._id.toString() === benchmarkId
    );
    
    if (benchmarkIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Benchmark not found'
      });
      return;
    }
    
    const deletedBenchmark = client.currentBenchmarks[benchmarkIndex];
    
    // Check if there's a historical benchmark for this template that can be promoted
    const templateId = deletedBenchmark.benchmarkTemplateId.toString();
    const historicalBenchmarks = client.historicalBenchmarks.filter(
      (b: any) => b.benchmarkTemplateId.toString() === templateId
    );
    
    // Remove from current benchmarks
    client.currentBenchmarks.splice(benchmarkIndex, 1);
    
    if (historicalBenchmarks.length > 0) {
      // Promote the most recent historical benchmark to current
      const mostRecentHistorical = historicalBenchmarks.reduce((latest: any, current: any) => {
        return new Date(current.recordedAt) > new Date(latest.recordedAt) ? current : latest;
      });
      
      // Remove from historical benchmarks
      const historicalIndex = client.historicalBenchmarks.findIndex(
        (b: any) => b._id.toString() === (mostRecentHistorical as any)._id.toString()
      );
      if (historicalIndex !== -1) {
        client.historicalBenchmarks.splice(historicalIndex, 1);
      }
      
      // Add to current benchmarks
      client.currentBenchmarks.push(mostRecentHistorical);
    }
    
    // Save the client document
    await client.save();
    
    res.json({
      success: true,
      message: 'Benchmark deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions (all routes are gym and client scoped)
// All routes require JWT authentication
router.get('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getClientBenchmarks);
router.get('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireGymAccess as any, getBenchmarkById);
router.post('/', passport.authenticate('jwt', { session: false }), addGymContext as any, requireClientBenchmarkAccess as any, createBenchmark);
router.put('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireClientBenchmarkAccess as any, updateBenchmark);
router.delete('/:id', passport.authenticate('jwt', { session: false }), addGymContext as any, requireClientBenchmarkAccess as any, deleteBenchmark);

export default router;