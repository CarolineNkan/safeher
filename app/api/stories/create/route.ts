import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { message, lat, lng, client_id } = await req.json();

  if (!message || !client_id) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { error } = await supabase.from("stories").insert({
    message,
    lat,
    lng,
    client_id,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to post story" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

