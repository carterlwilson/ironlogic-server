# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Create admin user
npm run create-admin
```

## Architecture Overview

IronLogic Server is a Node.js/Express fitness training application with TypeScript and MongoDB. The codebase follows a clean layered architecture:

**Core Layers:**
- **Server Entry**: `src/server.ts` - Express app setup, middleware, CORS, session management
- **Routes**: `src/routes/` - REST API endpoints organized by domain
- **Models**: `src/models/` - TypeScript interfaces and types
- **Mongoose Schemas**: `src/mongooseSchemas/` - MongoDB schema definitions
- **Config**: `src/config/` - Database connection and Passport authentication

**Multi-Tenant Architecture:**
The application supports multiple gyms with location-based scheduling:
- **Gyms**: Independent gym entities with their own data isolation
- **Locations**: Physical locations within each gym
- **GymMemberships**: User-gym associations with role-based permissions
- **Users/Clients**: Authentication and client management (gym-scoped)
- **Programs/Blocks/Weeks/Days**: Hierarchical training program structure (gym-scoped)
- **Activities**: Three types - PrimaryLift, AccessoryLift, Other
- **Benchmarks**: Performance tracking with templates
- **WeeklySchedules**: Location-scoped scheduling with enrollment system

**Authentication & Authorization:**
- Passport.js with local strategy using email/password
- Session-based authentication with MongoDB session store
- **System Roles**: admin (platform access) | user (basic access)
- **Gym Roles**: owner (gym admin) | trainer (limited access) | client (member access)
- Gym context middleware validates access and injects role information

**Database:**
- MongoDB with Mongoose ODM
- Dual model approach: TypeScript interfaces in `models/` and Mongoose schemas in `mongooseSchemas/`
- Connection managed in `src/config/database.ts`

## Environment Setup

**Required Environment Variables:**
- `MONGODB_URL` - MongoDB connection string
- `SESSION_SECRET` - Session encryption key
- `CORS_ORIGIN` - Allowed CORS origin
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)

**Local Development:**
```bash
# Start MongoDB via Docker
docker-compose up -d

# The server expects MongoDB at localhost:27017/ironlogic
```

## Key Implementation Patterns

**Route Structure:**
All routes follow RESTful conventions with authentication middleware. Routes are organized by domain and imported in `server.ts`.

**Model Organization:**
- TypeScript interfaces in `src/models/` define data structure
- Mongoose schemas in `src/mongooseSchemas/` implement database models
- Both are exported via index files for clean imports

**Session Management:**
Sessions use MongoDB store with extensive debugging middleware. Session configuration varies between development and production environments.

**CORS Configuration:**
Complex CORS setup with origin validation, credential support, and detailed logging for debugging deployment issues.

## Multi-Tenant API Structure

**Gym Context Management:**
- `GET /api/auth/my-gyms` - List user's gym memberships and roles
- `POST /api/auth/select-gym/:gymId` - Switch current gym context
- Enhanced auth responses include `gymMemberships` and `gymCount`

**Gym-Scoped Endpoints:**
All data access is scoped to specific gyms using explicit gym IDs in URLs:
```
/api/gyms/:gymId/clients              # Gym's clients
/api/gyms/:gymId/programs             # Gym's programs
/api/gyms/:gymId/locations            # Gym's locations
/api/gyms/:gymId/members              # Gym membership management
```

**Location-Scoped Scheduling:**
```
/api/gyms/:gymId/locations/:locationId/schedules     # Location schedules
/api/gyms/:gymId/locations/:locationId/schedules/:scheduleId/enroll    # Enroll in class
/api/gyms/:gymId/locations/:locationId/schedules/:scheduleId/unenroll  # Leave class
```

**Role-Based Responses:**
API responses include `meta` object with user's role in current gym:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "userRole": "owner|trainer|client",
    "gymId": "gym_id",
    "locationId": "location_id"  // for location-scoped endpoints
  }
}
```

**Authorization Middleware:**
- `addGymContext` - Validates gym access and adds context to request
- `requireGymOwner` - Owner-only operations
- `requireGymTrainer` - Trainer+ level access
- `requireGymAccess` - Any gym member access