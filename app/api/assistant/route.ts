import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();
    console.log("💬 Assistant request:", { message, context });

    // This is for the AI assistant chat, not route scoring
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = ai.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      You are SafeHER, an AI assistant focused on women's safety.
      
      User message: ${message}
      Context: ${JSON.stringify(context)}
      
      Provide helpful, supportive advice about personal safety, route planning, 
      or general guidance. Keep responses concise and actionable.
      
      Respond in plain text (not JSON).
    `;

    console.log("🤖 Requesting assistant response...");
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("✅ Assistant response generated");

    return NextResponse.json({ 
      message: text,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Assistant error:", err);
    return NextResponse.json(
      { error: "Failed to get assistant response" },
      { status: 500 }
    );
  }
}
