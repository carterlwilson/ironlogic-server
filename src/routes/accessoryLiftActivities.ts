import express, { RequestHandler } from 'express';
import { AccessoryLiftActivity } from '../mongooseSchemas/AccessoryLiftActivity';
import { IAccessoryLiftActivity } from '../models/AccessoryLiftActivity';

const router = express.Router();

// GET all accessory lift activities
const getAllAccessoryLiftActivities: RequestHandler = async (req, res) => {
  try {
    const activities = await AccessoryLiftActivity.find().select('-__v');
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching accessory lift activities:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single accessory lift activity by ID
const getAccessoryLiftActivityById: RequestHandler = async (req, res) => {
  try {
    const activity = await AccessoryLiftActivity.findById(req.params.id).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Accessory lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching accessory lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new accessory lift activity
const createAccessoryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const { name, notes, activityGroupId, percentOfMax, sets, repetitions, benchmarkTemplateId } = req.body;
    
    const activity = await AccessoryLiftActivity.create({
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
    console.error('Error creating accessory lift activity:', error);
    
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

// PUT update accessory lift activity
const updateAccessoryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const { name, notes, activityGroupId, percentOfMax, sets, repetitions, benchmarkTemplateId } = req.body;
    
    const activity = await AccessoryLiftActivity.findByIdAndUpdate(
      req.params.id,
      { name, notes, activityGroupId, percentOfMax, sets, repetitions, benchmarkTemplateId },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Accessory lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error updating accessory lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update accessory lift activity
const patchAccessoryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const activity = await AccessoryLiftActivity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Accessory lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error patching accessory lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE accessory lift activity
const deleteAccessoryLiftActivity: RequestHandler = async (req, res) => {
  try {
    const activity = await AccessoryLiftActivity.findByIdAndDelete(req.params.id);
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Accessory lift activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Accessory lift activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting accessory lift activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllAccessoryLiftActivities);
router.get('/:id', getAccessoryLiftActivityById);
router.post('/', createAccessoryLiftActivity);
router.put('/:id', updateAccessoryLiftActivity);
router.patch('/:id', patchAccessoryLiftActivity);
router.delete('/:id', deleteAccessoryLiftActivity);

export default router; 