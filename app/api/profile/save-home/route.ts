import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await req.json();

    console.log("✅ AUTHENTICATED USER:", user.id);
    console.log("📍 ONBOARDING DATA:", body);

    // DEMO MODE — DB write intentionally skipped
    return NextResponse.json({
      success: true,
      demo_mode: true,
    });
  } catch (err) {
    console.error("SAVE HOME ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
