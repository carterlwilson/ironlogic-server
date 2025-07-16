# End-to-End Test Suite Implementation Plan

## Overview

Comprehensive plan to implement a full E2E test suite for the IronLogic multi-tenant gym management server, covering all API endpoints, authentication flows, and business logic.

## Test Framework Selection

### Recommended Stack
- **Test Runner**: Jest (already familiar in Node.js ecosystem)
- **HTTP Testing**: Supertest (seamless Express integration)
- **Database**: In-memory MongoDB (mongodb-memory-server)
- **Test Data**: Factory pattern with faker.js
- **Coverage**: Built-in Jest coverage
- **CI/CD**: GitHub Actions integration

### Alternative Considerations
- **Vitest**: Faster than Jest, better TypeScript support
- **Playwright**: For true browser-based E2E if needed later

## Project Structure

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── auth.test.ts
│   │   ├── gym-context.test.ts
│   │   └── multi-tenant-auth.test.ts
│   ├── gyms/
│   │   ├── gym-management.test.ts
│   │   ├── gym-members.test.ts
│   │   └── gym-authorization.test.ts
│   ├── locations/
│   │   ├── location-management.test.ts
│   │   └── location-authorization.test.ts
│   ├── schedules/
│   │   ├── schedule-management.test.ts
│   │   ├── enrollment.test.ts
│   │   └── capacity-limits.test.ts
│   ├── clients/
│   │   ├── client-management.test.ts
│   │   └── client-authorization.test.ts
│   ├── programs/
│   │   ├── program-management.test.ts
│   │   ├── templates.test.ts
│   │   └── assignment.test.ts
│   └── data-isolation/
│       ├── cross-tenant.test.ts
│       └── permission-boundaries.test.ts
├── fixtures/
│   ├── users.ts
│   ├── gyms.ts
│   ├── locations.ts
│   ├── schedules.ts
│   └── programs.ts
├── helpers/
│   ├── test-server.ts
│   ├── database.ts
│   ├── auth-helpers.ts
│   └── api-client.ts
└── setup/
    ├── jest.config.ts
    ├── setup-tests.ts
    └── teardown-tests.ts
```

## Implementation Phases

### Phase 1: Foundation & Setup (Week 1)

#### 1.1 Environment Setup
```bash
npm install --save-dev jest @types/jest supertest @types/supertest
npm install --save-dev mongodb-memory-server faker @types/faker
npm install --save-dev ts-jest @types/node
```

#### 1.2 Jest Configuration
**File: `tests/setup/jest.config.ts`**
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/setup-tests.ts'],
  globalTeardown: '<rootDir>/tests/setup/teardown-tests.ts',
  testTimeout: 30000,
  maxWorkers: 1, // Ensure tests run sequentially for database isolation
};
```

#### 1.3 Test Database Setup
**File: `tests/helpers/database.ts`**
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

export const setupTestDatabase = async () => {
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'ironlogic-test'
    }
  });
  
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

export const teardownTestDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
```

#### 1.4 Test Server Setup
**File: `tests/helpers/test-server.ts`**
```typescript
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { setupTestDatabase } from './database';

// Import all routes
import authRoutes from '../../src/routes/auth';
import gymRoutes from '../../src/routes/gyms';
// ... other routes

export const createTestApp = async () => {
  await setupTestDatabase();
  
  const app = express();
  
  // Middleware setup (minimal for testing)
  app.use(express.json());
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/gyms', gymRoutes);
  // ... other routes
  
  return app;
};
```

### Phase 2: Test Data Factories (Week 1)

#### 2.1 User Factory
**File: `tests/fixtures/users.ts`**
```typescript
import { faker } from '@faker-js/faker';
import { User } from '../../src/mongooseSchemas/User';
import { IUser } from '../../src/models/User';

export const createTestUser = async (overrides: Partial<IUser> = {}) => {
  const userData = {
    email: faker.internet.email(),
    password: 'password123',
    name: faker.person.fullName(),
    role: 'user' as const,
    isActive: true,
    ...overrides
  };
  
  return await User.create(userData);
};

export const createAdminUser = async (overrides: Partial<IUser> = {}) => {
  return createTestUser({
    role: 'admin',
    email: 'admin@test.com',
    ...overrides
  });
};
```

#### 2.2 Gym Factory
**File: `tests/fixtures/gyms.ts`**
```typescript
import { faker } from '@faker-js/faker';
import { Gym } from '../../src/mongooseSchemas/Gym';
import { IGym } from '../../src/models/Gym';

