# IronLogic Server Implementation Guide

Complete guide for developing and extending the IronLogic multi-tenant gym management platform.

## Multi-Tenant Architecture Overview

IronLogic Server is a multi-tenant SaaS platform where each gym operates as an independent tenant with complete data isolation.

### Core Concepts

**Tenant Hierarchy:**
```
Platform (Admin Level)
└── Gyms (Tenant Root)
    ├── Locations (Physical gym locations)
    │   └── Schedules (Class/session scheduling)
    ├── Members (Users with gym-specific roles)
    ├── Clients (Gym member profiles)
    └── Programs (Training programs & templates)
```

**Role System:**
- **System Roles**: `admin` (platform) | `user` (basic access)
- **Gym Roles**: `owner` (gym admin) | `trainer` (staff) | `client` (member)

## API Design Patterns

### URL Structure

All tenant data is accessed through explicit gym context in URLs:

```typescript
// Gym management (admin/owner level)
/api/gyms                           // List all gyms (admin only)
/api/gyms/:gymId                    // Gym details
/api/gyms/:gymId/members            // Gym membership management

// Gym-scoped resources
/api/gyms/:gymId/clients            // Gym's clients
/api/gyms/:gymId/programs           // Gym's programs
/api/gyms/:gymId/locations          // Gym's locations

// Location-scoped resources
/api/gyms/:gymId/locations/:locationId/schedules           // Location schedules
/api/gyms/:gymId/locations/:locationId/schedules/:id/enroll // Class enrollment
```

### Response Format

All API responses follow this standardized structure:

```typescript
// Success Response
{
  success: true,
  data: any,                    // Resource data
  count?: number,               // For arrays
  message?: string,             // Optional message
  meta?: {                      // Context metadata (gym-scoped endpoints)
    userRole: 'owner' | 'trainer' | 'client',
    gymId: string,
    locationId?: string         // For location-scoped endpoints
  }
}

// Error Response
{
  success: false,
  message: string               // Error description
}
```

### Frontend Integration

**Authentication Flow:**
1. **Login** → Returns user data with `gymMemberships` array
2. **Gym Selection** → Use `POST /api/auth/select-gym/:gymId` to set context
3. **API Calls** → Include gymId in all subsequent URLs

**Key Endpoints:**
```typescript
// Get user's gym memberships
GET /api/auth/my-gyms
// Response: { success: true, count: 2, data: [{ gym, role, status }] }

// Switch gym context
POST /api/auth/select-gym/:gymId
// Updates user.currentGymId and returns selected gym info

// Enhanced auth responses include gym memberships
POST /api/auth/login
// Response includes: { ...userData, gymMemberships: [...], gymCount: 3 }
```

## Database Patterns

### Multi-Tenant Data Isolation

**Primary Rule:** All tenant data MUST include `gymId` for complete isolation.

```typescript
// ❌ WRONG - Missing gym scope
const clients = await Client.find();

// ✅ CORRECT - Gym-scoped query
const clients = await Client.find({ gymId: req.params.gymId });
```

### Common Database Operations

```typescript
// List resources (gym-scoped)
const resources = await Model.find({ gymId }).select('-__v');

// Get single resource (gym-scoped)
const resource = await Model.findOne({ 
  _id: id, 
  gymId 
}).select('-__v');

// Create resource (gym-scoped)
const resource = await Model.create({
  ...data,
  gymId: req.params.gymId
});

// Update resource (gym-scoped)
const resource = await Model.findOneAndUpdate(
  { _id: id, gymId },
  updateData,
  { new: true, runValidators: true }
);

// Delete resource (gym-scoped)
const resource = await Model.findOneAndDelete({ _id: id, gymId });
```

### Location-Scoped Operations

For resources tied to specific gym locations:

```typescript
// Location-scoped query
const schedules = await WeeklySchedule.find({
  gymId: req.params.gymId,
  locationId: req.params.locationId
});

// Create location-scoped resource
const schedule = await WeeklySchedule.create({
  ...data,
  gymId: req.params.gymId,
  locationId: req.params.locationId
});
```

## Authorization & Middleware

### Gym Context Middleware

The `addGymContext` middleware is the foundation of multi-tenant security:

```typescript
// Usage in routes
router.get('/', addGymContext, requireGymAccess, getClients);

// What it provides
req.gymContext = {
  gym: GymDocument,           // Current gym
  membership: MembershipDoc,  // User's membership (null for admin)
  userRole: 'owner'          // User's role in this gym
};
```

### Authorization Hierarchy

```typescript
// Middleware chain for gym-scoped endpoints
addGymContext        // Validates gym access, adds context
→ requireGymOwner    // Owner-only operations
→ requireGymTrainer  // Trainer+ level access  
→ requireGymAccess   // Any gym member access

// System-level operations
isAuthenticated      // Basic auth
→ isAdmin           // Platform admin only
```

### Role-Based Permissions

