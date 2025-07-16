# IronLogic API Client Guide

Complete guide for frontend applications integrating with the IronLogic multi-tenant gym management API.

## Getting Started

### Base URL
```
Production: https://your-api-domain.com
Development: http://localhost:3000
```

### Authentication
IronLogic uses session-based authentication with cookies. All requests must include credentials.

```javascript
// Configure your HTTP client to include credentials
fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',  // Important: Include cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email, password })
});
```

## Multi-Tenant Authentication Flow

### 1. User Login

**Endpoint:** `POST /api/auth/login`

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
console.log(data);
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "gymMemberships": [
      {
        "gym": {
          "id": "gym123",
          "name": "Downtown Fitness",
          "address": "123 Main St"
        },
        "role": "client",
        "status": "active",
        "joinedAt": "2024-01-15T00:00:00Z"
      },
      {
        "gym": {
          "id": "gym456", 
          "name": "Crossfit Central",
          "address": "456 Oak Ave"
        },
        "role": "trainer",
        "status": "active",
        "joinedAt": "2024-02-01T00:00:00Z"
      }
    ],
    "gymCount": 2
  }
}
```

### 2. Gym Selection

If user belongs to multiple gyms, allow them to select which gym to work with:

**Endpoint:** `GET /api/auth/my-gyms`

```javascript
// Get user's gym memberships
const gymsResponse = await fetch('/api/auth/my-gyms', {
  credentials: 'include'
});
const { data: gymMemberships } = await gymsResponse.json();

// Display gym selection UI
gymMemberships.forEach(membership => {
  console.log(`${membership.gym.name} - Role: ${membership.role}`);
});
```

**Select a gym:**

**Endpoint:** `POST /api/auth/select-gym/:gymId`

```javascript
const selectGym = async (gymId) => {
  const response = await fetch(`/api/auth/select-gym/${gymId}`, {
    method: 'POST',
    credentials: 'include'
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store selected gym in app state
    setCurrentGym(data.data.gym);
    setUserRole(data.data.role);
  }
};
```

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

```javascript
const getCurrentUser = async () => {
  const response = await fetch('/api/auth/me', {
    credentials: 'include'
  });
  return response.json();
};
```

## API Response Format

All API responses follow this consistent structure:

```typescript
// Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
  count?: number;        // For arrays
  message?: string;      // Optional message
  meta?: {              // Context metadata (gym-scoped endpoints)
    userRole: 'owner' | 'trainer' | 'client';
    gymId: string;
    locationId?: string;  // For location-scoped endpoints
  };
}

// Error Response
interface ErrorResponse {
  success: false;
  message: string;
}
```

## Gym-Scoped API Endpoints

Once a gym is selected, all API calls should include the gym ID in the URL path.

### Gym Management

```javascript
// Get gym details
GET /api/gyms/{gymId}

// Get gym members (owner only)
GET /api/gyms/{gymId}/members

// Add member to gym (owner only)
POST /api/gyms/{gymId}/members
{
  "userId": "user123",
  "role": "client"
}

// Update member role (owner only)
PUT /api/gyms/{gymId}/members/{userId}
{
  "role": "trainer",
  "status": "active"
}
```

### Locations

```javascript
// Get all locations for a gym
const getLocations = async (gymId) => {
  const response = await fetch(`/api/gyms/${gymId}/locations`, {
    credentials: 'include'
  });
  return response.json();
};

