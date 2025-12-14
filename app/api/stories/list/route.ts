import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("stories")
    .select(`
      id,
      message,
      lat,
      lng,
      created_at,
      client_id,
      story_reactions(reaction)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stories = data.map((s: any) => {
    let weight = 0;

    s.story_reactions.forEach((r: any) => {
      if (r.reaction === "like") weight += 1;
      if (r.reaction === "helpful") weight += 2;
      if (r.reaction === "noted") weight += 0.5;
    });

    return {
      ...s,
      signal_weight: weight,
      reactions: {
        like: s.story_reactions.filter((r: any) => r.reaction === "like").length,
        helpful: s.story_reactions.filter((r: any) => r.reaction === "helpful").length,
        noted: s.story_reactions.filter((r: any) => r.reaction === "noted").length,
      },
    };
  });

  return NextResponse.json({ stories });
}


