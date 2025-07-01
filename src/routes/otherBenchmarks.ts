import express, { RequestHandler } from 'express';
import { OtherBenchmark } from '../mongooseSchemas/OtherBenchmark';
import { IOtherBenchmark } from '../models/OtherBenchmark';

const router = express.Router();

// GET all other benchmarks
const getAllOtherBenchmarks: RequestHandler = async (req, res) => {
  try {
    const benchmarks = await OtherBenchmark.find().select('-__v');
    
    res.json({
      success: true,
      count: benchmarks.length,
      data: benchmarks
    });
  } catch (error) {
    console.error('Error fetching other benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single other benchmark by ID
const getOtherBenchmarkById: RequestHandler = async (req, res) => {
  try {
    const benchmark = await OtherBenchmark.findById(req.params.id).select('-__v');
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Other benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error fetching other benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new other benchmark
const createOtherBenchmark: RequestHandler = async (req, res) => {
  try {
    const { name, notes, measurementNotes, value, unit, benchmarkTemplateId } = req.body;
    
    const benchmark = await OtherBenchmark.create({
      name,
      notes,
      measurementNotes,
      value,
      unit,
      benchmarkTemplateId
    });
    
    res.status(201).json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error creating other benchmark:', error);
    
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

// PUT update other benchmark
const updateOtherBenchmark: RequestHandler = async (req, res) => {
  try {
    const { name, notes, measurementNotes, value, unit, benchmarkTemplateId } = req.body;
    
    const benchmark = await OtherBenchmark.findByIdAndUpdate(
      req.params.id,
      { name, notes, measurementNotes, value, unit, benchmarkTemplateId },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Other benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error updating other benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update other benchmark
const patchOtherBenchmark: RequestHandler = async (req, res) => {
  try {
    const benchmark = await OtherBenchmark.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Other benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('Error patching other benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE other benchmark
const deleteOtherBenchmark: RequestHandler = async (req, res) => {
  try {
    const benchmark = await OtherBenchmark.findByIdAndDelete(req.params.id);
    
    if (!benchmark) {
      res.status(404).json({
        success: false,
        message: 'Other benchmark not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Other benchmark deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting other benchmark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllOtherBenchmarks);
router.get('/:id', getOtherBenchmarkById);
router.post('/', createOtherBenchmark);
router.put('/:id', updateOtherBenchmark);
router.patch('/:id', patchOtherBenchmark);
router.delete('/:id', deleteOtherBenchmark);

export default router; 