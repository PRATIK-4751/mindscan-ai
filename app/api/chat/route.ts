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
    return NextResponse.json({ error: "Missing Ollama API key." }, { status: 500 });
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

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
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
}
