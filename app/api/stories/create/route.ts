import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { story, user_id } = await req.json();

    if (!story || !story.trim()) {
      return NextResponse.json({ error: "Story text required" }, { status: 400 });
    }

    // Insert into Supabase
    const { data: insertedRow, error } = await supabase
      .from("stories")
      .insert({
        message: story.trim(),
        user_id: user_id || null,
        lat: null,
        lng: null,
        location: null,
        likes: 0,
        helpful: 0,
        noted: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, story: insertedRow });

  } catch (err) {
    console.error("Create story error:", err);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}