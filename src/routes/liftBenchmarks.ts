import express, { RequestHandler } from 'express';
import { LiftBenchmark } from '../mongooseSchemas/LiftBenchmark';
import { ILiftBenchmark } from '../models/LiftBenchmark';

const router = express.Router();

// GET all lift benchmarks
const getAllLiftBenchmarks: RequestHandler = async (req, res) => {
  try {
    const benchmarks = await LiftBenchmark.find().select('-__v');
    
    res.json({
      success: true,
      count: benchmarks.length,
      data: benchmarks
    });
  } catch (error) {
    console.error('Error fetching lift benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single lift benchmark by ID
const getLiftBenchmarkById: RequestHandler = async (req, res) => {
  try {
    const benchmark = await LiftBenchmark.findById(req.params.id).select('-__v');
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Lift benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error fetching lift benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new lift benchmark
const createLiftBenchmark: RequestHandler = async (req, res) => {
  try {
    const { name, notes, weight, benchmarkTemplateId } = req.body;
    
    const benchmark = await LiftBenchmark.create({
      name,
      notes,
      weight,
      benchmarkTemplateId
    });
    
    res.status(201).json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error creating lift benchmark:', error);
    
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

// PUT update lift benchmark
const updateLiftBenchmark: RequestHandler = async (req, res) => {
  try {
    const { name, notes, weight, benchmarkTemplateId } = req.body;
    
    const benchmark = await LiftBenchmark.findByIdAndUpdate(
      req.params.id,
      { name, notes, weight, benchmarkTemplateId },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Lift benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error updating lift benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update lift benchmark
const patchLiftBenchmark: RequestHandler = async (req, res) => {
  try {
    const benchmark = await LiftBenchmark.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Lift benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error patching lift benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE lift benchmark
const deleteLiftBenchmark: RequestHandler = async (req, res) => {
  try {
    const benchmark = await LiftBenchmark.findByIdAndDelete(req.params.id);
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Lift benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Lift benchmark deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lift benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllLiftBenchmarks);
router.get('/:id', getLiftBenchmarkById);
router.post('/', createLiftBenchmark);
router.put('/:id', updateLiftBenchmark);
router.patch('/:id', patchLiftBenchmark);
router.delete('/:id', deleteLiftBenchmark);

export default router; 