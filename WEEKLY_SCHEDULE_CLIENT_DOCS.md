# Weekly Schedule System - Client Integration Guide

## Overview

The Weekly Schedule system allows admins to manage class schedules with client assignments. The system supports baseline schedules that can be modified and reset as needed. The client app can have tabs for "Baseline Schedule" and "Current Schedule" to manage both versions.

## Data Model

### WeeklySchedule
Single model containing everything needed for weekly schedules.

```typescript
interface TimeSlot {
  startTime: string; // "09:00", "18:30", etc.
  endTime: string; // "10:00", "19:30", etc.
  maxCapacity: number;
  clientIds: string[]; // Array of client IDs assigned to this slot
  notes?: string;
}

interface Day {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  timeSlots: TimeSlot[];
}

interface WeeklySchedule {
  id: string; // Unique identifier for the schedule (auto-generated)
  name: string;
  description?: string;
  days: Day[];
  isBaseline: boolean; // true for baseline, false for current/modified
  createdAt: string;
  updatedAt: string;
}
```

## API Endpoints

### Weekly Schedules
- `GET /api/weekly-schedules` - Get all schedules (with optional `?isBaseline=true/false` filter)
- `GET /api/weekly-schedules/baseline` - Get the baseline schedule
- `GET /api/weekly-schedules/:id` - Get specific schedule
- `POST /api/weekly-schedules` - Create new schedule (admin only)
- `PUT /api/weekly-schedules/:id` - Update schedule (admin only)
- `DELETE /api/weekly-schedules/:id` - Delete schedule (admin only)
- `POST /api/weekly-schedules/baseline/:scheduleId` - Create baseline from existing schedule (admin only)

## Workflow

### 1. Setup Phase (Admin)
1. Create a WeeklySchedule with time slots and client assignments
2. Set `isBaseline: true` to make it the baseline schedule

### 2. Weekly Operations
1. **View Baseline**: Get the baseline schedule (`isBaseline: true`)
2. **Create Current Schedule**: Copy baseline and modify as needed (`isBaseline: false`)
3. **Reset to Baseline**: Use the baseline creation endpoint to reset

### 3. Client Assignment Management
- Assign clients directly to time slots within the schedule
- Track capacity limits per time slot
- Add notes for special circumstances

## Example API Usage

### Creating a Weekly Schedule
```bash
curl -X POST http://localhost:3000/api/weekly-schedules \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "name": "Morning Classes",
    "description": "Early morning strength training",
    "isBaseline": true,
    "days": [
      {
        "dayOfWeek": 1,
        "timeSlots": [
          {
            "startTime": "09:00",
            "endTime": "10:00",
            "maxCapacity": 12,
            "clientIds": ["CLIENT_ID_1", "CLIENT_ID_2"],
            "notes": "Regular attendees"
          },
          {
            "startTime": "10:30",
            "endTime": "11:30",
            "maxCapacity": 8,
            "clientIds": ["CLIENT_ID_3"],
            "notes": "Advanced class"
          }
        ]
      },
      {
        "dayOfWeek": 3,
        "timeSlots": [
          {
            "startTime": "18:00",
            "endTime": "19:00",
            "maxCapacity": 15,
            "clientIds": ["CLIENT_ID_4", "CLIENT_ID_5"],
            "notes": "Evening class"
          }
        ]
      }
    ]
  }'
```

### Getting Baseline Schedule
```bash
curl -X GET http://localhost:3000/api/weekly-schedules/baseline \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### Getting All Current Schedules (Non-baseline)
```bash
curl -X GET "http://localhost:3000/api/weekly-schedules?isBaseline=false" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### Updating a Specific Schedule
```bash
curl -X PUT http://localhost:3000/api/weekly-schedules/SCHEDULE_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "name": "Updated Morning Classes",
    "days": [
      {
        "dayOfWeek": 1,
        "timeSlots": [
          {
            "startTime": "09:00",
            "endTime": "10:00",
            "maxCapacity": 15,
            "clientIds": ["CLIENT_ID_1", "CLIENT_ID_2"],
            "notes": "Updated notes"
          }
        ]
      }
    ]
  }'
```

### Creating Baseline from Current Schedule
```bash
curl -X POST http://localhost:3000/api/weekly-schedules/baseline/SCHEDULE_ID \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### Deleting a Schedule
```bash
curl -X DELETE http://localhost:3000/api/weekly-schedules/SCHEDULE_ID \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## Client App Integration Considerations

### 1. Tab-Based Interface
- **Baseline Tab**: Show the baseline schedule (`isBaseline: true`)
- **Current Tab**: Show the most recent current schedule (`isBaseline: false`)
- **History Tab**: Show all schedules with timestamps

### 2. Capacity Management
- Check `maxCapacity` against current `clientIds.length` for each time slot
- Provide visual indicators when slots are full
- Allow waitlist functionality if needed

### 3. Schedule Management
- Copy baseline to create new current schedule
- Modify current schedule as needed during the week
- Reset to baseline when needed
- Use schedule IDs to identify which schedule to update

### 4. Real-time Updates
- Consider WebSocket integration for real-time schedule updates
- Implement polling for schedule changes during active weeks

### 5. UI/UX Recommendations
- **Calendar View**: Show weekly schedule in calendar format
- **Time Slot Cards**: Display each time slot with capacity and assigned clients
- **Drag & Drop**: Allow dragging clients between time slots
- **Quick Actions**: Buttons for common operations (add client, remove client, etc.)
- **Status Indicators**: Visual cues for baseline vs current schedules
- **Copy/Reset Buttons**: Easy way to copy baseline or reset to baseline

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description"
}
```

### Validation Errors
- Time slot end time must be after start time
- Cannot exceed max capacity for time slots
- Only one baseline schedule allowed at a time

## Security Notes

- All endpoints require authentication
- Admin-only operations are protected by role-based middleware
- Session-based authentication is used
- CSRF protection should be implemented on the client side

## Testing

### Sample Data Creation
1. Create a baseline schedule with time slots and client assignments
2. Create a current schedule by copying and modifying the baseline
3. Test modifying the current schedule
4. Test resetting to baseline

### Edge Cases to Test
- Capacity limits
- Client assignment conflicts
- Baseline creation from current schedule
- Multiple current schedules (should show most recent)

## Future Enhancements

### Potential Features
- Schedule templates for different seasons/periods
- Client preferences and auto-assignment
- Attendance tracking
- Waitlist management
- Integration with external calendar systems
- Schedule versioning and history

### Performance Considerations
- Index on `isBaseline` and `createdAt` for fast queries
- Pagination for large datasets
- Caching frequently accessed schedules
- Optimize population of related data (clients) 