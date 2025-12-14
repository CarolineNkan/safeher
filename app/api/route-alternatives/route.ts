import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

interface RouteCoordinates {
  lat: number;
  lng: number;
}

interface RouteScore {
  score: number;
  level: string;
  lighting: string;
  incidents: string;
  visibility: string;
  explanation: string;
}

interface ScoredRoute {
  id: string;
  distance: number;
  duration: number;
  geometry: any;
  score: RouteScore;
  safetyFactors: {
    distanceScore: number;
    lightingScore: number;
    crimeScore: number;
    storyScore: number;
  };
}

interface RouteAlternativesResponse {
  safestRoute: ScoredRoute;
  alternativeRoutes: ScoredRoute[];
  explanation: string;
  start: RouteCoordinates;
  end: RouteCoordinates;
}

export async function POST(req: Request) {
  try {
    const { start, end } = await req.json();
    console.log("🚀 Route alternatives request:", { start, end });

    // Validate input coordinates
    if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
      console.error("❌ Invalid coordinates:", { start, end });
      return NextResponse.json(
        { error: "Invalid start or end coordinates" },
        { status: 400 }
      );
    }

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!MAPBOX_TOKEN) {
      console.error("❌ NEXT_PUBLIC_MAPBOX_TOKEN not found in environment");
      return NextResponse.json(
        { error: "Mapbox token not configured" },
        { status: 500 }
      );
    }

    // 1. Fetch multiple route alternatives from Mapbox
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson&alternatives=true&steps=true`;
    
    console.log("🗺️ Requesting Mapbox route alternatives...");
    
    const mapboxResponse = await fetch(mapboxUrl);
    const routeData = await mapboxResponse.json();
    
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

    console.log(`✅ Found ${routeData.routes.length} route alternatives`);

    // 2. Fetch stories for safety analysis
    const { data: nearbyStories, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (storyError) {
      console.error("Story fetch error:", storyError);
    }

    const stories = nearbyStories || [];
    console.log(`📚 Found ${stories.length} stories for safety analysis`);

    // 3. Score each route
    const scoredRoutes: ScoredRoute[] = await Promise.all(
      routeData.routes.map(async (route: any, index: number) => {
        const routeId = `route_${index}`;
        
        // Calculate safety factors
        const safetyFactors = calculateSafetyFactors(route, stories, start, end);
        
        // Get AI evaluation
        const aiScore = await getAIRouteScore(route, stories, safetyFactors);
        
        return {
          id: routeId,
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          score: aiScore,
          safetyFactors
        };
      })
    );

    // 4. Determine safest route and alternatives
    const sortedRoutes = scoredRoutes.sort((a, b) => b.score.score - a.score.score);
    const safestRoute = sortedRoutes[0];
    const alternativeRoutes = sortedRoutes.slice(1);

    // 5. Generate explanation
    const explanation = generateSafetyExplanation(safestRoute, alternativeRoutes);

    const response: RouteAlternativesResponse = {
      safestRoute,
      alternativeRoutes,
      explanation,
      start,
      end
    };

    console.log("✅ Route alternatives analysis complete");
    return NextResponse.json(response);

  } catch (err) {
    console.error("❌ Route alternatives error:", err);
    return NextResponse.json(
      { error: "Failed to analyze route alternatives" },
      { status: 500 }
    );
  }
}

function calculateSafetyFactors(route: any, stories: any[], start: RouteCoordinates, end: RouteCoordinates) {
  // Distance score (shorter is generally safer)
  const distanceKm = route.distance / 1000;
  const distanceScore = Math.max(0, Math.min(100, 100 - (distanceKm * 10)));

  // Lighting score (placeholder - could be enhanced with real data)
  const lightingScore = Math.random() * 40 + 60; // 60-100 range

  // Crime score based on nearby stories (placeholder logic)
  const routeCoords = route.geometry.coordinates;
  let negativeStoryCount = 0;
  let totalStoryCount = 0;

  stories.forEach(story => {
    if (story.lat && story.lng) {
      // Check if story is near the route (simplified distance check)
      const isNearRoute = routeCoords.some((coord: [number, number]) => {
        const distance = getDistance(
          { lat: story.lat, lng: story.lng },
          { lat: coord[1], lng: coord[0] }
        );
        return distance < 500; // Within 500 meters
      });

      if (isNearRoute) {
        totalStoryCount++;
        // Consider stories with low engagement as potentially negative
        const totalReactions = (story.likes || 0) + (story.helpful || 0) + (story.noted || 0);
        if (totalReactions < 2) {
          negativeStoryCount++;
        }
      }
    }
  });

  const crimeScore = totalStoryCount > 0 
    ? Math.max(0, 100 - (negativeStoryCount / totalStoryCount) * 100)
    : 75; // Default score when no data

  // Story score based on community engagement
  const storyScore = totalStoryCount > 0 
    ? Math.min(100, totalStoryCount * 10) // More stories = more community awareness
    : 50; // Default score

  return {
    distanceScore: Math.round(distanceScore),
    lightingScore: Math.round(lightingScore),
    crimeScore: Math.round(crimeScore),
    storyScore: Math.round(storyScore)
  };
}

async function getAIRouteScore(route: any, stories: any[], safetyFactors: any): Promise<RouteScore> {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback scoring without AI
    const overallScore = Math.round(
      (safetyFactors.distanceScore * 0.3) +
      (safetyFactors.lightingScore * 0.2) +
      (safetyFactors.crimeScore * 0.3) +
      (safetyFactors.storyScore * 0.2)
    );

    return {
      score: overallScore,
      level: overallScore > 70 ? "low risk" : overallScore > 40 ? "medium risk" : "high risk",
      lighting: safetyFactors.lightingScore > 70 ? "good" : "medium",
      incidents: safetyFactors.crimeScore > 70 ? "low" : "medium",
      visibility: "medium",
      explanation: `Route scored ${overallScore}/100 based on distance (${(route.distance/1000).toFixed(1)}km), community data, and safety factors.`
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `Evaluate this walking route for women's safety:

