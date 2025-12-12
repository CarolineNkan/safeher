# Story Management System Design

## Overview

The story management system extends the existing community story platform with comprehensive CRUD operations, an enhanced reaction system, and real-time synchronization. The design builds upon the current Next.js/Supabase architecture while introducing new database tables, API endpoints, and UI components for story ownership management and improved user engagement.

## Architecture

The system follows a client-server architecture with real-time capabilities:

- **Frontend**: Next.js React components with TypeScript
- **Backend**: Next.js API routes handling HTTP requests
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Real-time**: Supabase real-time channels for live updates
- **State Management**: React hooks with local state management

### Component Hierarchy
```
StoryFeed (Container)
├── StoryComposer (Enhanced UI)
└── StoryCard[] (Enhanced with menu)
    ├── ThreeDotMenu (New)
    └── ReactionButtons (Enhanced)
```

## Components and Interfaces

### Enhanced StoryCard Component
The existing StoryCard component will be extended with:
- Three-dot menu for story owners
- Enhanced reaction system with proper state management
- User ownership validation

### New ThreeDotMenu Component
A dropdown menu component providing:
- Edit functionality for story authors
- Delete functionality with confirmation
- Proper access control based on user ownership

### Enhanced StoryFeed Component
The main feed component will include:
- Menu state management for three-dot menus
- Delete operation handling
- Enhanced real-time subscription management
- Improved composer styling

### API Endpoints

#### DELETE /api/stories/delete
- **Purpose**: Remove stories from the database
- **Method**: POST (following existing pattern)
- **Input**: `{ id: string }`
- **Output**: `{ success: boolean }` or error response
- **Validation**: Story ID required, proper error handling

#### Enhanced Reaction System
- **Purpose**: Replace simple counter increments with proper user-based reactions
- **Database**: New reactions table with user tracking
- **Aggregation**: Database functions for efficient count calculation

## Data Models

### Existing Story Model (Extended)
```typescript
interface Story {
  id: string;
  message: string;
  created_at: string;
  user_id: string; // Added for ownership tracking
  likes: number;
  helpful: number;
  noted: number;
}
```

### New Reaction Model
```typescript
interface Reaction {
  id: string;
  story_id: string;
  user_id: string;
  type: 'like' | 'helpful' | 'noted';
  created_at: string;
}
```

### Database Schema Changes

#### Reactions Table
```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'helpful', 'noted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(story_id, user_id, type)
);
```

#### Reaction Count Function
```sql
CREATE OR REPLACE FUNCTION get_reaction_counts(story UUID)
RETURNS TABLE (
  likes BIGINT,
  helpful BIGINT,
  noted BIGINT
) LANGUAGE SQL AS $$
  SELECT
    COUNT(*) FILTER (WHERE type = 'like') AS likes,
    COUNT(*) FILTER (WHERE type = 'helpful') AS helpful,
    COUNT(*) FILTER (WHERE type = 'noted') AS noted
  FROM reactions
  WHERE story_id = story;
$$;
```## Corre
ctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all testable properties from the prework analysis, I identified several areas where properties can be consolidated:

- Properties 1.1 and 1.2 (menu visibility) can be combined into a single ownership-based visibility property
- Properties 2.2 and 5.2 (reaction recording) are testing the same functionality and can be combined
- Properties 2.4 and 5.3 (reaction counting) are testing the same aggregation logic and can be combined
- Properties 5.4 and 5.5 (error handling and validation) can be combined into a comprehensive API validation property

### Core Properties

**Property 1: Story ownership controls menu visibility**
*For any* story and user combination, the three-dot menu should be visible if and only if the user is the story's author
**Validates: Requirements 1.1, 1.2**

**Property 2: Edit populates composer correctly**
*For any* story, when the edit action is triggered, the composer should be populated with the story's current message content
**Validates: Requirements 1.3**

**Property 3: Delete removes story completely**
*For any* story, when deleted by its author, the story should no longer exist in the database and should be removed from the UI feed
**Validates: Requirements 1.4, 5.1**

**Property 4: Reaction buttons are always present**
*For any* story card, all three reaction buttons (like, helpful, noted) should be displayed and functional
**Validates: Requirements 2.1**

**Property 5: Reaction recording creates correct database entries**
*For any* valid story, user, and reaction type combination, clicking a reaction button should create a database record with the correct story ID, user ID, and reaction type
**Validates: Requirements 2.2, 5.2**

**Property 6: Reaction counts aggregate correctly**
*For any* story with associated reactions, the count function should return accurate totals for each reaction type based on the reactions table
**Validates: Requirements 2.4, 5.3**

**Property 7: Composer functionality preservation**
*For any* composer styling changes, all existing functionality (text input, submission, clearing) should continue to work correctly
**Validates: Requirements 4.4**

**Property 8: API validation and error handling**
*For any* API endpoint, invalid inputs should be rejected with appropriate error messages, and database errors should return proper error responses
**Validates: Requirements 5.4, 5.5**

## Error Handling

### Client-Side Error Handling
- **Network Failures**: Graceful degradation with user feedback for failed API calls
- **Invalid States**: Prevention of actions on non-existent or unauthorized stories
- **UI Errors**: Proper error boundaries and fallback states for component failures

### Server-Side Error Handling
- **Input Validation**: Comprehensive validation of all API inputs before processing
- **Database Errors**: Proper error catching and meaningful error responses
- **Authentication**: Validation of user permissions for story operations

### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  details?: string;
  code?: number;
}
```

## Testing Strategy

### Dual Testing Approach

The system will use both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Unit Testing Requirements

Unit tests will cover:
- Specific examples of story operations (create, edit, delete)
- Edge cases like empty inputs, invalid IDs, and unauthorized access
- Integration points between components and API endpoints
- Error conditions and proper error handling

### Property-Based Testing Requirements

The system will use **fast-check** as the property-based testing library for TypeScript/JavaScript. Each property-based test will:

- Run a minimum of 100 iterations to ensure thorough random testing
- Be tagged with comments explicitly referencing the correctness property from this design document
- Use the exact format: '**Feature: story-management, Property {number}: {property_text}**'
- Each correctness property will be implemented by a SINGLE property-based test

Property-based tests will focus on:
- Story ownership validation across random user/story combinations
- Reaction counting accuracy with various reaction combinations
- API input validation with randomly generated invalid inputs
- Database operation correctness with random valid data

### Test Organization

Tests will be organized as follows:
- `story-management.test.ts` - Core story operations unit tests
- `story-management.property.test.ts` - Property-based tests
- `api-validation.test.ts` - API endpoint validation tests
- `reaction-system.test.ts` - Reaction system unit and property tests

Each test file will include both unit tests and property-based tests as appropriate, with clear separation and proper tagging for traceability to requirements and design properties.