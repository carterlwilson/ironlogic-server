# IronLogic Server

A Node.js server with MongoDB integration built with Express, TypeScript, and Mongoose for a fitness training application.

## Features

- 🚀 Express.js server with TypeScript
- 🗄️ MongoDB integration with Mongoose ODM
- 🐳 Docker setup for local MongoDB development
- 📝 RESTful API with CRUD operations
- 🔒 Environment variable configuration
- 🛡️ CORS enabled
- 📊 Health check endpoints
- 🏋️‍♂️ Fitness training data models and routes

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

The `.env` file is already configured with default values for local development:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ironlogic
```

### 3. Start MongoDB with Docker

```bash
# Start MongoDB and MongoDB Express (admin interface)
docker-compose up -d

# Or start only MongoDB
docker-compose up -d mongodb
```

This will start:
- MongoDB on `localhost:27017`
- MongoDB Express (admin interface) on `http://localhost:8081`

### 4. Run the Server

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

The server will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Server and database status

### Authentication
- `POST /api/auth/register` - Register a new user (email, password, name optional, role optional)
- `POST /api/auth/login` - Login user (email, password)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID (admin only)
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Activity Groups
- `GET /api/activity-groups` - Get all activity groups
- `GET /api/activity-groups/:id` - Get activity group by ID
- `POST /api/activity-groups` - Create new activity group
- `PUT /api/activity-groups/:id` - Update activity group
- `DELETE /api/activity-groups/:id` - Delete activity group

### Primary Lift Activities
- `GET /api/primary-lift-activities` - Get all primary lift activities
- `GET /api/primary-lift-activities/:id` - Get primary lift activity by ID
- `POST /api/primary-lift-activities` - Create new primary lift activity
- `PUT /api/primary-lift-activities/:id` - Update primary lift activity
- `DELETE /api/primary-lift-activities/:id` - Delete primary lift activity

### Accessory Lift Activities
- `GET /api/accessory-lift-activities` - Get all accessory lift activities
- `GET /api/accessory-lift-activities/:id` - Get accessory lift activity by ID
- `POST /api/accessory-lift-activities` - Create new accessory lift activity
- `PUT /api/accessory-lift-activities/:id` - Update accessory lift activity
- `DELETE /api/accessory-lift-activities/:id` - Delete accessory lift activity

### Other Activities
- `GET /api/other-activities` - Get all other activities
- `GET /api/other-activities/:id` - Get other activity by ID
- `POST /api/other-activities` - Create new other activity
- `PUT /api/other-activities/:id` - Update other activity
- `DELETE /api/other-activities/:id` - Delete other activity

### Benchmark Templates
- `GET /api/benchmark-templates` - Get all benchmark templates
- `GET /api/benchmark-templates/:id` - Get benchmark template by ID
- `POST /api/benchmark-templates` - Create new benchmark template
- `PUT /api/benchmark-templates/:id` - Update benchmark template
- `DELETE /api/benchmark-templates/:id` - Delete benchmark template

### Activity Templates
- `GET /api/activity-templates` - Get all activity templates
- `GET /api/activity-templates/:id` - Get activity template by ID
- `POST /api/activity-templates` - Create new activity template
- `PUT /api/activity-templates/:id` - Update activity template
- `DELETE /api/activity-templates/:id` - Delete activity template

### Lift Benchmarks
- `GET /api/lift-benchmarks` - Get all lift benchmarks
- `GET /api/lift-benchmarks/:id` - Get lift benchmark by ID
- `POST /api/lift-benchmarks` - Create new lift benchmark
- `PUT /api/lift-benchmarks/:id` - Update lift benchmark
- `DELETE /api/lift-benchmarks/:id` - Delete lift benchmark

### Other Benchmarks
- `GET /api/other-benchmarks` - Get all other benchmarks
- `GET /api/other-benchmarks/:id` - Get other benchmark by ID
- `POST /api/other-benchmarks` - Create new other benchmark
- `PUT /api/other-benchmarks/:id` - Update other benchmark
- `DELETE /api/other-benchmarks/:id` - Delete other benchmark

### Programs
- `GET /api/programs` - Get all programs
- `GET /api/programs/:id` - Get program by ID
- `POST /api/programs` - Create new program
- `PUT /api/programs/:id` - Update program
- `DELETE /api/programs/:id` - Delete program

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

## Data Models

### Activity Groups
- `name` (string, required) - Name of the activity group

### Activities (Base)
- `name` (string, required) - Name of the activity
- `notes` (string, optional) - Additional notes
- `activityGroupId` (ObjectId, required) - Reference to activity group

