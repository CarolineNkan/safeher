# SOS Emergency System Design Document

## Overview

The SOS Emergency System is a critical safety feature for SafeHER that provides users with immediate emergency assistance capabilities. The system enables one-tap emergency activation with countdown protection, continuous location tracking, emergency contact notifications, and audible alarms. The design prioritizes reliability, user safety, and seamless integration with the existing SafeHER ecosystem.

## Architecture

The SOS system follows a client-server architecture with real-time capabilities:

### Client-Side Components
- **SOS Page Component**: Main emergency interface with countdown and activation controls
- **Quick SOS Button**: Homepage integration for immediate access
- **Emergency Contacts Management**: UI for managing trusted contacts
- **Location Services**: GPS tracking and fallback mechanisms
- **Audio System**: Alarm generation and control

### Server-Side Components
- **SOS API Endpoints**: RESTful APIs for SOS lifecycle management
- **Database Layer**: Persistent storage for SOS events and contacts
- **Notification Service**: SMS/messaging integration for emergency contacts
- **Location Tracking**: Real-time coordinate storage and updates

### External Integrations
- **Mapbox API**: Location services and mapping
- **Supabase**: Database and authentication
- **SMS Service**: Emergency contact notifications (Twilio integration ready)

## Components and Interfaces

### Core Components

#### SOSPage Component
```typescript
interface SOSPageProps {
  className?: string;
}

interface SOSState {
  state: "idle" | "countdown" | "activated";
  secondsLeft: number;
  sosId: string | null;
  userLocation: UserLocation | null;
  alarmEnabled: boolean;
  isLocationUpdating: boolean;
}
```

#### Emergency Contact Management
```typescript
interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  created_at: string;
  updated_at: string;
}

interface EmergencyContactsManager {
  addContact(contact: Omit<EmergencyContact, 'id' | 'created_at' | 'updated_at'>): Promise<EmergencyContact>;
  removeContact(contactId: string): Promise<void>;
  getContacts(userId: string): Promise<EmergencyContact[]>;
  updateContact(contactId: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact>;
}
```

#### Location Services
```typescript
interface LocationService {
  getCurrentLocation(): Promise<UserLocation>;
  startLocationTracking(sosId: string, interval: number): void;
  stopLocationTracking(): void;
  getLastKnownLocation(): UserLocation | null;
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}
```

### API Interfaces

#### SOS Trigger API
```typescript
// POST /api/sos/trigger
interface SOSTriggerRequest {
  lat: number;
  lng: number;
}

interface SOSTriggerResponse {
  success: boolean;
  sos_id?: string;
  message: string;
  emergency_contacts_notified?: number;
}
```

#### SOS Update Location API
```typescript
// POST /api/sos/update-location
interface SOSUpdateRequest {
  sos_id: string;
  lat: number;
  lng: number;
}

interface SOSUpdateResponse {
  success: boolean;
  location_id?: string;
  message: string;
  notification_sent?: boolean;
}
```

#### SOS Cancel API
```typescript
// POST /api/sos/cancel
interface SOSCancelRequest {
  sos_id: string;
}

interface SOSCancelResponse {
  success: boolean;
  message: string;
  ended_at?: string;
}
```

## Data Models

### Database Schema

