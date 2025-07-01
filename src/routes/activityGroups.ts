import express, { RequestHandler } from 'express';
import { ActivityGroup } from '../mongooseSchemas/ActivityGroup';
import { IActivityGroup } from '../models/ActivityGroup';

const router = express.Router();

// GET all activity groups
const getAllActivityGroups: RequestHandler = async (req, res) => {
  try {
    const groups = await ActivityGroup.find().select('-__v');
    
    res.json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching activity groups:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single activity group by ID
const getActivityGroupById: RequestHandler = async (req, res) => {
  try {
    const group = await ActivityGroup.findById(req.params.id).select('-__v');
    
    if (!group) {
      res.status(404).json({
        success: false,
        message: 'Activity group not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error fetching activity group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new activity group (admin only)
const createActivityGroup: RequestHandler = async (req, res) => {
  try {
    const group = await ActivityGroup.create(req.body);
    res.status(201).json({ success: true, data: group });
    return;
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation error' });
    return;
  }
};

// PUT update activity group (admin only)
const updateActivityGroup: RequestHandler = async (req, res) => {
  try {
    const group = await ActivityGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!group) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    res.json({ success: true, data: group });
    return;
  } catch (error) {
    res.status(400).json({ success: false, message: 'Validation error' });
    return;
  }
};

// PATCH partial update activity group
const patchActivityGroup: RequestHandler = async (req, res) => {
  try {
    const group = await ActivityGroup.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!group) {
      res.status(404).json({
        success: false,
        message: 'Activity group not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error patching activity group:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE activity group (admin only)
const deleteActivityGroup: RequestHandler = async (req, res) => {
  try {
    const group = await ActivityGroup.findByIdAndDelete(req.params.id);
    if (!group) {
      res.status(404).json({ success: false, message: 'Not found' });
      return;
    }
    res.json({ success: true, message: 'Deleted' });
    return;
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
    return;
  }
};

// Route definitions
router.get('/', getAllActivityGroups);
router.get('/:id', getActivityGroupById);
router.post('/', createActivityGroup);
router.put('/:id', updateActivityGroup);
router.patch('/:id', patchActivityGroup);
router.delete('/:id', deleteActivityGroup);

export default router; 