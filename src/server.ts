import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { connectDB } from './config/database';
import './config/passport'; // Import passport configuration
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';

// Import routes
import userRoutes from './routes/users';
import activityGroupRoutes from './routes/activityGroups';
import primaryLiftActivityRoutes from './routes/primaryLiftActivities';
import accessoryLiftActivityRoutes from './routes/accessoryLiftActivities';
import otherActivityRoutes from './routes/otherActivities';
import benchmarkTemplateRoutes from './routes/benchmarkTemplates';
import activityTemplateRoutes from './routes/activityTemplates';
import liftBenchmarkRoutes from './routes/liftBenchmarks';
import otherBenchmarkRoutes from './routes/otherBenchmarks';
import programRoutes from './routes/programs';
import clientRoutes from './routes/clients';
import weeklyScheduleRoutes from './routes/weeklySchedules';
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// CORS configuration
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    console.log('CORS check - Origin:', origin);
    const allowedOrigin = process.env.CORS_ORIGIN || 'https://ironlogic-client.onrender.com';
    console.log('CORS - Allowed origin:', allowedOrigin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    if (origin === allowedOrigin) {
      console.log('CORS: Origin allowed');
      callback(null, true);
    } else {
      console.log('CORS: Origin blocked');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with debugging
console.log('MongoDB URL for sessions:', process.env.MONGODB_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Create session store immediately
console.log('Creating MongoDB session store...');
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGODB_URL,
  collectionName: 'sessions',
  ttl: 24 * 60 * 60 // 24 hours in seconds
});

console.log('Session store created, setting up event listeners...');

// Add store event listeners for debugging
sessionStore.on('connected', () => {
  console.log('✅ MongoDB session store connected');
});

sessionStore.on('error', (error: any) => {
  console.error('❌ MongoDB session store error:', error);
});

// Check if already connected
if ((sessionStore as any).client && (sessionStore as any).client.topology && (sessionStore as any).client.topology.isConnected()) {
  console.log('✅ MongoDB session store already connected');
}

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Add session debugging middleware (after Passport initialization)
const sessionDebugMiddleware = (req: any, res: any, next: any) => {
  console.log('=== SESSION DEBUG ===');
  console.log('Session ID:', req.sessionID);
  console.log('User authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'Passport not initialized');
  console.log('User data:', req.user);
  console.log('Session store:', req.sessionStore ? 'Connected' : 'Not connected');
  console.log('Cookies:', req.headers.cookie);
  console.log('====================');
  next();
};

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Add session debugging middleware after Passport is initialized
app.use(sessionDebugMiddleware);

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'IronLogic Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected API Routes (authentication required)
app.use('/api/users', userRoutes);
app.use('/api/activity-groups', activityGroupRoutes);
app.use('/api/primary-lift-activities', primaryLiftActivityRoutes);
app.use('/api/accessory-lift-activities', accessoryLiftActivityRoutes);
app.use('/api/other-activities', otherActivityRoutes);
app.use('/api/benchmark-templates', benchmarkTemplateRoutes);
app.use('/api/activity-templates', activityTemplateRoutes);
app.use('/api/lift-benchmarks', liftBenchmarkRoutes);
app.use('/api/other-benchmarks', otherBenchmarkRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/weekly-schedules', weeklyScheduleRoutes);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Documentation: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Authentication: http://localhost:${PORT}/api/auth`);
      console.log(`📋 Available endpoints:`);
      console.log(`   - Auth: /api/auth`);
      console.log(`   - Users: /api/users`);
      console.log(`   - Activity Groups: /api/activity-groups`);
      console.log(`   - Primary Lift Activities: /api/primary-lift-activities`);
      console.log(`   - Accessory Lift Activities: /api/accessory-lift-activities`);
      console.log(`   - Other Activities: /api/other-activities`);
      console.log(`   - Benchmark Templates: /api/benchmark-templates`);
      console.log(`   - Activity Templates: /api/activity-templates`);
      console.log(`   - Lift Benchmarks: /api/lift-benchmarks`);
      console.log(`   - Other Benchmarks: /api/other-benchmarks`);
      console.log(`   - Programs: /api/programs`);
      console.log(`   - Clients: /api/clients`);
      console.log(`   - Weekly Schedules: /api/weekly-schedules`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();