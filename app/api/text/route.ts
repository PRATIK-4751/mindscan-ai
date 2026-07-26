import { NextResponse } from "next/server";
import { textAnalysisLLM } from "../../../lib/llm";

const SYSTEM_PROMPT = `You are MindScan, an empathetic mental health screening AI. A user has shared their personal story with you.

YOUR ROLE:
- Listen deeply to what they share
- Respond with warmth, validation, and genuine care
- Provide a compassionate, thoughtful reply (3-5 sentences) acknowledging their experience
- Gently reflect back the key emotions you sense
- If you detect distress, normalize it and offer hope
- If crisis signals appear (self-harm, suicide), immediately provide crisis resources (988 Suicide & Crisis Lifeline)

Return ONLY valid JSON with this exact structure:

{"reply": "Your compassionate response to the user here...", "text_score": 0.5, "lime_words": [{"word": "word", "score": 0.8}], "detected_emotions": ["sadness", "anxiety"], "summary": "Brief clinical summary"}

RULES FOR text_score:
- 0.0-0.2: Minimal distress, casual/neutral
- 0.2-0.4: Mild distress, some emotional weight
- 0.4-0.6: Moderate distress, concerning patterns
- 0.6-0.8: Significant distress, needs attention
- 0.8-1.0: Severe distress, potential crisis

RULES FOR lime_words:
- Extract 3-5 emotionally significant words/phrases from the input
- Score each by emotional intensity (0.0-1.0)
- Focus on words that carry psychological weight

RULES FOR detected_emotions:
- List primary emotions you detect (e.g., sadness, anxiety, anger, hopelessness, isolation, fatigue, fear, numbness, confusion)

CRITICAL:
- Never diagnose or label conditions
- Never dismiss or minimize their feelings
- The "reply" field is what the user will see — make it warm and human
- The JSON must be parseable — no markdown, no extra text outside the JSON`;

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

async function fetchShapExplanation(text: string) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/explain/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    // Run LLM analysis and SHAP explanation in parallel
    const [llmResult, shapResult] = await Promise.allSettled([
      textAnalysisLLM([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: String(text).slice(0, 3000) },
      ]),
      fetchShapExplanation(text),
    ]);

    // Parse LLM result
    let llmData: any = null;
    if (llmResult.status === "fulfilled") {
      try {
        let jsonStr = llmResult.value;
        const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          jsonStr = fenceMatch[1];
        } else {
          const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (braceMatch) jsonStr = braceMatch[0];
        }
        llmData = JSON.parse(jsonStr);
      } catch {
        llmData = null;
      }
    }

    // Use fallback if LLM failed
    if (!llmData) {
      const lexicon = fallbackLexicon(text);
      return NextResponse.json({
        reply: "Thank you for sharing your story with me. I can see that you're going through something meaningful. Your feelings are valid, and it takes courage to express them.",
        ...lexicon,
        shap_values: shapResult.status === "fulfilled" && shapResult.value
          ? shapResult.value.shap_values
          : [],
        shap_method: shapResult.status === "fulfilled" && shapResult.value
          ? shapResult.value.method
          : "unavailable",
      });
    }

    // Merge LLM lime_words with SHAP values
    const shapValues = shapResult.status === "fulfilled" && shapResult.value
      ? shapResult.value.shap_values
      : [];

    return NextResponse.json({
      reply: llmData.reply || "Thank you for sharing. I hear you.",
      text_score: Math.min(Math.max(llmData.text_score || 0, 0), 1),
      lime_words: Array.isArray(llmData.lime_words)
        ? llmData.lime_words.map((w: any) => ({
            word: String(w.word || ""),
            score: Math.min(Math.max(Number(w.score) || 0, 0), 1),
          }))
        : [],
      shap_values: shapValues,
      shap_method: shapResult.status === "fulfilled" && shapResult.value
        ? shapResult.value.method
        : "unavailable",
      detected_emotions: Array.isArray(llmData.detected_emotions) ? llmData.detected_emotions : [],
      summary: llmData.summary || "",
    });
  } catch (err: any) {
    return fallbackAnalysis("I'm here to listen.");
  }
}

function fallbackAnalysis(text: string) {
  const lexicon = fallbackLexicon(text);
  return NextResponse.json({
    reply: "Thank you for sharing your story with me. I can see that you're going through something meaningful. Your feelings are valid, and it takes courage to express them.",
    ...lexicon,
    shap_values: [],
    shap_method: "unavailable",
  });
}

function fallbackLexicon(text: string) {
  const lowerText = text.toLowerCase();
  const sadWords = ["sad", "depressed", "hopeless", "tired", "cry", "alone", "lonely", "dark", "pain", "worthless", "empty", "numb", "lost", "broken", "hurt"];
  const anxiousWords = ["anxious", "nervous", "scared", "worry", "panic", "fear", "stress", "overwhelmed", "racing", "cant breathe"];
  const crisisWords = ["suicide", "kill", "die", "end it", "hurt myself", "self harm", "no reason to live", "want to disappear"];
  const angerWords = ["angry", "furious", "rage", "hate", "frustrated", "irritated"];

  let score = 0.15;
  const matches: { word: string; score: number }[] = [];
  const emotions: string[] = [];

  crisisWords.forEach((w) => {
    if (lowerText.includes(w)) { score += 0.35; matches.push({ word: w, score: 0.9 }); if (!emotions.includes("crisis")) emotions.push("crisis"); }
  });
  sadWords.forEach((w) => {
    if (lowerText.includes(w)) { score += 0.12; matches.push({ word: w, score: 0.6 }); if (!emotions.includes("sadness")) emotions.push("sadness"); }
  });
  anxiousWords.forEach((w) => {
    if (lowerText.includes(w)) { score += 0.1; matches.push({ word: w, score: 0.5 }); if (!emotions.includes("anxiety")) emotions.push("anxiety"); }
  });
  angerWords.forEach((w) => {
    if (lowerText.includes(w)) { score += 0.08; matches.push({ word: w, score: 0.45 }); if (!emotions.includes("frustration")) emotions.push("frustration"); }
  });

  score = Math.min(score, 0.95);
  if (emotions.length === 0) emotions.push("neutral");

  return {
    text_score: score,
    lime_words: matches.slice(0, 5),
    detected_emotions: emotions,
    summary: `Detected ${emotions.join(", ")} with ${(score * 100).toFixed(0)}% distress level.`,
  };
}
