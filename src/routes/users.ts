import express, { RequestHandler } from 'express';
import { User } from '../mongooseSchemas/User';
import { IUser } from '../models/User';
import { isAuthenticatedAsAdmin } from '../middleware/auth';

const router = express.Router();

// GET all users (admin only)
const getAllUsers: RequestHandler = async (req, res): Promise<void> => {
  console.log('getting all users');
  try {
    const users = await User.find().select('-__v');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// GET single user by ID
const getUserById: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST create new user (admin only)
const createUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { email, name } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }
    
    const user = await User.create({ email, name });
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
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

// PUT update user
const updateUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { email, name } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { email, name },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// DELETE user (admin only)
const deleteUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.get('/', isAuthenticatedAsAdmin as any, getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router; 