import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { story, lat, lng, category } = await req.json();

    if (!story) {
      return NextResponse.json({ error: "Story text required" }, { status: 400 });
    }

    // Optional AI summary
    let summary = "";
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "text" },
        messages: [
          {
            role: "user",
            content: `Summarize this safety story in one sentence: ${story}`
          }
        ],
      });

      summary = completion.choices[0].message.content || "";
    } catch (err) {
      console.log("AI summary failed → storing full text only.");
    }

    // Insert into Supabase
    const { data: insertedRow, error } = await supabase
      .from("stories")
      .insert({
        message: story,     // correct column
        lat,                // correct column
        lng,                // correct column
        location: lat && lng ? `POINT(${lng} ${lat})` : null, // PostGIS point
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, story: insertedRow });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit story" }, { status: 500 });
  }
}
