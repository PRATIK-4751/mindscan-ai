import { NextResponse } from "next/server";
import { chatLLM } from "../../../lib/llm";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const body = await request.json();
  const messages: ChatMessage[] = body?.messages ?? [];
  const systemPrompt: string = body?.systemPrompt ?? "";

  try {
    const reply = await chatLLM(messages, systemPrompt);
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
