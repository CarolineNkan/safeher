import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, user_id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Story ID required" }, { status: 400 });
    }

    if (!user_id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Insert or update reaction in reactions table
    const { error: reactionError } = await supabase
      .from("reactions")
      .upsert({
        story_id: id,
        user_id: user_id,
        type: 'like'
      }, {
        onConflict: 'story_id,user_id,type'
      });

    if (reactionError) {
      console.error("Reaction insert error:", reactionError);
      return NextResponse.json({ error: "Failed to record reaction" }, { status: 500 });
    }

    // Get updated reaction counts using the database function
    const { data: counts, error: countsError } = await supabase
      .rpc('get_reaction_counts', { story_uuid: id });

    if (countsError) {
      console.error("Reaction counts error:", countsError);
      return NextResponse.json({ error: "Failed to get reaction counts" }, { status: 500 });
    }

    // Get the story with updated counts
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", id)
      .single();

    if (storyError) {
      console.error("Story fetch error:", storyError);
      return NextResponse.json({ error: "Failed to fetch story" }, { status: 500 });
    }

    // Return story with updated reaction counts
    const updatedStory = {
      ...story,
      likes: counts[0]?.likes || 0,
      helpful: counts[0]?.helpful || 0,
      noted: counts[0]?.noted || 0
    };

    return NextResponse.json({ success: true, story: updatedStory });

  } catch (err) {
    console.error("Like reaction error:", err);
    return NextResponse.json({ error: "Failed to like story" }, { status: 500 });
  }
}