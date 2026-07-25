import { NextResponse } from "next/server";
import { textAnalysisLLM } from "../../../lib/llm";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    const systemPrompt = `You are MindScan, an empathetic mental health screening AI. A user has shared their personal story with you.

YOUR ROLE:
- Listen deeply to what they share
- Respond with warmth, validation, and genuine care
- Provide a compassionate, thoughtful reply (3-5 sentences) acknowledging their experience
- Gently reflect back the key emotions you sense
- If you detect distress, normalize it and offer hope
- If crisis signals appear (self-harm, suicide), immediately provide crisis resources (988 Suicide & Crisis Lifeline)

ALSO return a structured analysis. Your response MUST be valid JSON with this exact structure:

{
  "reply": "Your compassionate response to the user here...",
  "text_score": 0.5,
  "lime_words": [{"word": "word", "score": 0.8}],
  "detected_emotions": ["sadness", "anxiety"],
  "summary": "Brief clinical summary"
}

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
- The JSON must be parseable — no markdown, no extra text outside the JSON
- If the user shares something concerning, acknowledge it directly`;

    try {
      const content = await textAnalysisLLM([
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ]);

      const match = content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : content;

      try {
        const parsed = JSON.parse(jsonStr);
        return NextResponse.json({
          reply: parsed.reply || "Thank you for sharing. I hear you.",
          text_score: Math.min(Math.max(parsed.text_score || 0, 0), 1),
          lime_words: Array.isArray(parsed.lime_words)
            ? parsed.lime_words.map((w: any) => ({
                word: String(w.word || ""),
                score: Math.min(Math.max(Number(w.score) || 0, 0), 1),
              }))
            : [],
          detected_emotions: Array.isArray(parsed.detected_emotions)
            ? parsed.detected_emotions
            : [],
          summary: parsed.summary || "",
        });
      } catch {
        const lexicon = fallbackLexicon(text);
        return NextResponse.json({
          reply: content.trim() || "Thank you for sharing that with me.",
          text_score: lexicon.text_score,
          lime_words: lexicon.lime_words,
          detected_emotions: lexicon.detected_emotions,
          summary: "Analysis based on text patterns.",
        });
      }
    } catch {
      return fallbackAnalysis(text);
    }
  } catch (err: any) {
    console.error("Text analysis error:", err);
    return fallbackAnalysis("I'm here to listen.");
  }
}

function fallbackAnalysis(text: string) {
  const lexicon = fallbackLexicon(text);
  return NextResponse.json({
    reply: "Thank you for sharing your story with me. I can see that you're going through something meaningful. Your feelings are valid, and it takes courage to express them. I'm here to support you through this screening.",
    ...lexicon,
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
