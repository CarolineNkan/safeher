import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    // Validate that story ID is provided
    if (!id) {
      return NextResponse.json({ error: "Story ID required" }, { status: 400 });
    }

    // Validate that story ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid story ID format" }, { status: 400 });
    }

    // Delete the story from the database
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Delete story error:", err);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}