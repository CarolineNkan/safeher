-- Simple function setup for reaction system
-- Run this in Supabase SQL editor

-- Create function for efficient reaction count aggregation
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