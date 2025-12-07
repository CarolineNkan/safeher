import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const { message } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are SafeHER, a calm women’s safety assistant.
    Speak empathetically, clearly, and without judgment.
    The user says: "${message}"
    Respond with guidance, grounding steps, and safety options.
  `;

  const result = await model.generateContent(prompt);

  return Response.json({ reply: result.response.text() });
}
