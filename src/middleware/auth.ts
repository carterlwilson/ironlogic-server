import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { GymMembership } from '../mongooseSchemas/GymMembership';
import { Gym } from '../mongooseSchemas/Gym';

// Extend Request interface to include gym context
declare global {
  namespace Express {
    interface Request {
      gymContext?: {
        gym: any;
        membership: any;
        userRole: 'owner' | 'trainer' | 'client';
      };
    }
  }
}

// Middleware to check if user is authenticated with any role
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('isAuthenticated middleware called');
  console.log('Session ID:', req.sessionID);
  console.log('Is authenticated:', req.isAuthenticated());
  console.log('User from req.user:', req.user);
  
  // Passport automatically populates req.user from the session
  if (!req.isAuthenticated()) {
    console.log('User not authenticated');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (!req.user) {
    console.log('No user found in req.user');
    return res.status(401).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  console.log('User authenticated:', (req.user as any).username, 'Role:', (req.user as any).role);
  next();
};

// Middleware to check if user is authenticated using Passport sessions
export const isAuthenticatedAsAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log('isAuthenticatedAsAdmin middleware called');
  console.log('Session ID:', req.sessionID);
  console.log('Is authenticated:', req.isAuthenticated());
  console.log('User from req.user:', req.user);
  
  // Passport automatically populates req.user from the session
  if (!req.isAuthenticated()) {
    console.log('User not authenticated');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  if (!req.user) {
    console.log('No user found in req.user');
    return res.status(401).json({ 
      success: false, 
      message: 'User not found' 
    });
  }

  console.log('User found:', (req.user as any).username, 'Role:', (req.user as any).role);

  if ((req.user as any).role !== 'admin') {
    console.log('User is not admin');
    return res.status(403).json({ 
      success: false, 
      message: 'Insufficient permissions' 
    });
  }
  
  console.log('Admin authentication successful');
  next();
};

// Middleware to check if user is not authenticated (for login/register routes)
export const isNotAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Already authenticated' 
    });
  }
  
  next();
};

// Middleware to check user role
export const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (!roles.includes((req.user as any).role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

// Convenience middleware for specific roles
export const isAdmin = hasRole(['admin']);
export const isTrainer = hasRole(['admin', 'trainer']);
export const isUser = hasRole(['admin', 'trainer', 'user']);

// Rate limiting for auth routes
export const authRateLimit = {
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  }
};

// Gym context middleware - validates gym access and adds to request
export const addGymContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gymId = req.params.gymId;
    
    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: 'Gym ID is required'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userId = (req.user as any)._id || (req.user as any).id;

    // Admin users have access to all gyms
    if ((req.user as any).role === 'admin') {
      const gym = await Gym.findById(gymId);
      if (!gym) {
        return res.status(404).json({
          success: false,
          message: 'Gym not found'
        });
      }

      req.gymContext = {
        gym,
        membership: null,
        userRole: 'owner' // Admins get owner-level permissions
      };
      
      return next();
    }

    // Check if user has membership in this gym
    const membership = await GymMembership.findOne({
      userId,
      gymId,
      status: 'active'
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this gym'
      });
    }

    // Get gym details
    const gym = await Gym.findById(gymId);
    if (!gym) {
      return res.status(404).json({
        success: false,
        message: 'Gym not found'
      });
    }

    if (!gym.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This gym is currently inactive'
      });
    }

    // Add gym context to request
    req.gymContext = {
      gym,
      membership,
      userRole: membership.role
    };

    console.log(`Gym context added: User ${userId} has role ${membership.role} in gym ${gymId}`);
    next();
  } catch (error) {
    console.error('Error in addGymContext middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Gym-scoped authorization middleware
export const requireGymRole = (requiredRoles: ('owner' | 'trainer' | 'client')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.gymContext) {
      return res.status(500).json({
        success: false,
        message: 'Gym context not found. Make sure addGymContext middleware is used first.'
      });
    }

    if (!requiredRoles.includes(req.gymContext.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${requiredRoles.join(' or ')}, Got: ${req.gymContext.userRole}`
      });
    }

    next();
  };
};

// Convenience middleware for specific gym roles
export const requireGymOwner = requireGymRole(['owner']);
export const requireGymTrainer = requireGymRole(['owner', 'trainer']);
export const requireGymAccess = requireGymRole(['owner', 'trainer', 'client']);
export const requireClientAccess = requireGymRole(['client']); 