export const createTestGym = async (overrides: Partial<IGym> = {}) => {
  const gymData = {
    name: faker.company.name() + ' Fitness',
    description: faker.lorem.sentence(),
    address: faker.location.streetAddress(),
    phone: faker.phone.number('(###) ###-####'),
    email: faker.internet.email(),
    isActive: true,
    ...overrides
  };
  
  return await Gym.create(gymData);
};
```

#### 2.3 API Client Helper
**File: `tests/helpers/api-client.ts`**
```typescript
import supertest from 'supertest';
import { Express } from 'express';

export class ApiClient {
  private agent: supertest.SuperAgentTest;
  
  constructor(app: Express) {
    this.agent = supertest.agent(app);
  }
  
  async login(email: string, password: string) {
    const response = await this.agent
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    
    return response.body.data;
  }
  
  async loginAsAdmin() {
    const adminUser = await createAdminUser();
    return this.login(adminUser.email, 'password123');
  }
  
  async selectGym(gymId: string) {
    const response = await this.agent
      .post(`/api/auth/select-gym/${gymId}`)
      .expect(200);
    
    return response.body.data;
  }
  
  // Gym-scoped helpers
  async getGymClients(gymId: string) {
    return this.agent
      .get(`/api/gyms/${gymId}/clients`)
      .expect(200);
  }
  
  async createGymLocation(gymId: string, locationData: any) {
    return this.agent
      .post(`/api/gyms/${gymId}/locations`)
      .send(locationData)
      .expect(201);
  }
  
