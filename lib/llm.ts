import type { NextResponse } from "next/server";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface LLMOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Shared NVIDIA NIM API caller (OpenAI-compatible).
 * Falls back to lexicon-based analysis if the API is unavailable.
 */
export async function callLLM(options: LLMOptions): Promise<string> {
  const apiKey = (process.env.NVIDIA_API_KEY || process.env.OLLAMA_CLOUD_API_KEY)?.trim();
  const apiUrl = (process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions").trim();
  const model = (process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct").trim();

  if (!apiKey) {
    throw new Error("No LLM API key configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text();
      console.error(`LLM API Error (${response.status}):`, text);
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.message?.content ??
      data?.response;

    if (!content) {
      throw new Error("Empty LLM response");
    }

    return content;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
