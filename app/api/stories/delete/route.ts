import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { id, client_id } = await req.json();

    if (!id || !client_id) {
      return NextResponse.json(
        { error: "Missing story id or client id" },
        { status: 400 }
      );
    }

    // Perform delete
    const { data, error } = await supabase
      .from("stories")
      .delete()
      .eq("id", id)
      .eq("client_id", client_id)
      .select("id"); // 👈 THIS IS THE KEY

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { error: "Delete failed" },
        { status: 500 }
      );
    }

    // 👇 This catches silent failures
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Story not found or not owned by user" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete exception:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
