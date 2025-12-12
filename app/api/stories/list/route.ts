import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get all stories first
    const { data: stories, error: storiesError } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });

    if (storiesError) {
      console.error("Stories fetch error:", storiesError);
      return NextResponse.json({ error: "Failed to load stories" }, { status: 500 });
    }

    // Get reaction counts for each story
    const storiesWithCounts = await Promise.all(
      stories.map(async (story) => {
        const { data: counts, error: countsError } = await supabase
          .rpc('get_reaction_counts', { story_uuid: story.id });

        if (countsError) {
          console.error(`Reaction counts error for story ${story.id}:`, countsError);
          // Return story with zero counts if there's an error
          return {
            ...story,
            likes: 0,
            helpful: 0,
            noted: 0
          };
        }

        return {
          ...story,
          likes: counts[0]?.likes || 0,
          helpful: counts[0]?.helpful || 0,
          noted: counts[0]?.noted || 0
        };
      })
    );

    return NextResponse.json(storiesWithCounts);

  } catch (error) {
    console.error("List stories error:", error);
    return NextResponse.json({ error: "Failed to load stories" }, { status: 500 });
  }
}