### Primary Lift Activities
- Extends base Activity
- `weight` (number, required) - Weight used
- `sets` (number, required) - Number of sets
- `repetitions` (number, required) - Number of repetitions
- `benchmarkTemplateId` (string, optional) - Reference to benchmark template

### Accessory Lift Activities
- Extends base Activity
- `weight` (number, required) - Weight used
- `sets` (number, required) - Number of sets
- `repetitions` (number, required) - Number of repetitions
- `benchmarkTemplateId` (string, optional) - Reference to benchmark template

### Other Activities
- Extends base Activity
- `measurementNotes` (string, optional) - Measurement notes

### Benchmark Templates
- `name` (string, required) - Name of the benchmark
- `notes` (string, optional) - Additional notes
- `benchmarkType` (enum, required) - Type: Weight, Time, Repetitions, Other

### Activity Templates
- `name` (string, required) - Name of the activity template
- `activityGroupId` (string, required) - Reference to activity group

### Programs
- `name` (string, required) - Name of the program
- `blocks` (array of ObjectIds) - References to blocks

### Clients
- `email` (string, required, unique) - Client email
- `firstName` (string, required) - First name
- `lastName` (string, required) - Last name
- `benchmarks` (array of ObjectIds) - References to benchmarks
- `programId` (ObjectId, required) - Reference to program
- `weight` (number, required) - Client weight

## Example API Usage

### Create an Activity Group
```bash
curl -X POST http://localhost:3000/api/activity-groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Upper Body"
  }'
```

### Create a Primary Lift Activity
```bash
curl -X POST http://localhost:3000/api/primary-lift-activities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bench Press",
    "notes": "Focus on form",
    "activityGroupId": "ACTIVITY_GROUP_ID_HERE",
    "weight": 135,
    "sets": 3,
    "repetitions": 10,
    "benchmarkTemplateId": "BENCHMARK_TEMPLATE_ID_HERE"
  }'
```

### Create a Client
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "programId": "PROGRAM_ID_HERE",
    "weight": 180
  }'
```

### Create an Activity Template
```bash
curl -X POST http://localhost:3000/api/activity-templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bench Press",
    "activityGroupId": "ACTIVITY_GROUP_ID_HERE"
  }'
```

## Database Management

### MongoDB Express (Admin Interface)
Access the web-based MongoDB admin interface at `http://localhost:8081`

### Database Connection
The server automatically connects to MongoDB on startup. Connection details:
- Host: `localhost`
- Port: `27017`
- Database: `ironlogic`

## Project Structure

```
src/
├── config/
│   └── database.ts              # MongoDB connection configuration
├── models/
│   ├── ActivityGroup.ts         # Activity group model
│   ├── Activity.ts              # Base activity model
│   ├── ActivityTemplate.ts      # Activity template model
│   ├── PrimaryLiftActivity.ts   # Primary lift activity model
│   ├── AccessoryLiftActivity.ts # Accessory lift activity model
│   ├── OtherActivity.ts         # Other activity model
│   ├── Benchmark.ts             # Base benchmark model
│   ├── BenchmarkTemplate.ts     # Benchmark template model
│   ├── Client.ts                # Client model
│   ├── Program.ts               # Program model
│   ├── Block.ts                 # Block model
│   ├── Week.ts                  # Week model
│   ├── Day.ts                   # Day model
│   └── GroupPercentage.ts       # Group percentage model
├── routes/
│   ├── users.ts                 # User API routes
│   ├── activityGroups.ts        # Activity group routes
│   ├── activityTemplates.ts     # Activity template routes
│   ├── primaryLiftActivities.ts # Primary lift activity routes
│   ├── accessoryLiftActivities.ts # Accessory lift activity routes
│   ├── otherActivities.ts       # Other activity routes
│   ├── benchmarkTemplates.ts    # Benchmark template routes
│   ├── programs.ts              # Program routes
│   └── clients.ts               # Client routes
└── server.ts                    # Main server file
```

## Development

### Adding New Models

1. Create a new model file in `src/models/`
2. Define the schema and interface
3. Export the model

### Adding New Routes

1. Create a new route file in `src/routes/`
2. Define the routes using Express Router
3. Import and use in `server.ts`

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_URI_TEST` - Test database connection string

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Troubleshooting

### MongoDB Connection Issues
1. Ensure Docker is running
2. Check if MongoDB container is up: `docker-compose ps`
3. Verify MongoDB is accessible: `docker-compose logs mongodb`

### Port Conflicts
If ports 3000, 27017, or 8081 are in use, modify the `docker-compose.yml` file or `.env` file accordingly.

## Production Deployment

For production deployment:
1. Update the `MONGODB_URI` in your environment variables
2. Set `NODE_ENV=production`
3. Use `npm run build && npm start` to run the compiled version

## License

ISC 