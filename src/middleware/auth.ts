import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

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