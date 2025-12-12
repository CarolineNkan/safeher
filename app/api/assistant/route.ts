import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AssistantRequest {
  message: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  context?: any;
}

export async function POST(req: Request) {
  try {
    const { message, location, context }: AssistantRequest = await req.json();
    console.log("💬 Safety Assistant request:", { message, location, context });

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Fetch relevant community data if location is provided
    let communityData = null;
    if (location?.lat && location?.lng) {
      communityData = await fetchCommunityData(location.lat, location.lng);
    }

    // Get AI response using OpenAI
    const aiResponse = await getAIResponse(message, location, communityData, context);

    return NextResponse.json({
      message: aiResponse,
      timestamp: new Date().toISOString(),
      location: location || null,
      communityDataUsed: !!communityData
    });

  } catch (err) {
    console.error("❌ Safety Assistant error:", err);
    return NextResponse.json(
      { error: "Failed to get assistant response" },
      { status: 500 }
    );
  }
}

async function fetchCommunityData(lat: number, lng: number) {
  try {
    console.log("📊 Fetching community data for location:", { lat, lng });

    // Fetch nearby stories within ~1km radius
    const { data: nearbyStories, error } = await supabase
      .from("stories")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null);

    if (error) {
      console.error("Error fetching stories:", error);
      return null;
    }

    // Filter stories within reasonable distance (simplified calculation)
    const relevantStories = nearbyStories?.filter(story => {
      if (!story.lat || !story.lng) return false;
      
      const distance = getDistance(
        { lat, lng },
        { lat: story.lat, lng: story.lng }
      );
      
      return distance < 1000; // Within 1km
    }) || [];

    // Calculate safety metrics
    const totalStories = relevantStories.length;
    const totalEngagement = relevantStories.reduce((sum, story) => 
      sum + (story.likes || 0) + (story.helpful || 0) + (story.noted || 0), 0
    );
    
    const averageEngagement = totalStories > 0 ? totalEngagement / totalStories : 0;
    
    // Analyze story sentiment (simplified)
    const concerningKeywords = ['unsafe', 'dangerous', 'scary', 'avoid', 'harassment', 'dark', 'isolated'];
    const concerningStories = relevantStories.filter(story => 
      concerningKeywords.some(keyword => 
        story.message.toLowerCase().includes(keyword)
      )
    );

    console.log(`📈 Community data: ${totalStories} stories, ${concerningStories.length} concerning`);

    return {
      totalStories,
      concerningStories: concerningStories.length,
      averageEngagement: Math.round(averageEngagement * 10) / 10,
      safetyScore: Math.max(0, Math.min(100, 
        100 - (concerningStories.length / Math.max(totalStories, 1)) * 100
      )),
      recentStories: relevantStories.slice(0, 3).map(story => ({
        message: story.message.substring(0, 100) + (story.message.length > 100 ? '...' : ''),
        engagement: (story.likes || 0) + (story.helpful || 0) + (story.noted || 0),
        created_at: story.created_at
      }))
    };

  } catch (error) {
    console.error("Error fetching community data:", error);
    return null;
  }
}

async function getAIResponse(
  message: string, 
  location: any, 
  communityData: any, 
  context: any
): Promise<string> {
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ OpenAI API key not found, using fallback response");
    return getFallbackResponse(message, location, communityData);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `You are SafeHER Assistant, an AI safety companion designed to help women navigate the world more safely. You provide practical, empathetic, and actionable safety advice.

CORE PRINCIPLES:
- Prioritize personal safety and empowerment
- Provide specific, actionable advice
- Be supportive and non-judgmental
- Include relevant disclaimers when appropriate
- Use community data when available to give contextual advice

RESPONSE STYLE:
- Warm, supportive, and professional tone
- Concise but comprehensive answers (2-4 paragraphs max)
- Include practical tips and alternatives
- Acknowledge concerns without being alarmist
- End with encouragement when appropriate

SAFETY TOPICS YOU HANDLE:
- Walking safety (day/night, routes, precautions)
- Area safety assessments
- Personal safety tips
- Emergency preparedness
- Situational awareness
- Transportation safety
- General safety best practices

IMPORTANT DISCLAIMERS:
- Always remind users that your advice supplements but doesn't replace personal judgment
- Encourage trusting their instincts
- Suggest contacting emergency services (911) for immediate threats
- Note that safety conditions can change rapidly`;

    let userPrompt = `User Question: "${message}"`;
    
    if (location) {
      userPrompt += `\n\nLocation Context: ${location.address || `Coordinates: ${location.lat}, ${location.lng}`}`;
    }

    if (communityData) {
      userPrompt += `\n\nCommunity Data:
- ${communityData.totalStories} community reports in this area
- Safety score: ${Math.round(communityData.safetyScore)}/100
- ${communityData.concerningStories} reports mention safety concerns
- Average community engagement: ${communityData.averageEngagement} reactions per story`;

      if (communityData.recentStories.length > 0) {
        userPrompt += `\n\nRecent Community Reports:`;
        communityData.recentStories.forEach((story: any, index: number) => {
          userPrompt += `\n${index + 1}. "${story.message}" (${story.engagement} reactions)`;
        });
      }
    }

    if (context) {
      userPrompt += `\n\nAdditional Context: ${JSON.stringify(context)}`;
    }

    userPrompt += `\n\nProvide helpful safety guidance based on this information. Be specific and actionable.`;

    console.log("🤖 Requesting OpenAI response...");
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now.";
    console.log("✅ OpenAI response generated");
    
    return response;

  } catch (error) {
    console.error("❌ OpenAI API error:", error);
    return getFallbackResponse(message, location, communityData);
  }
}

function getFallbackResponse(message: string, location: any, communityData: any): string {
  const lowerMessage = message.toLowerCase();
  
  // Safety at night
  if (lowerMessage.includes('night') || lowerMessage.includes('dark')) {
    return `For nighttime safety, I recommend staying in well-lit areas, walking with confidence, and letting someone know your route. ${communityData ? `Based on ${communityData.totalStories} community reports in this area, the safety score is ${Math.round(communityData.safetyScore)}/100.` : ''} Trust your instincts and consider alternative transportation if you feel uncomfortable. Always have your phone charged and emergency contacts ready.`;
  }
  
  // Area safety
  if (lowerMessage.includes('safe') && (lowerMessage.includes('area') || lowerMessage.includes('neighborhood'))) {
    return `When assessing area safety, look for good lighting, regular foot traffic, and nearby businesses. ${communityData ? `This area has ${communityData.totalStories} community reports with ${communityData.concerningStories} mentioning safety concerns.` : ''} Trust your instincts - if something feels off, it's okay to change your route or seek help. Consider checking recent community reports and local safety resources.`;
  }
  
  // General precautions
  if (lowerMessage.includes('precaution') || lowerMessage.includes('tip')) {
    return `Key safety precautions include: staying aware of your surroundings, keeping your phone charged, sharing your location with trusted contacts, and trusting your instincts. ${communityData ? `Local community data shows ${communityData.totalStories} reports with an average engagement of ${communityData.averageEngagement} reactions.` : ''} Always have a backup plan and don't hesitate to seek help if needed. Remember, your safety is the top priority.`;
  }
  
  // Default response
  return `I'm here to help with your safety questions. ${communityData ? `Based on local community data, this area has ${communityData.totalStories} reports with a safety score of ${Math.round(communityData.safetyScore)}/100.` : ''} For specific safety advice, feel free to ask about walking routes, area safety, or precautions for different situations. Remember to trust your instincts and prioritize your personal safety. If you're in immediate danger, please contact emergency services.`;
}

function getDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
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