// Create new location (owner only)
const createLocation = async (gymId, locationData) => {
  const response = await fetch(`/api/gyms/${gymId}/locations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Main Floor',
      address: '123 Gym St, Room A',
      phone: '(555) 123-4567'
    })
  });
  return response.json();
};
```

### Clients

```javascript
// Get all clients in gym
GET /api/gyms/{gymId}/clients

// Get specific client
GET /api/gyms/{gymId}/clients/{clientId}

// Create new client (owner/trainer)
POST /api/gyms/{gymId}/clients
{
  "email": "client@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "weight": 140,
  "membershipStatus": "active"
}

// Update client (owner/trainer)
PUT /api/gyms/{gymId}/clients/{clientId}
```

### Programs

```javascript
// Get all programs for gym
GET /api/gyms/{gymId}/programs

// Get program templates
GET /api/gyms/{gymId}/programs?isTemplate=true

// Create program template (owner/trainer)
POST /api/gyms/{gymId}/programs
{
  "name": "Beginner Strength",
  "isTemplate": true,
  "blocks": [...]
}

// Assign program to client (owner/trainer)
POST /api/gyms/{gymId}/programs/{templateId}/assign/{clientId}
```

## Location-Scoped Scheduling

### Class Schedules

```javascript
// Get schedules for a location
const getLocationSchedules = async (gymId, locationId) => {
  const response = await fetch(
    `/api/gyms/${gymId}/locations/${locationId}/schedules`,
    { credentials: 'include' }
  );
  return response.json();
};

// Create new schedule (owner/trainer)
const createSchedule = async (gymId, locationId, scheduleData) => {
  const response = await fetch(
    `/api/gyms/${gymId}/locations/${locationId}/schedules`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weekly Classes',
        description: 'Main class schedule',
        days: [
          {
            dayOfWeek: 1, // Monday
            timeSlots: [
              {
                startTime: '09:00',
                endTime: '10:00',
                maxCapacity: 15,
                activityType: 'CrossFit',
                notes: 'Beginner friendly'
              }
            ]
          }
        ]
      })
    }
  );
  return response.json();
};
```

### Class Enrollment

```javascript
// Enroll client in a class
const enrollInClass = async (gymId, locationId, scheduleId, enrollmentData) => {
  const response = await fetch(
    `/api/gyms/${gymId}/locations/${locationId}/schedules/${scheduleId}/enroll`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayOfWeek: 1,        // Monday
        timeSlotIndex: 0,    // First time slot
        clientId: 'client123'
      })
    }
  );
  return response.json();
};

// Unenroll from class
const unenrollFromClass = async (gymId, locationId, scheduleId, enrollmentData) => {
  const response = await fetch(
    `/api/gyms/${gymId}/locations/${locationId}/schedules/${scheduleId}/unenroll`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayOfWeek: 1,
        timeSlotIndex: 0,
        clientId: 'client123'
      })
    }
  );
  return response.json();
};
```

## Role-Based UI Development

Use the `meta.userRole` in API responses to show/hide features based on user permissions:

```javascript
const renderGymInterface = (gymData, userRole) => {
  return (
    <div>
      <h1>{gymData.name}</h1>
      
      {/* Everyone can view */}
      <ClientList />
      <ScheduleView />
      
      {/* Trainers and Owners */}
      {['owner', 'trainer'].includes(userRole) && (
        <div>
          <ClientManagement />
          <ProgramManagement />
        </div>
      )}
      
      {/* Owner only */}
      {userRole === 'owner' && (
        <div>
          <GymSettings />
          <MemberManagement />
          <LocationManagement />
        </div>
      )}
      
      {/* Client only */}
      {userRole === 'client' && (
        <div>
          <MyPrograms />
          <ClassEnrollment />
        </div>
      )}
    </div>
  );
};
```

## Frontend State Management

### Recommended State Structure

```javascript
const initialState = {
  // Authentication
  user: null,
  isAuthenticated: false,
  
  // Multi-tenant context
  gymMemberships: [],
  currentGym: null,
  userRole: null, // Role in current gym
  
  // Gym data
  locations: [],
  clients: [],
  programs: [],
  schedules: {},
  
  // UI state
  loading: false,
  error: null
};
```

### React Example with Context

```javascript
import React, { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: data.data });
        
        // Auto-select gym if user only has one
        if (data.data.gymCount === 1) {
          await selectGym(data.data.gymMemberships[0].gym.id);
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Login failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };
  
  const selectGym = async (gymId) => {
    try {
      const response = await fetch(`/api/auth/select-gym/${gymId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        dispatch({ type: 'SELECT_GYM', payload: data.data });
        // Load gym-specific data
        loadGymData(gymId);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to select gym' });
    }
  };
  
  const loadGymData = async (gymId) => {
    // Load locations, clients, programs, etc.
    const [locations, clients, programs] = await Promise.all([
      fetchWithCredentials(`/api/gyms/${gymId}/locations`),
      fetchWithCredentials(`/api/gyms/${gymId}/clients`),
      fetchWithCredentials(`/api/gyms/${gymId}/programs`)
    ]);
    
    dispatch({ type: 'SET_GYM_DATA', payload: { locations, clients, programs } });
  };
  
  return (
    <AppContext.Provider value={{
      ...state,
      login,
      selectGym,
      loadGymData
    }}>
      {children}
    </AppContext.Provider>
  );
};
```

## Error Handling

### Standard Error Handling Pattern

```javascript
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error cases
    if (error.message === 'Authentication required') {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.message.includes('Access denied')) {
      // Show permission error
      showErrorToast('You do not have permission for this action');
    } else {
      // Generic error handling
      showErrorToast(error.message || 'An error occurred');
    }
    
    throw error;
  }
};
```

### Common Error Scenarios

```javascript
// Handle gym access errors
try {
  const clients = await fetchClients(gymId);
} catch (error) {
  if (error.message === 'Access denied: You are not a member of this gym') {
    // User no longer has access to this gym
    redirectToGymSelection();
  }
}