| Role | Gym Mgmt | Locations | Clients | Programs | Schedules | Members |
|------|----------|-----------|---------|----------|-----------|---------|
| **Admin** | All | All | All | All | All | All |
| **Owner** | Own | Own | Own | Own | Own | Own |
| **Trainer** | Read | Own | Own | Own | Own | Read |
| **Client** | Read | Read | Profile | Assigned | View/Join | - |

## Route Implementation Patterns

### Standard Route Handler Structure

```typescript
const getGymClients: RequestHandler = async (req, res) => {
  try {
    const { gymId } = req.params;
    
    // Gym-scoped query with data isolation
    const clients = await Client.find({ gymId }).select('-__v');
    
    // Standardized response with role metadata
    res.json({
      success: true,
      count: clients.length,
      data: clients,
      meta: {
        userRole: req.gymContext?.userRole,
        gymId: gymId
      }
    });
  } catch (error) {
    console.error('Error fetching gym clients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Route definition with proper middleware chain
router.get('/', 
  addGymContext as any, 
  requireGymAccess as any, 
  getGymClients
);
```

### Enrollment System Pattern

For class/session enrollment with capacity management:

```typescript
const enrollClient: RequestHandler = async (req, res) => {
  try {
    const { gymId, locationId, scheduleId } = req.params;
    const { dayOfWeek, timeSlotIndex, clientId } = req.body;
    
    // Find schedule with gym/location context
    const schedule = await WeeklySchedule.findOne({
      _id: scheduleId,
      gymId,
      locationId
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const timeSlot = schedule.days
      .find(d => d.dayOfWeek === dayOfWeek)
      ?.timeSlots[timeSlotIndex];
    
    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time slot'
      });
    }
    
    // Business logic: Check capacity and duplicates
    if (timeSlot.clientIds.includes(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'Client already enrolled'
      });
    }
    
    if (timeSlot.clientIds.length >= timeSlot.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Time slot at maximum capacity'
      });
    }
    
    // Update and save
    timeSlot.clientIds.push(clientId);
    await schedule.save();
    
    res.json({
      success: true,
      message: 'Client enrolled successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error enrolling client:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
```

## Validation & Error Handling

### Schema-Level Validation

All validation happens at the Mongoose schema level:

```typescript
// Schema definition with validation
const gymSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Gym name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  }
});

// Standard error handling in routes
try {
  const gym = await Gym.create(data);
  res.status(201).json({ success: true, data: gym });
} catch (error) {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Server error'
  });
}
```

### HTTP Status Code Standards

- **200**: Success with data
- **201**: Resource created successfully
- **400**: Validation errors, duplicate entries, capacity limits
- **401**: Authentication required, invalid credentials
- **403**: Insufficient permissions, gym access denied
- **404**: Resource not found (gym, location, schedule)
- **500**: Server errors (always with generic message)

## Performance Optimization

### Critical Database Indexes

All schemas include performance indexes for multi-tenant queries:

```typescript
// GymMembership indexes
gymMembershipSchema.index({ userId: 1, gymId: 1 }, { unique: true });
gymMembershipSchema.index({ gymId: 1, role: 1 });
gymMembershipSchema.index({ userId: 1, status: 1 });

// Client indexes  
clientSchema.index({ gymId: 1, email: 1 });
clientSchema.index({ gymId: 1, userId: 1 });
clientSchema.index({ gymId: 1, membershipStatus: 1 });

// Program indexes
programSchema.index({ gymId: 1, isTemplate: 1 });
programSchema.index({ gymId: 1, clientId: 1 });
programSchema.index({ templateId: 1 });

// Location & Schedule indexes
locationSchema.index({ gymId: 1, isActive: 1 });
weeklyScheduleSchema.index({ locationId: 1 });
weeklyScheduleSchema.index({ gymId: 1 });
```

## Development Guidelines

### Adding New Gym-Scoped Features

1. **Model Design**: Include `gymId` field in schema
2. **Routes**: Use gym-scoped middleware chain
3. **Queries**: Always filter by `gymId`
4. **Responses**: Include role metadata in `meta` object
5. **Authorization**: Choose appropriate gym role requirements

### Security Checklist

- [ ] All queries include `gymId` filter
- [ ] Routes use `addGymContext` middleware
- [ ] Proper role-based authorization applied
- [ ] No cross-tenant data leakage possible
- [ ] Resource ownership validated in middleware

### Common Patterns to Follow

```typescript
// Route file structure
import { addGymContext, requireGymAccess, requireGymOwner } from '../middleware/auth';

const router = express.Router({ mergeParams: true }); // Important for nested routes

// Handler implementation
const handler: RequestHandler = async (req, res) => {
  // Extract gym context
  const { gymId } = req.params;
  
  // Gym-scoped database operation
  const results = await Model.find({ gymId });
  
  // Response with metadata
  res.json({
    success: true,
    data: results,
    meta: {
      userRole: req.gymContext?.userRole,
      gymId: gymId
    }
  });
};

// Route registration with middleware
router.get('/', addGymContext as any, requireGymAccess as any, handler);
```

This implementation guide provides the foundation for building secure, scalable multi-tenant features in the IronLogic platform.