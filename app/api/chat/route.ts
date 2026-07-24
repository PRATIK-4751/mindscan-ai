import { NextResponse } from "next/server";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OLLAMA_CLOUD_API_KEY?.trim();
  const apiUrl = (process.env.OLLAMA_CLOUD_API_URL || "https://api.ollama.com/v1/chat/completions").trim();
  const model = (process.env.OLLAMA_CLOUD_MODEL || "llama3.1:70b").trim();

  if (!apiKey) {
    return NextResponse.json({
      content: "Hello! I'm MindScan AI. I'm a calm, supportive assistant here to help you. Since no API key is configured, I'm running in demo mode. For full functionality, please set up your Ollama Cloud API key. How are you feeling today?"
    });
  }

  const body = await request.json();
  const messages: ChatMessage[] = body?.messages ?? [];
  const systemPrompt: string = body?.systemPrompt ?? "";

  const payload = {
    model,
    stream: false,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ],
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 23_000);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text();
      console.error("LLM API Error:", text);
      return NextResponse.json({
        error: `API Request Failed: ${response.status} ${response.statusText}`,
        details: text
      }, { status: response.status });
    }

    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.message?.content ??
      data?.response;

    if (!content) {
      console.error("Unexpected API Response Format:", data);
      return NextResponse.json({
        error: "Unexpected response format from AI provider.",
        details: JSON.stringify(data)
      }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Chat API Route Error:", error);
    return NextResponse.json({
      error: "Connection failed",
      content: "I'm experiencing connection issues right now. This usually happens if the AI backend is unreachable or timed out. Please try again later.",
      details: error.message
    }, { status: 503 });
  }
}