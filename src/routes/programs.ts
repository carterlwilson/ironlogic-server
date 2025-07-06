import express, { RequestHandler } from 'express';
import { Program } from '../mongooseSchemas/Program';
import { IProgram } from '../models/Program';

const router = express.Router();

// GET all programs
const getAllPrograms: RequestHandler = async (req, res): Promise<void> => {
  try {
    const programs = await Program.find().select('-__v');
    
    res.json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single program by ID
const getProgramById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const program = await Program.findById(req.params.id).select('-__v');
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new program
const createProgram: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { name, blocks } = req.body;
    
    const program = await Program.create({
      name,
      blocks: blocks || []
    });
    
    res.status(201).json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error creating program:', error);
    
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

// PUT update program
const updateProgram: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { name, blocks } = req.body;
    
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { name, blocks },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update program
const patchProgram: RequestHandler = async (req, res): Promise<void> => {
  try {
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: program
    });
  } catch (error) {
    console.error('Error patching program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE program
const deleteProgram: RequestHandler = async (req, res): Promise<void> => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);
    
    if (!program) {
      res.status(404).json({
        success: false,
        message: 'Program not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Program deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllPrograms);
router.get('/:id', getProgramById);
router.post('/', createProgram);
router.put('/:id', updateProgram);
router.patch('/:id', patchProgram);
router.delete('/:id', deleteProgram);

export default router; 