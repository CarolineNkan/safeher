# Database Setup Instructions

The database schema for the story management system has been prepared but needs to be applied to your Supabase database.

## Quick Setup (Recommended)

1. **Open your Supabase project dashboard**
2. **Navigate to the SQL Editor**
3. **Copy and paste the contents of `database/story-management-setup.sql`**
4. **Execute the script**

This will create:
- ✅ `reactions` table with proper foreign key relationships
- ✅ `get_reaction_counts()` database function for efficient aggregation
- ✅ `user_id` column in the `stories` table (if not present)
- ✅ Proper indexes and Row Level Security policies

## Verification

After running the setup, you can verify it worked by running:

```bash
npm run test test/database-schema.test.ts
```

All tests should pass if the setup was successful.

## Alternative Setup Methods

### Using Node.js Script
```bash
npm run db:migrate
```

### Manual Verification
```bash
npm run db:verify
```

## Files Created

- `database/story-management-setup.sql` - Complete setup script
- `database/migrations/001_story_management_schema.sql` - Migration file
- `scripts/run-migration.js` - Node.js migration runner
- `scripts/verify-database.js` - Database verification script
- `types/database.ts` - TypeScript type definitions
- `test/database-schema.test.ts` - Schema verification tests

## Next Steps

Once the database is set up, you can proceed with the remaining tasks:
- Create the delete API endpoint
- Enhance the StoryCard component
- Implement the enhanced reaction system
- Add real-time subscriptions

The database foundation is now ready for the story management system!