import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { start, end, stories } = await req.json();
    console.log("🚀 Route scoring request:", { start, end, stories: stories?.length || 0 });

    // Validate input coordinates
    if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
      console.error("❌ Invalid coordinates:", { start, end });
      return NextResponse.json(
        { error: "Invalid start or end coordinates" },
        { status: 400 }
      );
    }

    // 1. Mapbox route lookup using REST API
    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    // Debug environment variables
    console.log("🔍 Environment check:");
    console.log("  - NEXT_PUBLIC_MAPBOX_TOKEN exists:", !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
    console.log("  - Token preview:", MAPBOX_TOKEN ? MAPBOX_TOKEN.substring(0, 10) + "***" : "NOT_FOUND");
    
    if (!MAPBOX_TOKEN) {
      console.error("❌ NEXT_PUBLIC_MAPBOX_TOKEN not found in environment");
      return NextResponse.json(
        { error: "Mapbox token not configured" },
        { status: 500 }
      );
    }
    
    // Build coordinates string: lng,lat;lng,lat
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
    
    console.log("🗺️ Requesting Mapbox route:", mapboxUrl.replace(MAPBOX_TOKEN, "***"));
    
    const mapboxResponse = await fetch(mapboxUrl);
    const routeData = await mapboxResponse.json();
    
    console.log("📍 Mapbox response status:", mapboxResponse.status);
    
    if (!mapboxResponse.ok) {
      console.error("❌ Mapbox API error:", routeData);
      return NextResponse.json(
        { error: `Mapbox API error: ${routeData.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    if (!routeData.routes?.length) {
      console.error("❌ No routes found");
      return NextResponse.json(
        { error: "No route found between locations" },
        { status: 400 }
      );
    }

    const distance = routeData.routes[0].distance;
    const duration = routeData.routes[0].duration;
    console.log("✅ Route found:", { distance, duration });

    // 2. OpenAI GPT-4 Safety Scoring
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY not found in environment");
      // Safe fallback scoring
      const riskScore = Math.min(90, Math.max(10, 70 - (distance / 1000) * 5));
      const aiResponse = {
        score: Math.round(riskScore),
        level: riskScore > 70 ? "low risk" : riskScore > 40 ? "medium risk" : "high risk",
        lighting: "medium",
        incidents: "low",
        visibility: "medium",
        explanation: `AI unavailable. Fallback analysis based on ${(distance/1000).toFixed(1)} km + ${Math.round(duration/60)} min duration.`
      };
      return NextResponse.json(aiResponse);
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let aiResponse;
    try {
      console.log("🤖 Requesting OpenAI GPT-4 analysis…");
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: `Evaluate a walking route for women's safety.

Distance: ${distance} meters  
Duration: ${duration} seconds  
Stories: ${JSON.stringify(stories)}

Respond ONLY with JSON in this exact format:
{
  "score": 68,
  "level": "medium risk",
  "lighting": "medium",
  "incidents": "low",
  "visibility": "medium",
  "explanation": "Short explanation."
}`
        }]
      });

      aiResponse = JSON.parse(completion.choices[0].message.content || '{}');
      console.log("✅ Parsed AI JSON:", aiResponse);
    } catch (err) {
      console.error("❌ OpenAI failed:", err);
      // Safe fallback scoring
      const riskScore = Math.min(90, Math.max(10, 70 - (distance / 1000) * 5));
      aiResponse = {
        score: Math.round(riskScore),
        level: riskScore > 70 ? "low risk" : riskScore > 40 ? "medium risk" : "high risk",
        lighting: "medium",
        incidents: "low",
        visibility: "medium",
        explanation: `AI unavailable. Fallback analysis based on ${(distance/1000).toFixed(1)} km + ${Math.round(duration/60)} min duration.`
      };
    }

    return NextResponse.json(aiResponse);

  } catch (err) {
    console.error("❌ Route score error:", err);
    return NextResponse.json(
      { error: "Failed to score route" },
      { status: 500 }
    );
  }
}
