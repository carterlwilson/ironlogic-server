import express, { RequestHandler } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { User } from '../mongooseSchemas/User';
import { isNotAuthenticated, authRateLimit } from '../middleware/auth';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit(authRateLimit);

// POST /api/auth/register
const register: RequestHandler = async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
      return;
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    console.error('Error registering user:', error);
    
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

// POST /api/auth/login
const login: RequestHandler = (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: info.message || 'Invalid credentials'
      });
      return;
    }
    
    req.logIn(user, async (err) => {
      if (err) {
        return next(err);
      }
      
      // Find client data if user has role 'user'
      let userData = user;
      if (user.role === 'user') {
        const { Client } = await import('../mongooseSchemas/Client');
        const client = await Client.findOne({ userId: user._id.toString() });
        if (client) {
          userData = { ...user.toObject(), client };
        }
      }
      
      res.json({
        success: true,
        message: 'Login successful',
        data: userData
      });
    });
  })(req, res, next);
};

// POST /api/auth/logout
const logout: RequestHandler = (req, res) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
};

// GET /api/auth/me
const getCurrentUser: RequestHandler = async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
    return;
  }
  
  // Find client data if user has role 'user'
  let userData = req.user;
  if ((req.user as any).role === 'user') {
    const { Client } = await import('../mongooseSchemas/Client');
    const client = await Client.findOne({ userId: (req.user as any)._id.toString() });
    if (client) {
      userData = { ...(req.user as any).toObject(), client };
    }
  }
  
  res.json({
    success: true,
    data: userData
  });
};

// POST /api/auth/change-password
const changePassword: RequestHandler = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.isAuthenticated()) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    const user = await User.findById((req.user as any)._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
      return;
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definitions
router.post('/register', authLimiter, isNotAuthenticated as any, register);
router.post('/login', authLimiter, isNotAuthenticated as any, login);
router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.post('/change-password', changePassword);

export default router; 