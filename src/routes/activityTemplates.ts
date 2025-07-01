import express, { RequestHandler } from 'express';
import { ActivityTemplate } from '../mongooseSchemas/ActivityTemplate';
import { IActivityTemplate } from '../models/ActivityTemplate';

const router = express.Router();

// GET all activity templates
const getAllActivityTemplates: RequestHandler = async (req, res) => {
  try {
    const templates = await ActivityTemplate.find().select('-__v');
    
    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching activity templates:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single activity template by ID
const getActivityTemplateById: RequestHandler = async (req, res) => {
  try {
    const template = await ActivityTemplate.findById(req.params.id).select('-__v');
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Activity template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching activity template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET activity templates by activity group
const getActivityTemplatesByGroup: RequestHandler = async (req, res) => {
  try {
    const templates = await ActivityTemplate.find({ 
      activityGroupId: req.params.activityGroupId 
    }).select('-__v');
    
    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching activity templates by group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new activity template
const createActivityTemplate: RequestHandler = async (req, res) => {
  try {
    const { name, activityGroupId } = req.body;
    
    const template = await ActivityTemplate.create({
      name,
      activityGroupId
    });
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating activity template:', error);
    
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

// PUT update activity template
const updateActivityTemplate: RequestHandler = async (req, res) => {
  try {
    const { name, activityGroupId } = req.body;
    
    const template = await ActivityTemplate.findByIdAndUpdate(
      req.params.id,
      { name, activityGroupId },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Activity template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error updating activity template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update activity template
const patchActivityTemplate: RequestHandler = async (req, res) => {
  try {
    const template = await ActivityTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Activity template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error patching activity template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE activity template
const deleteActivityTemplate: RequestHandler = async (req, res) => {
  try {
    const template = await ActivityTemplate.findByIdAndDelete(req.params.id);
    
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Activity template not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Activity template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity template:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllActivityTemplates);
router.get('/group/:activityGroupId', getActivityTemplatesByGroup);
router.get('/:id', getActivityTemplateById);
router.post('/', createActivityTemplate);
router.put('/:id', updateActivityTemplate);
router.patch('/:id', patchActivityTemplate);
router.delete('/:id', deleteActivityTemplate);

export default router; 