import { NextResponse } from "next/server";
import { callLLM } from "../../../lib/llm";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const body = await request.json();
  const messages: ChatMessage[] = body?.messages ?? [];
  const systemPrompt: string = body?.systemPrompt ?? "";

  try {
    const allMessages: ChatMessage[] = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...messages,
    ];

    const content = await callLLM({
      messages: allMessages,
      temperature: 0.7,
      maxTokens: 1024,
      timeoutMs: 23_000,
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Chat API Error:", error?.message);
    return NextResponse.json(
      {
        error: "AI service unavailable",
        content: "I'm experiencing connection issues right now. Please try again in a moment.",
      },
      { status: 503 }
    );
  }
}
