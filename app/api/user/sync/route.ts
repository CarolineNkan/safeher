import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { user } = await req.json();

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "Missing user ID" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
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
    };

    // TODO: Add SmartMemory sync here
    console.log("Would sync to SmartMemory:", {
      user_id: user.id,
      full_name: profileData.full_name,
      email: user.email,
      onboarding_complete: profileData.home_lat ? true : false,
      home_location: {
        lat: profileData.home_lat,
        lng: profileData.home_lng,
        address: profileData.home_address,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json(
      { success: false, message: "SmartMemory sync failed" },
      { status: 500 }
    );
  }
}