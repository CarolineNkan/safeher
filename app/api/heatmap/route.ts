import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ReactionKey = "like" | "helpful" | "noted";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL + SERVICE_ROLE or ANON key).");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

// Reaction weights: tweak anytime
const REACTION_WEIGHT: Record<ReactionKey, number> = {
  like: 1,
  helpful: 3,
  noted: 2,
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const bbox = body?.bbox as {
      west: number;
      south: number;
      east: number;
      north: number;
    };

    // bbox is required for performance (we only fetch what’s visible)
    if (
      !bbox ||
      typeof bbox.west !== "number" ||
      typeof bbox.south !== "number" ||
      typeof bbox.east !== "number" ||
      typeof bbox.north !== "number"
    ) {
      return NextResponse.json({ error: "bbox required" }, { status: 400 });
    }

    const supabase = getSupabase();

    /**
     * Assumptions based on what you showed:
     * - stories table exists
     * - has: id, message, lat, lng, created_at, client_id (or user_id)
     * - your /api/stories/list returns reactions already, but heatmap should not depend on that.
     *
     * If your reactions are stored in a separate table, you can join/aggregate here later.
     * For now, we read reaction counts if they’re stored on the story row as JSON.
     * If they aren't stored on the row, we fall back to zeros and still render points.
     */

    const { data: rows, error } = await supabase
      .from("stories")
      .select("id, lat, lng, created_at, message, reactions")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("lat", bbox.south)
      .lte("lat", bbox.north)
      .gte("lng", bbox.west)
      .lte("lng", bbox.east)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const features =
      (rows || []).map((r: any) => {
        const reactions = (r?.reactions || {}) as Partial<Record<ReactionKey, number>>;

        const like = Number(reactions.like || 0);
        const helpful = Number(reactions.helpful || 0);
        const noted = Number(reactions.noted || 0);

        // Base weight so a single report still shows, then add reaction influence
        const weight =
          1 +
          like * REACTION_WEIGHT.like +
          helpful * REACTION_WEIGHT.helpful +
          noted * REACTION_WEIGHT.noted;

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(r.lng), Number(r.lat)],
          },
          properties: {
            id: r.id,
            weight,
            source: "community",
          },
        };
      }) || [];

    return NextResponse.json({
      type: "FeatureCollection",
      features,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Invalid request" },
      { status: 400 }
    );
  }
}



