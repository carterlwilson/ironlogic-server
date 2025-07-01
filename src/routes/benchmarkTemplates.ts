import express, { RequestHandler } from 'express';
import { BenchmarkTemplate } from '../mongooseSchemas/BenchmarkTemplate';
import { IBenchmarkTemplate } from '../models/BenchmarkTemplate';
import { BenchmarkTemplateTypeEnum } from '../models/Benchmark';

const router = express.Router();

// GET all benchmark templates
const getAllBenchmarkTemplates: RequestHandler = async (req, res) => {
  try {
    const templates = await BenchmarkTemplate.find().select('-__v');
    
    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching benchmark templates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single benchmark template by ID
const getBenchmarkTemplateById: RequestHandler = async (req, res) => {
  try {
    const template = await BenchmarkTemplate.findById(req.params.id).select('-__v');
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Benchmark template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching benchmark template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET benchmark templates by type
const getBenchmarkTemplatesByType: RequestHandler = async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate the type parameter
    if (!Object.values(BenchmarkTemplateTypeEnum).includes(type as BenchmarkTemplateTypeEnum)) {
      res.status(400).json({
        success: false,
        message: 'Invalid benchmark type'
      });
      return;
    }
    
    const templates = await BenchmarkTemplate.find({ 
      benchmarkType: type 
    }).select('-__v');
    
    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching benchmark templates by type:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new benchmark template
const createBenchmarkTemplate: RequestHandler = async (req, res) => {
  try {
    const { name, notes, benchmarkType } = req.body;
    
    const template = await BenchmarkTemplate.create({
      name,
      notes,
      benchmarkType
    });
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating benchmark template:', error);
    
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

// PUT update benchmark template
const updateBenchmarkTemplate: RequestHandler = async (req, res) => {
  try {
    const { name, notes, benchmarkType } = req.body;
    
    const template = await BenchmarkTemplate.findByIdAndUpdate(
      req.params.id,
      { name, notes, benchmarkType },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Benchmark template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error updating benchmark template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update benchmark template
const patchBenchmarkTemplate: RequestHandler = async (req, res) => {
  try {
    const template = await BenchmarkTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Benchmark template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error patching benchmark template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE benchmark template
const deleteBenchmarkTemplate: RequestHandler = async (req, res) => {
  try {
    const template = await BenchmarkTemplate.findByIdAndDelete(req.params.id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Benchmark template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Benchmark template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting benchmark template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllBenchmarkTemplates);
router.get('/type/:type', getBenchmarkTemplatesByType);
router.get('/:id', getBenchmarkTemplateById);
router.post('/', createBenchmarkTemplate);
router.put('/:id', updateBenchmarkTemplate);
router.patch('/:id', patchBenchmarkTemplate);
router.delete('/:id', deleteBenchmarkTemplate);

export default router; 