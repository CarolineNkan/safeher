import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Simple Raindrop API client for SmartMemory operations
class RaindropClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.raindrop.ai';
  }

  get smartMemory() {
    return {
      write: async (key: string, data: any) => {
        try {
          const response = await fetch(`${this.baseUrl}/v1/smartmemory/${key}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`SmartMemory write failed: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        } catch (error) {
          console.error('SmartMemory write error:', error);
          throw error;
        }
      }
    };
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await req.json();
    
    // Initialize Raindrop client
    const raindrop = new RaindropClient({
      apiKey: process.env.RAINDROP_API_KEY || 'dummy-key',
    });

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "Missing user ID" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Try to get profile, but don't fail if it doesn't exist yet
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // If profile doesn't exist, create basic data structure
    const profileData = profile || {
      full_name: null,
      home_lat: null,
      home_lng: null,
      home_address: null,
      formatted_address: null,
      ai_location_consent: false,
      user_risk_profile: null,
    };

    // 🔥 WRITE TO RAINDROP SMART MEMORY
    const smartMemoryData = {
      user_id: user.id,
      full_name: profileData.full_name,
      email: user.email,
      onboarding_complete: profileData.home_lat ? true : false,
      home_location: {
        formatted_address: profileData.formatted_address || profileData.home_address,
        lat: profileData.home_lat,
        lng: profileData.home_lng,
      },
      ai_preferences: {
        location_analysis_consent: profileData.ai_location_consent || false,
        risk_profile: profileData.user_risk_profile || 5,
      },
      user_profile: {
        comfort_level_night_walking: profileData.user_risk_profile || 5,
        personalization_enabled: profileData.ai_location_consent || false,
      },
    };

    try {
      await raindrop.smartMemory.write("user_profile_" + user.id, smartMemoryData);
      console.log("Successfully synced to SmartMemory:", smartMemoryData);
    } catch (smartMemoryError) {
      console.error("SmartMemory sync failed:", smartMemoryError);
      // Don't fail the entire request if SmartMemory sync fails
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { success: false, message: "SmartMemory sync failed" },
      { status: 500 }
    );
  }
}