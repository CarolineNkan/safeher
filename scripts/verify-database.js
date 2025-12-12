#!/usr/bin/env node

/**
 * Database Verification Script
 * Verifies that the story management schema has been properly set up
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function verifyDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Verifying story management database setup...\n');

  try {
    // Check if reactions table exists
    console.log('1. Checking reactions table...');
    const { data: reactionsData, error: reactionsError } = await supabase
      .from('reactions')
      .select('*')
      .limit(1);
    
    if (reactionsError && reactionsError.code === 'PGRST116') {
      console.log('❌ Reactions table not found');
      return false;
    } else {
      console.log('✅ Reactions table exists');
    }

    // Check if stories table has user_id column
    console.log('2. Checking stories table structure...');
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('id, message, user_id')
      .limit(1);
    
    if (storiesError) {
      console.log('❌ Stories table check failed:', storiesError.message);
      return false;
    } else {
      console.log('✅ Stories table with user_id column exists');
    }

    // Test get_reaction_counts function
    console.log('3. Testing get_reaction_counts function...');
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_reaction_counts', { story_uuid: '00000000-0000-0000-0000-000000000000' });
    
    if (functionError) {
      console.log('❌ get_reaction_counts function not available:', functionError.message);
      return false;
    } else {
      console.log('✅ get_reaction_counts function works');
    }

    // Test get_all_stories_with_counts function
    console.log('4. Testing get_all_stories_with_counts function...');
    const { data: allStoriesData, error: allStoriesError } = await supabase
      .rpc('get_all_stories_with_counts');
    
    if (allStoriesError) {
      console.log('❌ get_all_stories_with_counts function not available:', allStoriesError.message);
      return false;
    } else {
      console.log('✅ get_all_stories_with_counts function works');
      console.log(`   Found ${allStoriesData?.length || 0} stories`);
    }

    console.log('\n🎉 Database setup verification completed successfully!');
    console.log('\nNext steps:');
    console.log('- Update API endpoints to use the new reactions table');
    console.log('- Implement user-based reaction tracking');
    console.log('- Add story ownership validation');
    
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifyDatabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyDatabase };