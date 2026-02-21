import { NextResponse } from "next/server";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
  const apiUrl = process.env.OLLAMA_CLOUD_API_URL ?? "https://ollama.com/api/chat";
  const model = process.env.OLLAMA_CLOUD_MODEL ?? "gpt-oss:20b-cloud";

  if (!apiKey) {
    // Return a mock response for demo purposes when no API key is available
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
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      timeout: 30000,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || "Ollama request failed." }, { status: 500 });
    }

    const data = await response.json();
    const content =
      data?.message?.content ??
      data?.choices?.[0]?.message?.content ??
      data?.response ??
      "No response.";

    return NextResponse.json({ content });
  } catch (error) {
    // Fallback response if API call fails
    return NextResponse.json({
      content: "I'm experiencing connection issues right now. Please try again later. In the meantime, take a deep breath and remember that you're not alone. How are you feeling?"
    }, { status: 503 });
  }
}
