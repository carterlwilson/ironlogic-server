import express, { RequestHandler } from 'express';
import { OtherActivity } from '../mongooseSchemas/OtherActivity';
import { IOtherActivity } from '../models/OtherActivity';

const router = express.Router();

// GET all other activities
const getAllOtherActivities: RequestHandler = async (req, res) => {
  try {
    const activities = await OtherActivity.find().select('-__v');
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching other activities:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single other activity by ID
const getOtherActivityById: RequestHandler = async (req, res) => {
  try {
    const activity = await OtherActivity.findById(req.params.id).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Other activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching other activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new other activity
const createOtherActivity: RequestHandler = async (req, res) => {
  try {
    const { name, notes, activityGroupId, measurementNotes } = req.body;
    
    const activity = await OtherActivity.create({
      name,
      notes,
      activityGroupId,
      measurementNotes
    });
    
    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error creating other activity:', error);
    
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

// PUT update other activity
const updateOtherActivity: RequestHandler = async (req, res) => {
  try {
    const { name, notes, activityGroupId, measurementNotes } = req.body;
    
    const activity = await OtherActivity.findByIdAndUpdate(
      req.params.id,
      { name, notes, activityGroupId, measurementNotes },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Other activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error updating other activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// PATCH partial update other activity
const patchOtherActivity: RequestHandler = async (req, res) => {
  try {
    const activity = await OtherActivity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Other activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error patching other activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE other activity
const deleteOtherActivity: RequestHandler = async (req, res) => {
  try {
    const activity = await OtherActivity.findByIdAndDelete(req.params.id);
    
    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Other activity not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Other activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting other activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', getAllOtherActivities);
router.get('/:id', getOtherActivityById);
router.post('/', createOtherActivity);
router.put('/:id', updateOtherActivity);
router.patch('/:id', patchOtherActivity);
router.delete('/:id', deleteOtherActivity);

export default router; 