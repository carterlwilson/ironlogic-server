import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { connectDB } from './config/database';
import './config/passport'; // Import passport configuration
import mongoose from 'mongoose';

// Import routes
import userRoutes from './routes/users';
import activityGroupRoutes from './routes/activityGroups';
import primaryLiftActivityRoutes from './routes/primaryLiftActivities';
import accessoryLiftActivityRoutes from './routes/accessoryLiftActivities';
import otherActivityRoutes from './routes/otherActivities';
import benchmarkTemplateRoutes from './routes/benchmarkTemplates';
import activityTemplateRoutes from './routes/activityTemplates';
import benchmarkRoutes from './routes/benchmarks';
import programRoutes from './routes/programs';
import clientRoutes from './routes/clients';
import weeklyScheduleRoutes from './routes/weeklySchedules';
import authRoutes from './routes/auth';
import gymRoutes from './routes/gyms';
import locationRoutes from './routes/locations';
import locationScheduleRoutes from './routes/locationSchedules';
import coachScheduleRoutes from './routes/coachSchedules';
import scheduleOverviewRoutes from './routes/scheduleOverview';
import adminRoutes from './routes/admin';
import progressionRoutes from './routes/progression';
import workoutRoutes from './routes/workouts';
// import { startWeeklyProgressionJobs } from './jobs/weeklyProgression';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// CORS configuration
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    console.log('CORS check - Origin:', origin);
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'https://ironlogic-client.onrender.com',
      'https://client.local:3000',  // Client app on HTTPS
      'https://mobile.local:3001',  // Mobile app on HTTPS
      'https://api.local:3002',     // API server on HTTPS
      'http://localhost:3000',  // HTTP fallback for localhost
      'http://localhost:3001',  // HTTP fallback for localhost
      'http://localhost:3002'   // HTTP fallback for localhost
    ];
    console.log('CORS - Allowed origins:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// JWT Authentication - no sessions needed

// Initialize Passport (without sessions)
app.use(passport.initialize());

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

// System admin routes (admin role required)
app.use('/api/admin', adminRoutes);

// Gym management routes (admin/owner level)
app.use('/api/gyms', gymRoutes);

// Gym-scoped location routes  
app.use('/api/gyms/:gymId/locations', locationRoutes);
// Location-scoped schedule routes (legacy - keep for backward compatibility)
app.use('/api/gyms/:gymId/locations/:locationId/schedules', locationScheduleRoutes);

// Coach-based schedule routes (new)
app.use('/api/gyms/:gymId/coaches', coachScheduleRoutes);

// Schedule overview and aggregation routes
app.use('/api/gyms/:gymId/schedules', scheduleOverviewRoutes);

// Gym-scoped client routes
app.use('/api/gyms/:gymId/clients', clientRoutes);

// Gym-scoped program routes
app.use('/api/gyms/:gymId/programs', programRoutes);

// Client-scoped benchmark routes
app.use('/api/gyms/:gymId/clients/:clientId/benchmarks', benchmarkRoutes);

// Progression routes
app.use('/api', progressionRoutes);

// Workout routes (gym and client scoped)
app.use('/api', workoutRoutes);

// Protected API Routes (authentication required)
app.use('/api/users', userRoutes);
app.use('/api/activity-groups', activityGroupRoutes);
app.use('/api/primary-lift-activities', primaryLiftActivityRoutes);
app.use('/api/accessory-lift-activities', accessoryLiftActivityRoutes);
app.use('/api/other-activities', otherActivityRoutes);
app.use('/api/benchmark-templates', benchmarkTemplateRoutes);
app.use('/api/activity-templates', activityTemplateRoutes);
app.use('/api/weekly-schedules', weeklyScheduleRoutes);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize weekly progression cron jobs
    // TODO: Re-enable after fixing node-cron installation
    // await startWeeklyProgressionJobs();
    
    // Start the server with HTTPS
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'api.local.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'api.local.crt'))
    };
    
    https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`🚀 Server running on https://api.local:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Documentation: https://api.local:${PORT}/api/health`);
      console.log(`🔐 Authentication: https://api.local:${PORT}/api/auth`);
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