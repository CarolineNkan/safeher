import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { id, message, client_id } = await req.json();

  const { error } = await supabase
    .from("stories")
    .update({ message })
    .eq("id", id)
    .eq("client_id", client_id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
