import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const systemPrompt = `
You are Winnie, a calm, supportive safety companion for women.

Your role:
- Help the user stay calm
- Offer practical, grounded safety guidance
- Avoid panic or alarmist language
- Escalate clearly if immediate danger is implied
- Ask at most ONE gentle follow-up question

You are NOT:
- A therapist
- Law enforcement
- A replacement for emergency services

If the situation sounds urgent, explicitly suggest SOS Mode.

Context you may use:
${context ? JSON.stringify(context) : "No additional context available"}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    return NextResponse.json({
      reply:
        reply ||
        "I’m here with you. Take a breath — can you tell me what’s happening right now?",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Assistant unavailable" },
      { status: 500 }
    );
  }
}
