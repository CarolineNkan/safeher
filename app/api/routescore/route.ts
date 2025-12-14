import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/* ------------------ utils ------------------ */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(x));
}

/* ------------------ handler ------------------ */
export async function POST(req: Request) {
  try {
    const { destination, gps_start, home_start } = await req.json();

    if (!destination) {
      return NextResponse.json({ error: "Destination required" }, { status: 400 });
    }

    /* -------- START LOCATION LOGIC -------- */
    let start_used;

    if (gps_start?.lat && gps_start?.lng) {
      start_used = { ...gps_start, source: "gps" };
    } else if (home_start?.label) {
      start_used = {
        lat: home_start.lat ?? 43.945,
        lng: home_start.lng ?? -78.896,
        source: "home",
        label: home_start.label,
      };
    } else {
      start_used = {
        lat: 43.6532,
        lng: -79.3832,
        source: "default",
      };
    }

    /* -------- BASE SAFETY SCORE -------- */
    let safety_score = 70; // neutral baseline

    /* -------- COMMUNITY SIGNALS (REACTIONS) -------- */
    const { data: stories } = await supabase
      .from("stories")
      .select("lat, lng, story_reactions(reaction)");

    let communityImpact = 0;
    let nearbyCount = 0;

    if (stories) {
      stories.forEach((s: any) => {
        if (typeof s.lat !== "number" || typeof s.lng !== "number") return;

        const dist = haversineKm(
          { lat: start_used.lat, lng: start_used.lng },
          { lat: s.lat, lng: s.lng }
        );

        if (dist <= 1.2) {
          nearbyCount++;

          s.story_reactions.forEach((r: any) => {
            if (r.reaction === "helpful") communityImpact += 2;
            if (r.reaction === "like") communityImpact += 1;
            if (r.reaction === "noted") communityImpact += 0.5;
          });
        }
      });
    }

    const communityPenalty = Math.min(30, Math.round(communityImpact * 1.3));
    safety_score -= communityPenalty;

    /* -------- CONTEXTUAL AI-STYLE SIGNALS -------- */
    const hour = new Date().getHours();

    const timeRisk =
      hour >= 22 || hour <= 5
        ? { level: "High", note: "Late-night hours often have lower activity and visibility." }
        : hour >= 18
        ? { level: "Medium", note: "Evening hours may have reduced foot traffic." }
        : { level: "Low", note: "Daytime hours generally have higher visibility and activity." };

    const contextual_signals = [
      {
        label: "Street Lighting",
        level: "Medium",
        note: "Lighting is typically mixed in similar urban environments.",
      },
      {
        label: "Visibility",
        level: "Medium",
        note: "Some visual obstructions may exist depending on route layout.",
      },
      {
        label: "Public Activity",
        level: nearbyCount > 3 ? "High" : nearbyCount > 0 ? "Medium" : "Low",
        note:
          nearbyCount > 0
            ? `${nearbyCount} community reports detected nearby.`
            : "Limited community activity reported in this area.",
      },
      {
        label: "Time of Day",
        level: timeRisk.level,
        note: timeRisk.note,
      },
    ];

    /* -------- FINAL NORMALIZATION -------- */
    safety_score = Math.max(0, Math.min(100, safety_score));

    const risk_level =
      safety_score >= 75 ? "Low" : safety_score >= 50 ? "Medium" : "High";

    return NextResponse.json({
      destination,
      start_used,
      safety_score,
      risk_level,
      contextual_signals,
      explanation:
        "Analysis is based on public context signals, urban heuristics, and weighted community reactions. Accuracy improves as more women share experiences.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