Route Details:
- Distance: ${route.distance} meters (${(route.distance/1000).toFixed(1)} km)
- Duration: ${route.duration} seconds (${Math.round(route.duration/60)} minutes)

Safety Factors:
- Distance Score: ${safetyFactors.distanceScore}/100
- Lighting Score: ${safetyFactors.lightingScore}/100  
- Crime Score: ${safetyFactors.crimeScore}/100
- Community Story Score: ${safetyFactors.storyScore}/100

Nearby Stories: ${stories.length} community reports

Provide a safety assessment. Respond ONLY with JSON in this exact format:
{
  "score": 75,
  "level": "low risk",
  "lighting": "good",
  "incidents": "low", 
  "visibility": "good",
  "explanation": "This route scores well due to shorter distance and good community engagement."
}`
      }]
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (err) {
    console.error("❌ OpenAI scoring failed:", err);
    
    // Fallback scoring
    const overallScore = Math.round(
      (safetyFactors.distanceScore * 0.3) +
      (safetyFactors.lightingScore * 0.2) +
      (safetyFactors.crimeScore * 0.3) +
      (safetyFactors.storyScore * 0.2)
    );

    return {
      score: overallScore,
      level: overallScore > 70 ? "low risk" : overallScore > 40 ? "medium risk" : "high risk",
      lighting: safetyFactors.lightingScore > 70 ? "good" : "medium",
      incidents: safetyFactors.crimeScore > 70 ? "low" : "medium",
      visibility: "medium",
      explanation: `AI unavailable. Route scored ${overallScore}/100 based on safety factors analysis.`
    };
  }
}

function generateSafetyExplanation(safestRoute: ScoredRoute, alternatives: ScoredRoute[]): string {
  const safestScore = safestRoute.score.score;
  const factors = safestRoute.safetyFactors;
  
  let explanation = `This route is recommended with a safety score of ${safestScore}/100. `;
  
  // Highlight best factors
  const bestFactor = Object.entries(factors).reduce((a, b) => factors[a[0] as keyof typeof factors] > factors[b[0] as keyof typeof factors] ? a : b);
  
  switch (bestFactor[0]) {
    case 'distanceScore':
      explanation += "It's the shortest route, reducing exposure time. ";
      break;
    case 'lightingScore':
      explanation += "It has better lighting conditions. ";
      break;
    case 'crimeScore':
      explanation += "It passes through areas with fewer safety concerns. ";
      break;
    case 'storyScore':
      explanation += "It has good community awareness and engagement. ";
      break;
  }

  if (alternatives.length > 0) {
    const scoreDiff = safestScore - alternatives[0].score.score;
    explanation += `This route scores ${scoreDiff} points higher than the next best alternative.`;
  }

  return explanation;
}

function getDistance(coord1: RouteCoordinates, coord2: RouteCoordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.lat * Math.PI/180;
  const φ2 = coord2.lat * Math.PI/180;
  const Δφ = (coord2.lat-coord1.lat) * Math.PI/180;
  const Δλ = (coord2.lng-coord1.lng) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}