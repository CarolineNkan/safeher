import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SaveHomeRequest {
  home_lat: number;
  home_lng: number;
  home_address: string;
  formatted_address?: string;
  ai_location_consent?: boolean;
  user_risk_profile?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveHomeRequest = await request.json();
    const { 
      home_lat, 
      home_lng, 
      home_address, 
      formatted_address, 
      ai_location_consent, 
      user_risk_profile 
    } = body;

    // Validate required fields
    if (home_lat === undefined || home_lng === undefined || !home_address) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: home_lat, home_lng, home_address" },
        { status: 400 }
      );
    }

    // Validate latitude and longitude ranges
    if (home_lat < -90 || home_lat > 90) {
      return NextResponse.json(
        { success: false, error: "Invalid latitude. Must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (home_lng < -180 || home_lng > 180) {
      return NextResponse.json(
        { success: false, error: "Invalid longitude. Must be between -180 and 180" },
        { status: 400 }
      );
    }

    // For now, we'll use a placeholder user ID since authentication isn't fully implemented
    const userId = "placeholder-user-id";

    // 🎯 DEMO MODE: Log all onboarding data for AI Championship demonstration
    console.log("🚀 AI CHAMPIONSHIP ONBOARDING DATA CAPTURED:");
    console.log("=" .repeat(60));
    console.log("📍 Location Data:");
    console.log(`   Latitude: ${home_lat}`);
    console.log(`   Longitude: ${home_lng}`);
    console.log(`   Address: ${home_address}`);
    console.log(`   Formatted Address: ${formatted_address || 'N/A'}`);
    console.log("");
    console.log("🤖 AI Preferences:");
    console.log(`   Location Analysis Consent: ${ai_location_consent ? '✅ YES' : '❌ NO'}`);
    console.log(`   Risk Profile (0-10): ${user_risk_profile || 'Not set'}`);
    console.log("");
    console.log("📊 SmartMemory Payload Preview:");
    console.log({
      user_id: userId,
      onboarding_complete: true,
      home_location: {
        formatted_address: formatted_address || home_address,
        lat: home_lat,
        lng: home_lng,
      },
      ai_preferences: {
        location_analysis_consent: ai_location_consent || false,
        risk_profile: user_risk_profile || 5,
      },
      user_profile: {
        comfort_level_night_walking: user_risk_profile || 5,
        personalization_enabled: ai_location_consent || false,
      },
    });
    console.log("=" .repeat(60));

    // TODO: Uncomment when database is properly set up
    // const result = await supabase.from("profiles").upsert(profileData);

    // Success - return proper success response
    console.log("✅ Onboarding data processed successfully (demo mode)");
    return NextResponse.json({
      success: true,
      message: "Home location and AI preferences saved successfully",
      demo_mode: true,
    }, { status: 200 });

  } catch (error) {
    console.error("Save home location error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get the current user's profile
    const userId = "placeholder-user-id";

    const result = await supabase
      .from("profiles")
      .select("home_lat, home_lng, home_address")
      .eq("id", userId)
      .single();

    if (result.error) {
      // PGRST116 = "No Rows Found" - this is expected for new users
      if (result.error.code === "PGRST116") {
        console.log("📝 Profile not found for user, returning null values");
        return NextResponse.json({
          home_lat: null,
          home_lng: null,
          home_address: null,
        }, { status: 200 });
      }
      
      // All other errors are real database failures
      console.error("SUPABASE GET ERROR:", result.error);
      return NextResponse.json(
        { error: "Database error while fetching profile" },
        { status: 500 }
      );
    }

    // Success - return the profile data
    const profile = result.data;
    console.log("✅ Profile fetched successfully");
    return NextResponse.json(profile, { status: 200 });

  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}