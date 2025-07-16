import express, { RequestHandler } from 'express';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { User } from '../mongooseSchemas/User';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { Gym } from '../mongooseSchemas/Gym';
import { isNotAuthenticated, authRateLimit, isAuthenticated } from '../middleware/auth';

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
      
      // Get user's gym memberships for frontend context
      let gymMemberships: any[] = [];
      try {
        if (user.role === 'admin') {
          // Admin users can access all gyms
          const allGyms = await Gym.find({ isActive: true }).select('-__v');
          gymMemberships = allGyms.map(gym => ({
            gym: gym.toObject(),
            role: 'admin',
            status: 'active',
            joinedAt: gym.createdAt
          }));
        } else {
          // Regular users - get their gym memberships
          const memberships = await GymMembership.find({ 
            userId: user._id.toString(), 
            status: 'active' 
          }).select('-__v');

          // Get gym details for each membership
          gymMemberships = await Promise.all(
            memberships.map(async (membership) => {
              const gym = await Gym.findById(membership.gymId).select('-__v');
              if (gym) {
                return {
                  gym: gym.toObject(),
                  role: membership.role,
                  status: membership.status,
                  joinedAt: membership.joinedAt
                };
              }
              return null;
            })
          );
          
          // Filter out any null values
          gymMemberships = gymMemberships.filter(Boolean);
        }
      } catch (error) {
        console.error('Error fetching gym memberships during login:', error);
        // Continue with login even if gym memberships fail to load
      }
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          ...userData.toObject(),
          gymMemberships,
          gymCount: gymMemberships.length
        }
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
  
  // Get user's gym memberships for frontend context
  let gymMemberships: any[] = [];
  try {
    if ((req.user as any).role === 'admin') {
      // Admin users can access all gyms
      const allGyms = await Gym.find({ isActive: true }).select('-__v');
      gymMemberships = allGyms.map(gym => ({
        gym: gym.toObject(),
        role: 'admin',
        status: 'active',
        joinedAt: gym.createdAt
      }));
    } else {
      // Regular users - get their gym memberships
      const memberships = await GymMembership.find({ 
        userId: (req.user as any)._id.toString(), 
        status: 'active' 
      }).select('-__v');

      // Get gym details for each membership
      gymMemberships = await Promise.all(
        memberships.map(async (membership) => {
          const gym = await Gym.findById(membership.gymId).select('-__v');
          if (gym) {
            return {
              gym: gym.toObject(),
              role: membership.role,
              status: membership.status,
              joinedAt: membership.joinedAt
            };
          }
          return null;
        })
      );
      
      // Filter out any null values
      gymMemberships = gymMemberships.filter(Boolean);
    }
  } catch (error) {
    console.error('Error fetching gym memberships:', error);
    // Continue with response even if gym memberships fail to load
  }
  
  res.json({
    success: true,
    data: {
      ...(userData as any).toObject(),
      gymMemberships,
      gymCount: gymMemberships.length
    }
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

// GET /api/auth/my-gyms - List user's gym memberships
const getMyGyms: RequestHandler = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const userId = (req.user as any)._id.toString();

    // Admin users can see all gyms
    if ((req.user as any).role === 'admin') {
      const allGyms = await Gym.find({ isActive: true }).select('-__v');
      const gymsWithRole = allGyms.map(gym => ({
        gym: gym.toObject(),
        role: 'admin',
        status: 'active',
        joinedAt: gym.createdAt
      }));

      res.json({
        success: true,
        count: gymsWithRole.length,
        data: gymsWithRole
      });
      return;
    }

    // Regular users - get their gym memberships
    const memberships = await GymMembership.find({ 
      userId, 
      status: 'active' 
    }).select('-__v');

    // Get gym details for each membership
    const gymsWithMemberships = await Promise.all(
      memberships.map(async (membership) => {
        const gym = await Gym.findById(membership.gymId).select('-__v');
        return {
          gym: gym?.toObject(),
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt
        };
      })
    );

    // Filter out any gyms that weren't found
    const validGyms = gymsWithMemberships.filter(item => item.gym);

    res.json({
      success: true,
      count: validGyms.length,
      data: validGyms
    });
  } catch (error) {
    console.error('Error fetching user gyms:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// POST /api/auth/select-gym/:gymId - Set current gym context
const selectGym: RequestHandler = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { gymId } = req.params;
    const userId = (req.user as any)._id.toString();

    // Admin users can select any gym
    if ((req.user as any).role === 'admin') {
      const gym = await Gym.findById(gymId);
      if (!gym) {
        res.status(404).json({
          success: false,
          message: 'Gym not found'
        });
        return;
      }

      // Update user's current gym
      await User.findByIdAndUpdate(userId, { currentGymId: gymId });

      res.json({
        success: true,
        message: 'Gym context updated',
        data: {
          gym: gym.toObject(),
          role: 'admin'
        }
      });
      return;
    }

    // Regular users - verify gym membership
    const membership = await GymMembership.findOne({
      userId,
      gymId,
      status: 'active'
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this gym'
      });
      return;
    }

    const gym = await Gym.findById(gymId);
    if (!gym) {
      res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
      return;
    }

    if (!gym.isActive) {
      res.status(403).json({
        success: false,
        message: 'This gym is currently inactive'
      });
      return;
    }

    // Update user's current gym
    await User.findByIdAndUpdate(userId, { currentGymId: gymId });

    res.json({
      success: true,
      message: 'Gym context updated',
      data: {
        gym: gym.toObject(),
        role: membership.role
      }
    });
  } catch (error) {
    console.error('Error selecting gym:', error);
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

// Gym context management routes
router.get('/my-gyms', getMyGyms);
router.post('/select-gym/:gymId', selectGym);

export default router; 