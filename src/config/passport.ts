import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt';
import { User } from '../mongooseSchemas/User';

// Configure Passport local strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.error(`LOGIN FAILED: No user found with email: ${email.toLowerCase()}`);
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check if user is active
      if (!user.isActive) {
        console.error(`LOGIN FAILED: User account deactivated for: ${email}`);
        return done(null, false, { message: 'Account is deactivated' });
      }

      // Compare password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.error(`LOGIN FAILED: Password mismatch for user: ${email}`);
        console.error(`User exists: ${!!user}, Has password: ${!!user.password}, Password length: ${user.password?.length || 0}`);
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      console.log(`LOGIN SUCCESS: User ${email} logged in successfully`);
      return done(null, user);
    } catch (error) {
      console.error(`LOGIN ERROR: Exception during login for ${email}:`, error);
      return done(error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      done(null, false);
      return;
    }

    // If user has role 'user', attach client data
    if (user.role === 'user') {
      const { Client } = await import('../mongooseSchemas/Client');
      const client = await Client.findOne({ userId: (user as any)._id.toString() });
      if (client) {
        // Create a new object that maintains the user structure but adds client
        const userData = { ...user.toObject(), client };
        done(null, userData);
        return;
      }
    }

    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Configure Passport JWT strategy
passport.use(new JWTStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your-jwt-secret-change-this-in-production'
  },
  async (jwtPayload, done) => {
    try {
      console.log('JWT Strategy: Verifying token for user:', jwtPayload.userId);
      
      const user = await User.findById(jwtPayload.userId);
      if (!user) {
        console.log('JWT Strategy: User not found:', jwtPayload.userId);
        return done(null, false);
      }
      
      // If user has role 'user', attach client data (same as session deserialization)
      if (user.role === 'user') {
        const { Client } = await import('../mongooseSchemas/Client');
        const client = await Client.findOne({ userId: (user as any)._id.toString() });
        if (client) {
          const userData = { ...user.toObject(), client };
          console.log('JWT Strategy: User with client data verified:', user.email);
          return done(null, userData);
        }
      }
      
      console.log('JWT Strategy: User verified:', user.email);
      return done(null, user);
    } catch (error) {
      console.error('JWT Strategy: Error verifying token:', error);
      return done(error, false);
    }
  }
));

export default passport; 