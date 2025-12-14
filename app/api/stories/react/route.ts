import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { story_id, reaction, client_id } = await req.json();

  if (!story_id || !reaction || !client_id) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const { error } = await supabase.from("story_reactions").insert({
    story_id,
    reaction,
    client_id,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
