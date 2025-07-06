# IronLogic Client Implementation Guide

## Overview

This guide provides a comprehensive overview for implementing the client application that will consume the IronLogic Fitness Training API. The system manages fitness training data including clients, programs, activities, benchmarks, and weekly class schedules.

## API Base URL

```
http://localhost:3000/api
```

## Authentication

The API uses session-based authentication with username/password login.

### Authentication Endpoints

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "username": "admin",
    "role": "admin"
  }
}
```

#### Logout
```http
POST /auth/logout
```

#### Check Authentication Status
```http
GET /auth/status
```

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "user_id",
    "username": "admin",
    "role": "admin"
  }
}
```

### Session Management

- Sessions are managed server-side using express-session
- Client should include cookies in requests automatically
- Session timeout: 24 hours
- Admin-only endpoints require `role: "admin"`

## Core Data Models

### 1. Programs (Workout Training Programs)

Programs contain structured workout plans with blocks, weeks, and activities.

**Structure:**
```typescript
interface Program {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

interface Block {
  id: string;
  weeks: Week[];
  groupTargetPercentages: GroupPercentage[];
}

interface Week {
  id: string;
  days: Day[];
  groupTargetPercentages: GroupPercentage[];
}

interface Day {
  id: string;
  primaryLiftActivities: PrimaryLiftActivity[];
  accessoryLiftActivities: AccessoryLiftActivity[];
  otherActivities: OtherActivity[];
}
```

**Endpoints:**
- `GET /programs` - Get all programs
- `GET /programs/:id` - Get program by ID
- `POST /programs` - Create new program
- `PUT /programs/:id` - Update program
- `PATCH /programs/:id` - Partial update
- `DELETE /programs/:id` - Delete program

### 2. Weekly Schedules (Class Scheduling)

Weekly schedules manage class time slots and client assignments.

**Structure:**
```typescript
interface WeeklySchedule {
  id: string;
  name: string;
  description?: string;
  isBaseline: boolean;
  days: WeeklyScheduleDay[];
  createdAt: string;
  updatedAt: string;
}

interface WeeklyScheduleDay {
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  timeSlots: TimeSlot[];
}

interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  clientIds: string[];
  maxCapacity: number;
}
```

**Endpoints:**
- `GET /weekly-schedules` - Get all schedules (admin only)
- `GET /weekly-schedules/baseline` - Get baseline schedule
- `GET /weekly-schedules/current` - Get current schedule (authenticated)
- `GET /weekly-schedules/:id` - Get schedule by ID
- `POST /weekly-schedules` - Create new schedule (admin only)
- `PUT /weekly-schedules/:id` - Update schedule (admin only)
- `PUT /weekly-schedules/current` - Update current schedule (authenticated)
- `DELETE /weekly-schedules/:id` - Delete schedule (admin only)
- `POST /weekly-schedules/:id/baseline` - Create baseline from schedule (admin only)

### 3. Clients

Clients represent individuals in the training program.

**Structure:**
```typescript
interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId: string;
  liftBenchmarks: LiftBenchmark[];
  otherBenchmarks: OtherBenchmark[];
  programId: string;
  weight: number;
  fullName: string; // Virtual field
  createdAt: string;
  updatedAt: string;
}
```

**Endpoints:**
- `GET /clients` - Get all clients
- `GET /clients/names` - Get client IDs and names only
- `GET /clients/:id` - Get client by ID
- `GET /clients/email/:email` - Get client by email
- `POST /clients` - Create new client
- `PUT /clients/:id` - Update client
- `PATCH /clients/:id` - Partial update
- `DELETE /clients/:id` - Delete client

### 4. Activities

Three types of activities for workout programs:

#### Primary Lift Activities
```typescript
interface PrimaryLiftActivity {
  id: string;
  name: string;
  notes?: string;
  activityGroupId: string;
  percentOfMax: number;
  sets: number;
  repetitions: number;
  benchmarkTemplateId?: string;
}
```

#### Accessory Lift Activities
```typescript
interface AccessoryLiftActivity {
  id: string;
  name: string;
  notes?: string;
  activityGroupId: string;
  percentOfMax: number;
  sets: number;
  repetitions: number;
  benchmarkTemplateId?: string;
}
```

#### Other Activities
```typescript
interface OtherActivity {
  id: string;
  name: string;
  notes?: string;
  activityGroupId: string;
  measurementNotes?: string;
}
```

**Endpoints for each activity type:**
- `GET /primary-lift-activities` - Get all
- `GET /primary-lift-activities/:id` - Get by ID
- `POST /primary-lift-activities` - Create
- `PUT /primary-lift-activities/:id` - Update
- `PATCH /primary-lift-activities/:id` - Partial update
- `DELETE /primary-lift-activities/:id` - Delete

(Same pattern for `/accessory-lift-activities` and `/other-activities`)