  // Add more helpers as needed
}
```

### Phase 3: Authentication & Authorization Tests (Week 2)

#### 3.1 Basic Authentication Tests
**File: `tests/e2e/auth/auth.test.ts`**
```typescript
describe('Authentication', () => {
  let app: Express;
  let client: ApiClient;
  
  beforeAll(async () => {
    app = await createTestApp();
    client = new ApiClient(app);
  });
  
  beforeEach(async () => {
    await clearDatabase();
  });
  
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        password: 'password123'
      });
      
      const response = await client.login('test@example.com', 'password123');
      
      expect(response.email).toBe('test@example.com');
      expect(response.gymMemberships).toEqual([]);
      expect(response.gymCount).toBe(0);
    });
    
    it('should return gym memberships on login', async () => {
      const user = await createTestUser();
      const gym = await createTestGym();
      await createGymMembership(user.id, gym.id, 'owner');
      
      const response = await client.login(user.email, 'password123');
      
      expect(response.gymMemberships).toHaveLength(1);
      expect(response.gymMemberships[0].gym.id).toBe(gym.id);
      expect(response.gymMemberships[0].role).toBe('owner');
    });
    
    it('should reject invalid credentials', async () => {
      await createTestUser({ email: 'test@example.com' });
      
      await supertest(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' })
        .expect(401);
    });
  });
});
```

#### 3.2 Multi-Tenant Authorization Tests
**File: `tests/e2e/auth/gym-context.test.ts`**
```typescript
describe('Gym Context Management', () => {
  let app: Express;
  let client: ApiClient;
  let user: any;
  let gym1: any;
  let gym2: any;
  
  beforeAll(async () => {
    app = await createTestApp();
    client = new ApiClient(app);
  });
  
  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser();
    gym1 = await createTestGym();
    gym2 = await createTestGym();
    await createGymMembership(user.id, gym1.id, 'owner');
    await createGymMembership(user.id, gym2.id, 'client');
  });
  
  describe('GET /api/auth/my-gyms', () => {
    it('should return user gym memberships', async () => {
      await client.login(user.email, 'password123');
      
      const response = await client.agent
        .get('/api/auth/my-gyms')
        .expect(200);
      
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });
  });
  
  describe('POST /api/auth/select-gym/:gymId', () => {
    it('should set gym context for valid membership', async () => {
      await client.login(user.email, 'password123');
      
      const response = await client.selectGym(gym1.id);
      
      expect(response.gym.id).toBe(gym1.id);
      expect(response.role).toBe('owner');
    });
    
    it('should reject access to non-member gym', async () => {
      const otherGym = await createTestGym();
      await client.login(user.email, 'password123');
      
      await client.agent
        .post(`/api/auth/select-gym/${otherGym.id}`)
        .expect(403);
    });
  });
});
```

### Phase 4: Data Isolation Tests (Week 2)

#### 4.1 Cross-Tenant Security Tests
**File: `tests/e2e/data-isolation/cross-tenant.test.ts`**
```typescript
describe('Cross-Tenant Data Isolation', () => {
  let app: Express;
  let gym1Owner: ApiClient;
  let gym2Owner: ApiClient;
  let gym1: any;
  let gym2: any;
  
  beforeAll(async () => {
    app = await createTestApp();
    gym1Owner = new ApiClient(app);
    gym2Owner = new ApiClient(app);
  });
  
  beforeEach(async () => {
    await clearDatabase();
    
    // Setup two separate gym owners
    const user1 = await createTestUser({ email: 'owner1@test.com' });
    const user2 = await createTestUser({ email: 'owner2@test.com' });
    
    gym1 = await createTestGym();
    gym2 = await createTestGym();
    
    await createGymMembership(user1.id, gym1.id, 'owner');
    await createGymMembership(user2.id, gym2.id, 'owner');
    
    await gym1Owner.login('owner1@test.com', 'password123');
    await gym1Owner.selectGym(gym1.id);
    
    await gym2Owner.login('owner2@test.com', 'password123');
    await gym2Owner.selectGym(gym2.id);
  });
  
  describe('Client Data Isolation', () => {
    it('should not allow access to other gym clients', async () => {
      // Create client in gym1
      const gym1Client = await createTestClient({ gymId: gym1.id });
      
      // Gym2 owner should not see gym1 clients
      const response = await gym2Owner.getGymClients(gym2.id);
      expect(response.body.data).toHaveLength(0);
      
      // Gym2 owner should not be able to access gym1 client directly
      await gym2Owner.agent
        .get(`/api/gyms/${gym2.id}/clients/${gym1Client.id}`)
        .expect(404);
    });
    
    it('should not allow cross-gym client creation', async () => {
      // Try to create client in gym1 while authenticated for gym2
      await gym2Owner.agent
        .post(`/api/gyms/${gym1.id}/clients`)
        .send(createClientData())
        .expect(403);
    });
  });
  
  describe('Location Data Isolation', () => {
    it('should isolate location data between gyms', async () => {
      const gym1Location = await createTestLocation({ gymId: gym1.id });
      
      // Gym2 owner cannot see gym1 locations
      const response = await gym2Owner.agent
        .get(`/api/gyms/${gym2.id}/locations`)
        .expect(200);
      
      expect(response.body.data).toHaveLength(0);
    });
  });
});
```

### Phase 5: Business Logic Tests (Week 3)

#### 5.1 Schedule Enrollment Tests
**File: `tests/e2e/schedules/enrollment.test.ts`**
```typescript
describe('Schedule Enrollment', () => {
  let app: Express;
  let client: ApiClient;
  let gym: any;
  let location: any;
  let schedule: any;
  
  beforeAll(async () => {
    app = await createTestApp();
    client = new ApiClient(app);
  });
  
  beforeEach(async () => {
    await clearDatabase();
    
    const user = await createTestUser();
    gym = await createTestGym();
    await createGymMembership(user.id, gym.id, 'owner');
    
    await client.login(user.email, 'password123');
    await client.selectGym(gym.id);
    
    location = await createTestLocation({ gymId: gym.id });
    schedule = await createTestSchedule({
      gymId: gym.id,
      locationId: location.id,
      days: [
        {
          dayOfWeek: 1,
          timeSlots: [
            {
              startTime: '09:00',
              endTime: '10:00',
              maxCapacity: 2,
              clientIds: [],
              activityType: 'CrossFit'
            }
          ]
        }
      ]
    });
  });
  
  describe('Client Enrollment', () => {
    it('should enroll client in available slot', async () => {
      const response = await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({
          dayOfWeek: 1,
          timeSlotIndex: 0,
          clientId: 'client123'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.days[0].timeSlots[0].clientIds).toContain('client123');
    });
    
    it('should reject enrollment when at capacity', async () => {
      // Fill the slot to capacity (2 clients)
      await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client1' });
      
      await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client2' });
      
      // Third enrollment should fail
      await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client3' })
        .expect(400);
    });
    
    it('should reject duplicate enrollment', async () => {
      // Enroll client
      await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client123' });
      
      // Try to enroll same client again
      await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client123' })
        .expect(400);
    });
  });
  
  describe('Client Unenrollment', () => {
    it('should unenroll enrolled client', async () => {
      // First enroll
      await client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client123' });
      
      // Then unenroll
      const response = await client.agent
        .delete(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/unenroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client123' })
        .expect(200);
      
      expect(response.body.data.days[0].timeSlots[0].clientIds).not.toContain('client123');
    });
    
    it('should reject unenrollment of non-enrolled client', async () => {
      await client.agent
        .delete(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/unenroll`)
        .send({ dayOfWeek: 1, timeSlotIndex: 0, clientId: 'client123' })
        .expect(400);
    });
  });
});
```

### Phase 6: Role-Based Authorization Tests (Week 3)

#### 6.1 Permission Matrix Tests
**File: `tests/e2e/authorization/role-permissions.test.ts`**
```typescript
describe('Role-Based Authorization', () => {
  let app: Express;
  let adminClient: ApiClient;
  let ownerClient: ApiClient;
  let trainerClient: ApiClient;
  let clientUser: ApiClient;
  let gym: any;
  
  beforeAll(async () => {
    app = await createTestApp();
    adminClient = new ApiClient(app);
    ownerClient = new ApiClient(app);
    trainerClient = new ApiClient(app);
    clientUser = new ApiClient(app);
  });
  
  beforeEach(async () => {
    await clearDatabase();
    
    gym = await createTestGym();
    
    // Create users with different roles
    const admin = await createAdminUser();
    const owner = await createTestUser({ email: 'owner@test.com' });
    const trainer = await createTestUser({ email: 'trainer@test.com' });
    const client = await createTestUser({ email: 'client@test.com' });
    
    await createGymMembership(owner.id, gym.id, 'owner');
    await createGymMembership(trainer.id, gym.id, 'trainer');
    await createGymMembership(client.id, gym.id, 'client');
    
    // Login all users
    await adminClient.loginAsAdmin();
    await ownerClient.login('owner@test.com', 'password123');
    await trainerClient.login('trainer@test.com', 'password123');
    await clientUser.login('client@test.com', 'password123');
    
    // Select gym context for non-admin users
    await ownerClient.selectGym(gym.id);
    await trainerClient.selectGym(gym.id);
    await clientUser.selectGym(gym.id);
  });
  
  describe('Gym Management Permissions', () => {
    it('should allow admin to create gyms', async () => {
      await adminClient.agent
        .post('/api/gyms')
        .send(createGymData())
        .expect(201);
    });
    
    it('should deny non-admin gym creation', async () => {
      const gymData = createGymData();
      
      await ownerClient.agent.post('/api/gyms').send(gymData).expect(403);
      await trainerClient.agent.post('/api/gyms').send(gymData).expect(403);
      await clientUser.agent.post('/api/gyms').send(gymData).expect(403);
    });
  });
  
  describe('Member Management Permissions', () => {
    it('should allow owners to manage members', async () => {
      const newUser = await createTestUser();
      
      await ownerClient.agent
        .post(`/api/gyms/${gym.id}/members`)
        .send({ userId: newUser.id, role: 'client' })
        .expect(201);
    });
    
    it('should deny trainers from managing members', async () => {
      const newUser = await createTestUser();
      
      await trainerClient.agent
        .post(`/api/gyms/${gym.id}/members`)
        .send({ userId: newUser.id, role: 'client' })
        .expect(403);
    });
  });
  
  describe('Client Management Permissions', () => {
    it('should allow owners and trainers to manage clients', async () => {
      const clientData = createClientData();
      
      await ownerClient.agent
        .post(`/api/gyms/${gym.id}/clients`)
        .send(clientData)
        .expect(201);
      
      await trainerClient.agent
        .post(`/api/gyms/${gym.id}/clients`)
        .send(clientData)
        .expect(201);
    });
    
    it('should deny clients from managing other clients', async () => {
      await clientUser.agent
        .post(`/api/gyms/${gym.id}/clients`)
        .send(createClientData())
        .expect(403);
    });
  });
});
```

### Phase 7: Integration & Edge Cases (Week 4)

#### 7.1 Complex Workflow Tests
**File: `tests/e2e/workflows/complete-gym-setup.test.ts`**
```typescript
describe('Complete Gym Setup Workflow', () => {
  it('should handle full gym setup process', async () => {
    const app = await createTestApp();
    const adminClient = new ApiClient(app);
    const ownerClient = new ApiClient(app);
    
    // 1. Admin creates gym
    await adminClient.loginAsAdmin();
    const gymResponse = await adminClient.agent
      .post('/api/gyms')
      .send(createGymData())
      .expect(201);
    
    const gym = gymResponse.body.data;
    
    // 2. Create gym owner user
    const owner = await createTestUser({ email: 'owner@newgym.com' });
    
    // 3. Admin adds owner to gym
    await adminClient.agent
      .post(`/api/gyms/${gym.id}/members`)
      .send({ userId: owner.id, role: 'owner' })
      .expect(201);
    
    // 4. Owner logs in and selects gym
    await ownerClient.login('owner@newgym.com', 'password123');
    await ownerClient.selectGym(gym.id);
    
    // 5. Owner creates location
    const locationResponse = await ownerClient.agent
      .post(`/api/gyms/${gym.id}/locations`)
      .send(createLocationData())
      .expect(201);
    
    const location = locationResponse.body.data;
    
    // 6. Owner creates schedule
    const scheduleResponse = await ownerClient.agent
      .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules`)
      .send(createScheduleData())
      .expect(201);
    
    const schedule = scheduleResponse.body.data;
    
    // 7. Owner creates client
    const clientResponse = await ownerClient.agent
      .post(`/api/gyms/${gym.id}/clients`)
      .send(createClientData())
      .expect(201);
    
    const client = clientResponse.body.data;
    
    // 8. Enroll client in class
    await ownerClient.agent
      .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
      .send({
        dayOfWeek: 1,
        timeSlotIndex: 0,
        clientId: client.id
      })
      .expect(200);
    
    // 9. Verify complete setup
    const finalSchedule = await ownerClient.agent
      .get(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}`)
      .expect(200);
    
    expect(finalSchedule.body.data.days[0].timeSlots[0].clientIds).toContain(client.id);
  });
});
```

### Phase 8: Performance & Load Tests (Week 4)

#### 8.1 Concurrent User Tests
**File: `tests/e2e/performance/concurrent-users.test.ts`**
```typescript
describe('Concurrent User Operations', () => {
  it('should handle multiple simultaneous enrollments', async () => {
    const app = await createTestApp();
    
    // Setup gym with limited capacity schedule
    const { gym, location, schedule } = await setupTestGymWithSchedule({
      maxCapacity: 10
    });
    
    // Create 15 clients trying to enroll simultaneously
    const enrollmentPromises = Array.from({ length: 15 }, async (_, i) => {
      const client = new ApiClient(app);
      const user = await createTestUser();
      await createGymMembership(user.id, gym.id, 'client');
      
      await client.login(user.email, 'password123');
      await client.selectGym(gym.id);
      
      return client.agent
        .post(`/api/gyms/${gym.id}/locations/${location.id}/schedules/${schedule.id}/enroll`)
        .send({
          dayOfWeek: 1,
          timeSlotIndex: 0,
          clientId: `client${i}`
        });
    });
    
    const results = await Promise.allSettled(enrollmentPromises);
    
    // Should have exactly 10 successful enrollments
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 200
    );
    const failed = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 400
    );
    
    expect(successful).toHaveLength(10);
    expect(failed).toHaveLength(5);
  });
});
```

## CI/CD Integration

### GitHub Actions Configuration
**File: `.github/workflows/test.yml`**
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npm run typecheck
    
    - name: Run tests
      run: npm run test:e2e
      env:
        NODE_ENV: test
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
```

## NPM Scripts
**Add to `package.json`:**
```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "jest --config tests/setup/jest.config.ts",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## Success Metrics

### Coverage Targets
- **Overall Coverage**: 85%+
- **Routes Coverage**: 95%+
- **Business Logic**: 90%+
- **Authorization Logic**: 100%

### Test Categories
- **Unit Tests**: 150+ tests
- **Integration Tests**: 100+ tests
- **Authorization Tests**: 50+ tests
- **Data Isolation Tests**: 30+ tests
- **Performance Tests**: 20+ tests

### Quality Gates
- All tests must pass
- No security vulnerabilities
- Performance benchmarks met
- Code coverage thresholds achieved

This comprehensive test suite will ensure the multi-tenant gym management system is robust, secure, and performant across all user scenarios and edge cases.