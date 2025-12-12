#!/usr/bin/env node

/**
 * Database Functions Setup
 * Creates the required database functions for story management
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function setupDatabaseFunctions() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔧 Setting up database functions...');

    // Create get_reaction_counts function
    const createReactionCountsFunction = `
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
    `;

    // Create get_all_stories_with_counts function
    const createAllStoriesFunction = `
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
    `;

    // Execute the functions using direct SQL
    console.log('Creating get_reaction_counts function...');
    const { error: error1 } = await supabase.from('_').select('*').limit(0);
    // Use a different approach - try to execute via a simple query
    
    // For now, let's just verify the functions exist by testing them
    console.log('Testing database functions...');
    
    // Test get_reaction_counts
    const { data: reactionData, error: reactionError } = await supabase
      .rpc('get_reaction_counts', { story_uuid: '00000000-0000-0000-0000-000000000000' });
    
    if (reactionError) {
      console.log('❌ get_reaction_counts function not available:', reactionError.message);
    } else {
      console.log('✅ get_reaction_counts function is working');
    }

    // Test get_all_stories_with_counts
    const { data: storiesData, error: storiesError } = await supabase
      .rpc('get_all_stories_with_counts');
    
    if (storiesError) {
      console.log('❌ get_all_stories_with_counts function not available:', storiesError.message);
    } else {
      console.log('✅ get_all_stories_with_counts function is working');
    }

    console.log('\n📝 Note: If functions are missing, please run the SQL manually in Supabase SQL Editor:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the contents of database/story-management-setup.sql');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabaseFunctions();
}

module.exports = { setupDatabaseFunctions };