### 5. Activity Groups

Categories for organizing activities.

**Structure:**
```typescript
interface ActivityGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

**Endpoints:**
- `GET /activity-groups` - Get all groups
- `GET /activity-groups/:id` - Get by ID
- `POST /activity-groups` - Create
- `PUT /activity-groups/:id` - Update
- `PATCH /activity-groups/:id` - Partial update
- `DELETE /activity-groups/:id` - Delete

### 6. Benchmarks

Two types of benchmarks for tracking client progress:

#### Lift Benchmarks
```typescript
interface LiftBenchmark {
  id: string;
  name: string;
  notes?: string;
  weight: number;
  benchmarkTemplateId?: string;
}
```

#### Other Benchmarks
```typescript
interface OtherBenchmark {
  id: string;
  name: string;
  notes?: string;
  measurementNotes?: string;
  value?: number;
  unit?: string;
  benchmarkTemplateId?: string;
}
```

**Endpoints:**
- `GET /lift-benchmarks` - Get all lift benchmarks
- `GET /other-benchmarks` - Get all other benchmarks
- (Same CRUD pattern as activities)

### 7. Benchmark Templates

Templates for creating consistent benchmarks.

**Structure:**
```typescript
interface BenchmarkTemplate {
  id: string;
  name: string;
  notes?: string;
  benchmarkType: "Lift" | "Other";
}
```

**Endpoints:**
- `GET /benchmark-templates` - Get all templates
- `GET /benchmark-templates/:id` - Get by ID
- `GET /benchmark-templates/type/:type` - Get by type
- `POST /benchmark-templates` - Create
- `PUT /benchmark-templates/:id` - Update
- `PATCH /benchmark-templates/:id` - Partial update
- `DELETE /benchmark-templates/:id` - Delete

### 8. Users

System users with authentication.

**Structure:**
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  role: "trainer" | "admin";
  phone?: string;
  createdAt: string;
  updatedAt: string;
}
```

**Endpoints:**
- `GET /users` - Get all users (admin only)
- `GET /users/:id` - Get user by ID (admin only)
- `POST /users` - Create user (admin only)
- `PUT /users/:id` - Update user (admin only)
- `PATCH /users/:id` - Partial update (admin only)
- `DELETE /users/:id` - Delete user (admin only)

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "count": 1,
  "data": { /* resource data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

## Client Implementation Recommendations

### 1. State Management

Consider using a state management solution (Redux, Zustand, Context API) to handle:
- Authentication state
- Cached data (programs, clients, activities)
- Form state for complex nested objects

### 2. Data Fetching

Implement a robust data fetching strategy:
- Use React Query or SWR for caching and synchronization
- Implement optimistic updates for better UX
- Handle loading and error states gracefully

### 3. Form Handling

For complex nested forms (programs, weekly schedules):
- Use form libraries like React Hook Form or Formik
- Implement dynamic form arrays for blocks/weeks/activities
- Add validation for required fields and data types

### 4. Authentication Flow

```typescript
// Example authentication flow
const login = async (username: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });
  
  if (response.ok) {
    const data = await response.json();
    // Store user info in state
    return data.user;
  }
  throw new Error('Login failed');
};
```

### 5. Protected Routes

Implement route protection based on authentication status and user role:

```typescript
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/unauthorized" />;
  
  return children;
};
```

### 6. Real-time Updates

Consider implementing WebSocket connections for:
- Real-time updates to weekly schedules
- Live client attendance tracking
- Instant notifications for schedule changes

### 7. Data Synchronization

Implement strategies for:
- Offline support with local storage
- Conflict resolution for concurrent edits
- Periodic data refresh for critical information

## Key Features to Implement

### 1. Program Builder
- Drag-and-drop interface for building workout programs
- Visual representation of blocks, weeks, and days
- Activity selection from templates
- Progress tracking and completion

### 2. Schedule Manager
- Weekly calendar view with time slots
- Client assignment interface
- Capacity management
- Baseline schedule management

### 3. Client Dashboard
- Individual client progress tracking
- Benchmark history and trends
- Program assignment and completion
- Weight and measurement tracking

### 4. Admin Panel
- User management
- System configuration
- Data export/import
- Analytics and reporting

## Error Handling

Implement comprehensive error handling:
- Network errors
- Validation errors
- Authentication errors
- Permission errors
- Server errors

## Performance Considerations

- Implement pagination for large datasets
- Use virtual scrolling for long lists
- Optimize images and assets
- Implement proper caching strategies
- Consider code splitting for large applications

## Testing Strategy

- Unit tests for utility functions
- Integration tests for API calls
- E2E tests for critical user flows
- Mock API responses for development

This guide provides a foundation for building a robust client application that effectively utilizes the IronLogic API. The modular structure allows for incremental development and easy maintenance. 