// Handle capacity limits
try {
  await enrollInClass(gymId, locationId, scheduleId, enrollmentData);
  showSuccessToast('Enrolled successfully!');
} catch (error) {
  if (error.message === 'Time slot is at maximum capacity') {
    showErrorToast('Class is full. Please try a different time.');
  } else if (error.message === 'Client already enrolled in this time slot') {
    showErrorToast('You are already enrolled in this class.');
  }
}
```

## Best Practices

### 1. Always Include Credentials
```javascript
// ✅ Correct
fetch('/api/auth/me', { credentials: 'include' });

// ❌ Wrong - cookies won't be sent
fetch('/api/auth/me');
```

### 2. Validate Gym Context
```javascript
// Always check if user has selected a gym before making gym-scoped calls
const fetchClients = async () => {
  if (!currentGym) {
    throw new Error('No gym selected');
  }
  
  return apiCall(`/api/gyms/${currentGym.id}/clients`);
};
```

### 3. Handle Multi-Gym Users
```javascript
// Don't assume users belong to only one gym
const handleLogin = (userData) => {
  if (userData.gymCount === 0) {
    showMessage('Contact support to gain access to a gym');
  } else if (userData.gymCount === 1) {
    // Auto-select the only gym
    selectGym(userData.gymMemberships[0].gym.id);
  } else {
    // Show gym selection UI
    showGymSelection(userData.gymMemberships);
  }
};
```

### 4. Leverage Role Metadata
```javascript
// Use the meta.userRole from API responses
const handleApiResponse = (response) => {
  const { data, meta } = response;
  
  // Update UI based on user's role in current gym
  if (meta?.userRole) {
    updateRoleBasedUI(meta.userRole);
  }
  
  return data;
};
```

### 5. Optimize for Performance
```javascript
// Cache gym data to avoid repeated API calls
const useGymData = (gymId) => {
  const [cache, setCache] = useState({});
  
  const fetchGymData = async (gymId) => {
    if (cache[gymId]) {
      return cache[gymId];
    }
    
    const data = await loadGymData(gymId);
    setCache(prev => ({ ...prev, [gymId]: data }));
    return data;
  };
  
  return { fetchGymData, cached: cache[gymId] };
};
```

This guide provides everything needed to build a robust frontend application that integrates seamlessly with the IronLogic multi-tenant API.