import express, { RequestHandler } from 'express';
import { PrimaryLiftActivity } from '../mongooseSchemas/PrimaryLiftActivity';
import { IPrimaryLiftActivity } from '../models/PrimaryLiftActivity';

const router = express.Router();

// GET all primary lift activities
const getAllPrimaryLiftActivities: RequestHandler = async (req, res) => {
  try {
    const activities = await PrimaryLiftActivity.find().select('-__v');
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching primary lift activities:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single primary lift activity by ID
const getPrimaryLiftActivityById: RequestHandler = async (req, res) => {
  try {
    const activity = await PrimaryLiftActivity.findById(req.params.id).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Primary lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching primary lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new primary lift activity
const createPrimaryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const { name, notes, activityGroupId, percentOfMax, sets, repetitions, benchmarkTemplateId } = req.body;
    
    const activity = await PrimaryLiftActivity.create({
      name,
      notes,
      activityGroupId,
      percentOfMax,
      sets,
      repetitions,
      benchmarkTemplateId
    });
    
    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error creating primary lift activity:', error);
    
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

// PUT update primary lift activity
const updatePrimaryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const { name, notes, activityGroupId, percentOfMax, sets, repetitions, benchmarkTemplateId } = req.body;
    
    const activity = await PrimaryLiftActivity.findByIdAndUpdate(
      req.params.id,
      { name, notes, activityGroupId, percentOfMax, sets, repetitions, benchmarkTemplateId },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Primary lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error updating primary lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update primary lift activity
const patchPrimaryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const activity = await PrimaryLiftActivity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Primary lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error patching primary lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE primary lift activity
const deletePrimaryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const activity = await PrimaryLiftActivity.findByIdAndDelete(req.params.id);
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Primary lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Primary lift activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting primary lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllPrimaryLiftActivities);
router.get('/:id', getPrimaryLiftActivityById);
router.post('/', createPrimaryLiftActivity);
router.put('/:id', updatePrimaryLiftActivity);
router.patch('/:id', patchPrimaryLiftActivity);
router.delete('/:id', deletePrimaryLiftActivity);

export default router; 