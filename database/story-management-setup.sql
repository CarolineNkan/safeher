-- Story Management System Database Setup
-- Run this script in your Supabase SQL Editor to set up the enhanced story management system

-- Step 1: Add user_id column to stories table if it doesn't exist
-- This enables story ownership tracking
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE stories ADD COLUMN user_id UUID;
        -- Add index for performance on user queries
        CREATE INDEX idx_stories_user_id ON stories(user_id);
        RAISE NOTICE 'Added user_id column to stories table';
    ELSE
        RAISE NOTICE 'user_id column already exists in stories table';
    END IF;
END $$;

-- Step 2: Create reactions table with proper foreign key relationships
-- This table tracks individual user reactions to stories
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'helpful', 'noted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one reaction per user per story per type
    UNIQUE(story_id, user_id, type)
);

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_story_id ON reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(type);

-- Step 4: Create function for efficient reaction count aggregation
-- This function calculates reaction counts for a given story
CREATE OR REPLACE FUNCTION get_reaction_counts(story_uuid UUID)
RETURNS TABLE (
    likes BIGINT,
    helpful BIGINT,
    noted BIGINT
) 
LANGUAGE SQL 
STABLE
AS $$
    SELECT
        COUNT(*) FILTER (WHERE type = 'like') AS likes,
        COUNT(*) FILTER (WHERE type = 'helpful') AS helpful,
        COUNT(*) FILTER (WHERE type = 'noted') AS noted
    FROM reactions
    WHERE story_id = story_uuid;
$$;

-- Step 5: Create helper function to get story with reaction counts
-- This function returns a story with its current reaction counts
CREATE OR REPLACE FUNCTION get_story_with_counts(story_uuid UUID)
RETURNS TABLE (
    id UUID,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location GEOMETRY,
    user_id UUID,
    likes BIGINT,
    helpful BIGINT,
    noted BIGINT
)
LANGUAGE SQL
STABLE
AS $$
    WITH reaction_counts AS (
        SELECT * FROM get_reaction_counts(story_uuid)
    )
    SELECT 
        s.id,
        s.message,
        s.created_at,
        s.lat,
        s.lng,
        s.location,
        s.user_id,
        COALESCE(rc.likes, 0) AS likes,
        COALESCE(rc.helpful, 0) AS helpful,
        COALESCE(rc.noted, 0) AS noted
    FROM stories s
    LEFT JOIN reaction_counts rc ON true
    WHERE s.id = story_uuid;
$$;

-- Step 6: Create function to get all stories with reaction counts
-- This function returns all stories with their current reaction counts
CREATE OR REPLACE FUNCTION get_all_stories_with_counts()
RETURNS TABLE (
    id UUID,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    location GEOMETRY,
    user_id UUID,
    likes BIGINT,
    helpful BIGINT,
    noted BIGINT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT 
        s.id,
        s.message,
        s.created_at,
        s.lat,
        s.lng,
        s.location,
        s.user_id,
        COALESCE(like_counts.count, 0) AS likes,
        COALESCE(helpful_counts.count, 0) AS helpful,
        COALESCE(noted_counts.count, 0) AS noted
    FROM stories s
    LEFT JOIN (
        SELECT story_id, COUNT(*) as count 
        FROM reactions 
        WHERE type = 'like' 
        GROUP BY story_id
    ) like_counts ON s.id = like_counts.story_id
    LEFT JOIN (
        SELECT story_id, COUNT(*) as count 
        FROM reactions 
        WHERE type = 'helpful' 
        GROUP BY story_id
    ) helpful_counts ON s.id = helpful_counts.story_id
    LEFT JOIN (
        SELECT story_id, COUNT(*) as count 
        FROM reactions 
        WHERE type = 'noted' 
        GROUP BY story_id
    ) noted_counts ON s.id = noted_counts.story_id
    ORDER BY s.created_at DESC;
$$;

-- Step 7: Enable Row Level Security (RLS) for reactions table
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for reactions table
-- Allow users to read all reactions
CREATE POLICY "Allow read access to reactions" ON reactions
    FOR SELECT USING (true);

-- Allow users to insert their own reactions
CREATE POLICY "Allow users to insert their own reactions" ON reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "Allow users to delete their own reactions" ON reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Step 9: Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON reactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_reaction_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_story_with_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_stories_with_counts() TO authenticated;

-- Verification queries (optional - run these to verify the setup)
-- SELECT 'Setup completed successfully!' as status;
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('stories', 'reactions');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'stories';
-- SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%reaction%' OR routine_name LIKE '%story%';