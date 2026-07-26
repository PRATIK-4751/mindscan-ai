type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface LLMOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  feature?: "chat" | "text" | "voice" | "general";
}

const MODEL_REGISTRY = {
  chat: {
    primary: "meta/llama-4-maverick-17b-128e-instruct",
    fallbacks: [
      "meta/llama-3.3-70b-instruct",
      "deepseek-ai/deepseek-v4-flash",
      "mistralai/mistral-large-2-instruct",
    ],
  },
  text: {
    primary: "meta/llama-3.3-70b-instruct",
    fallbacks: [
      "deepseek-ai/deepseek-v4-flash",
      "meta/llama-3.1-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
    ],
  },
  voice: {
    primary: "meta/llama-3.2-3b-instruct",
    fallbacks: [
      "google/gemma-3-4b-it",
      "meta/llama-3.1-8b-instruct",
      "deepseek-ai/deepseek-v4-flash",
    ],
  },
  general: {
    primary: "mistralai/mistral-large-2-instruct",
    fallbacks: [
      "meta/llama-3.1-70b-instruct",
      "deepseek-ai/deepseek-v4-flash",
    ],
  },
} as const;

type Feature = keyof typeof MODEL_REGISTRY;

async function callNvidiaAPI(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  timeoutMs: number
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  const apiUrl = process.env.NVIDIA_API_URL?.trim() || "https://integrate.api.nvidia.com/v1/chat/completions";

  if (!apiKey) throw new Error("NVIDIA_API_KEY not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 25_000));

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
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text();
      console.error(`NVIDIA API Error (${response.status}) [${model}]:`, text.slice(0, 200));
      throw new Error(`NVIDIA API returned ${response.status} for model ${model}`);
    }

    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.message?.content ??
      data?.response;

    if (!content) throw new Error("Empty response from NVIDIA API");
    return content;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function callLLM(options: LLMOptions): Promise<string> {
  const feature: Feature = options.feature || "general";
  const registry = MODEL_REGISTRY[feature];
  const allModels = [registry.primary, ...registry.fallbacks];

  let lastError: Error | null = null;

  for (const model of allModels) {
    try {
      const result = await callNvidiaAPI(
        model,
        options.messages,
        options.temperature ?? 0.7,
        options.maxTokens ?? 1024,
        options.timeoutMs ?? 30_000
      );
      console.log(`✓ LLM success [${feature}] → ${model}`);
      return result;
    } catch (err: any) {
      console.warn(`✗ LLM failed [${feature}] → ${model}: ${err?.message}`);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error(`All models failed for feature: ${feature}`);
}

export async function chatLLM(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): Promise<string> {
  const allMessages: ChatMessage[] = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
  ];
  return callLLM({ messages: allMessages, feature: "chat", temperature: 0.7, maxTokens: 1024, timeoutMs: 28_000 });
}

export async function textAnalysisLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
  const typed: ChatMessage[] = messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));
  return callLLM({ messages: typed, feature: "text", temperature: 0.3, maxTokens: 800, timeoutMs: 28_000 });
}

export async function voiceAnalysisLLM(messages: Array<{ role: string; content: string }>): Promise<string> {
  const typed: ChatMessage[] = messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content }));
  return callLLM({ messages: typed, feature: "voice", temperature: 0.3, maxTokens: 400, timeoutMs: 28_000 });
}
