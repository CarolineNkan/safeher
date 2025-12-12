-- Story Management System Database Schema Migration
-- This migration adds the necessary tables and functions for the enhanced story management system

-- Add user_id column to stories table if it doesn't exist
-- This enables story ownership tracking
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE stories ADD COLUMN user_id UUID;
        -- Add index for performance on user queries
        CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
    END IF;
END $$;

-- Create reactions table with proper foreign key relationships
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reactions_story_id ON reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(type);

-- Create function for efficient reaction count aggregation
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

-- Create function to get all stories with their reaction counts
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
        COALESCE(rc.likes, 0) AS likes,
        COALESCE(rc.helpful, 0) AS helpful,
        COALESCE(rc.noted, 0) AS noted
    FROM stories s
    LEFT JOIN (
        SELECT 
            story_id,
            COUNT(*) FILTER (WHERE type = 'like') AS likes,
            COUNT(*) FILTER (WHERE type = 'helpful') AS helpful,
            COUNT(*) FILTER (WHERE type = 'noted') AS noted
        FROM reactions
        GROUP BY story_id
    ) rc ON s.id = rc.story_id
    ORDER BY s.created_at DESC;
$$;

-- Create helper function to increment likes (for backward compatibility)
CREATE OR REPLACE FUNCTION increment_likes(story_id UUID)
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
AS $$
    WITH reaction_counts AS (
        SELECT * FROM get_reaction_counts(story_id)
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
    WHERE s.id = story_id;
$$;

-- Grant necessary permissions (adjust as needed for your setup)
-- These permissions ensure the application can access the new tables and functions
GRANT SELECT, INSERT, UPDATE, DELETE ON reactions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_reaction_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_stories_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO authenticated;