#### sos_events Table
```sql
CREATE TABLE sos_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    initial_lat DOUBLE PRECISION NOT NULL,
    initial_lng DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### sos_locations Table
```sql
CREATE TABLE sos_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sos_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### emergency_contacts Table
```sql
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Data Relationships
- One user can have multiple SOS events (one-to-many)
- One SOS event can have multiple location updates (one-to-many)
- One user can have multiple emergency contacts (one-to-many)
- Emergency contacts are notified for all SOS events from their associated user

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all identified properties, several can be consolidated to eliminate redundancy:

- Properties 1.1 and 1.5 both test UI responsiveness and can be combined into a single comprehensive property
- Properties 2.2 and 2.5 both test cancellation feedback and can be consolidated
- Properties 3.1 and 3.5 both test location tracking behavior and can be combined
- Properties 4.4 and 4.5 both test contact management UI and can be consolidated
- Properties 5.2 and 5.4 both test notification content and can be combined
- Properties 6.1 and 6.2 both test alarm functionality and can be consolidated
- Properties 7.1 and 7.3 both test UI display requirements and can be combined as examples

### Core Properties

**Property 1: SOS Activation Responsiveness**
*For any* SOS button interaction, the system should immediately provide visual feedback and initiate the countdown timer within the expected timeframe
**Validates: Requirements 1.1, 1.5**

**Property 2: Countdown to Activation**
*For any* completed countdown sequence, the system should automatically activate the SOS event and create a database record with unique identifier
**Validates: Requirements 1.2, 1.4**

**Property 3: Location Capture Consistency**
*For any* SOS activation, the system should capture and store the user's location coordinates at the time of activation
**Validates: Requirements 1.3**

**Property 4: Cancellation During Countdown**
*For any* cancel action during countdown, the system should abort activation, return to idle state, and provide confirmation feedback
**Validates: Requirements 2.2, 2.5**

**Property 5: Active SOS Cancellation**
*For any* active SOS event cancellation, the system should mark the event inactive, record end time, stop all processes, and provide confirmation
**Validates: Requirements 2.3, 2.4**

**Property 6: Location Tracking Frequency**
*For any* active SOS event, the system should request location updates every 5 seconds and display current coordinates to the user
**Validates: Requirements 3.1, 3.5**

**Property 7: Location Data Persistence**
*For any* location update received, the system should store coordinates with timestamp and associate with the correct SOS event
**Validates: Requirements 3.2, 3.4**

**Property 8: Location Service Fallback**
*For any* location service failure, the system should use last known location and notify the user appropriately
**Validates: Requirements 3.3**

**Property 9: Emergency Contact Management**
*For any* emergency contact operation (add/remove/modify), the system should validate data, persist changes immediately, and display updated information
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

**Property 10: Emergency Notification Delivery**
*For any* SOS activation, the system should retrieve all emergency contacts and send notifications containing location information and map links
**Validates: Requirements 5.1, 5.2, 5.4**

**Property 11: Notification Rate Limiting**
*For any* active SOS with location updates, the system should send updated notifications at most every 2 minutes
**Validates: Requirements 5.3**

**Property 12: Notification Error Handling**
*For any* notification delivery failure, the system should log the error and continue processing other contacts
**Validates: Requirements 5.5**

**Property 13: Alarm System Control**
*For any* SOS activation with alarm enabled, the system should play continuous alarm at maximum volume and stop immediately when cancelled
**Validates: Requirements 6.1, 6.2, 6.3**

**Property 14: Alarm Preference Persistence**
*For any* alarm setting change, the system should save the preference and restore it for future activations
**Validates: Requirements 6.4, 6.5**

**Property 15: Quick Access Navigation**
*For any* quick SOS button press, the system should navigate directly to the SOS activation page
**Validates: Requirements 7.2**

**Property 16: Location Permission Handling**
*For any* SOS page load without location permissions, the system should request permissions and inform users of requirements
**Validates: Requirements 7.4, 7.5**

**Property 17: Network Resilience**
*For any* network connectivity issues, the system should queue location updates and retry with exponential backoff
**Validates: Requirements 8.1, 8.4**

**Property 18: GPS Signal Fallback**
*For any* weak GPS signal scenario, the system should use the most recent available location data
**Validates: Requirements 8.2**

**Property 19: Database Error Recovery**
*For any* database operation failure, the system should retry the operation and provide clear user feedback
**Validates: Requirements 8.3, 8.5**

## Error Handling

### Client-Side Error Handling
- **Location Permission Denied**: Display clear message explaining SOS requires location access
- **GPS Signal Weak/Unavailable**: Use cached location with user notification
- **Network Connectivity Issues**: Queue operations and retry with exponential backoff
- **Audio Context Errors**: Gracefully handle audio failures without blocking SOS functionality

### Server-Side Error Handling
- **Database Connection Failures**: Implement connection pooling and retry logic
- **Invalid Location Coordinates**: Validate latitude/longitude ranges before storage
- **Missing SOS Event**: Return appropriate 404 responses with clear error messages
- **SMS Service Failures**: Log errors and continue with other notification methods

### Graceful Degradation
- SOS functionality works even if some features fail (e.g., alarm, notifications)
- Location tracking continues even if individual updates fail
- Emergency contacts are processed independently (failure of one doesn't block others)

## Testing Strategy

### Unit Testing Approach
The system will use comprehensive unit testing to verify specific functionality:

- **Component Testing**: Test individual React components with various props and states
- **API Endpoint Testing**: Verify request/response handling, validation, and error cases
- **Database Operations**: Test CRUD operations, constraints, and RLS policies
- **Location Services**: Test GPS handling, fallback mechanisms, and coordinate validation
- **Notification System**: Test message formatting, delivery logic, and error handling

### Property-Based Testing Approach
The system will implement property-based testing using **fast-check** (JavaScript/TypeScript property testing library) to verify universal properties:

- **Configuration**: Each property-based test will run a minimum of 100 iterations
- **Test Tagging**: Each property-based test will include a comment with the format: `**Feature: sos-emergency-system, Property {number}: {property_text}**`
- **Coverage**: Property tests will verify that correctness properties hold across all valid inputs
- **Generators**: Smart test data generators will create realistic SOS scenarios, location coordinates, and user interactions

### Integration Testing
- **End-to-End SOS Flow**: Test complete SOS activation, tracking, and cancellation workflows
- **Database Integration**: Verify data persistence and retrieval across all tables
- **External Service Integration**: Test Mapbox API calls and SMS service integration
- **Cross-Component Communication**: Verify proper data flow between UI components and APIs

### Testing Tools and Framework
- **Testing Framework**: Vitest (already configured in the project)
- **Property Testing Library**: fast-check for property-based testing
- **Component Testing**: React Testing Library for UI component testing
- **API Testing**: Supertest or similar for API endpoint testing
- **Database Testing**: Test database with isolated test data and cleanup

The dual testing approach ensures comprehensive coverage: unit tests catch specific bugs and edge cases, while property tests verify that the system behaves correctly across all possible inputs and scenarios.