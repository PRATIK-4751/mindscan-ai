import { NextResponse } from "next/server";
import { chatLLM } from "../../../lib/llm";

const SYSTEM_PROMPT = `You are MindScan AI, a calm, supportive mental health assistant. Your role:
- Provide short, warm, non-clinical guidance (2-4 sentences)
- Validate the user's feelings without diagnosing conditions
- If the user mentions crisis, self-harm, or suicidal thoughts, immediately provide the 988 Suicide & Crisis Lifeline number
- Never dismiss or minimize their experience
- Suggest professional help when appropriate`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = body?.messages ?? [];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const sanitized = messages.slice(-20).map((m: any) => ({
      role: String(m.role || "user"),
      content: String(m.content || "").slice(0, 2000),
    }));

    const reply = await chatLLM(sanitized, SYSTEM_PROMPT);
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat API Error:", error?.message);
    return NextResponse.json(
      {
        error: "AI service unavailable",
        reply: "I'm experiencing connection issues right now. Please try again in a moment.",
      },
      { status: 503 }
    );
  }
}
