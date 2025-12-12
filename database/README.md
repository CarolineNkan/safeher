# Story Management Database Setup

This directory contains the database schema and migration files for the enhanced story management system.

## Files

- `story-management-setup.sql` - Complete SQL script to set up the enhanced story management schema
- `migrations/001_story_management_schema.sql` - Migration file for version control
- `../scripts/run-migration.js` - Node.js script to apply migrations programmatically

## Manual Setup (Recommended)

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `story-management-setup.sql`
4. Execute the script

This will:
- Add `user_id` column to the existing `stories` table
- Create the `reactions` table with proper foreign key relationships
- Create database functions for efficient reaction counting
- Set up Row Level Security (RLS) policies
- Create necessary indexes for performance

## Programmatic Setup (Alternative)

If you prefer to run the migration via Node.js:

```bash
# Install dependencies if not already installed
npm install @supabase/supabase-js dotenv

# Run the migration
node scripts/run-migration.js
```

## Schema Overview

### Stories Table (Enhanced)
- Existing columns: `id`, `message`, `created_at`, `lat`, `lng`, `location`, `likes`, `helpful`, `noted`
- New column: `user_id` (UUID) - tracks story ownership

### Reactions Table (New)
- `id` (UUID, Primary Key)
- `story_id` (UUID, Foreign Key to stories.id)
- `user_id` (UUID) - user who made the reaction
- `type` (TEXT) - 'like', 'helpful', or 'noted'
- `created_at` (TIMESTAMP)
- Unique constraint on (story_id, user_id, type)

### Database Functions

#### `get_reaction_counts(story_uuid UUID)`
Returns reaction counts for a specific story:
```sql
SELECT * FROM get_reaction_counts('story-uuid-here');
-- Returns: { likes: 5, helpful: 2, noted: 1 }
```

#### `get_story_with_counts(story_uuid UUID)`
Returns a story with its reaction counts:
```sql
SELECT * FROM get_story_with_counts('story-uuid-here');
```

#### `get_all_stories_with_counts()`
Returns all stories with their reaction counts:
```sql
SELECT * FROM get_all_stories_with_counts();
```

## Security

- Row Level Security (RLS) is enabled on the reactions table
- Users can read all reactions but only insert/delete their own
- Proper foreign key constraints ensure data integrity

## Performance

- Indexes are created on frequently queried columns
- Database functions use efficient aggregation queries
- Unique constraints prevent duplicate reactions

## Verification

After running the setup, you can verify the installation with:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('stories', 'reactions');

-- Check stories table has user_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'stories';

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%reaction%' OR routine_name LIKE '%story%';
```