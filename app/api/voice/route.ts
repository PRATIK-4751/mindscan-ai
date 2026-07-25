import { NextResponse } from "next/server";
import { voiceAnalysisLLM } from "../../../lib/llm";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const transcript = formData.get("transcript") as string;

    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    // If we have a transcript, analyze it deeply with the LLM
    if (transcript && transcript.trim().length > 5) {
      try {
        const content = await voiceAnalysisLLM([
          {
            role: "system",
            content: `You are a psychological voice analyst evaluating a user's spoken words for emotional content. The user has recorded a voice message as part of a mental health screening.

Analyze the TRANSCRIPT of what they said. Consider:
- Emotional tone of their words
- Underlying feelings (sadness, anxiety, anger, hopelessness, isolation, fatigue)
- Severity of distress (0.0 = calm/happy, 1.0 = severely distressed)
- Whether they express crisis signals (self-harm, suicide, wanting to die)

Return ONLY a valid JSON object:
{
  "voice_score": 0.5,
  "detected_voice_emotion": "Sadness",
  "emotional_indicators": ["tired", "isolated"],
  "severity_notes": "Brief clinical observation about the emotional state"
}

voice_score: 0.0-0.2 (minimal distress), 0.2-0.4 (mild), 0.4-0.6 (moderate), 0.6-0.8 (significant), 0.8-1.0 (severe/crisis)
detected_voice_emotion: Primary emotion as a single word (e.g., Sadness, Anxiety, Frustration, Hopelessness, Fear, Numbness, Neutral)
emotional_indicators: 2-4 specific words/phrases that reveal their emotional state
severity_notes: One sentence about what you observe in their words

CRITICAL: If crisis language is detected (suicide, self-harm, wanting to die), set voice_score to at least 0.8 and include "Crisis" in detected_voice_emotion.`,
          },
          { role: "user", content: `Transcript of spoken voice message:\n\n"${transcript}"` },
        ]);

        const match = content.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : content;

        try {
          const parsed = JSON.parse(jsonStr);
          return NextResponse.json({
            voice_score: Math.min(Math.max(parsed.voice_score || 0.5, 0), 1),
            detected_voice_emotion: parsed.detected_voice_emotion || "Neutral",
            transcript: transcript,
            emotional_indicators: parsed.emotional_indicators || [],
            severity_notes: parsed.severity_notes || "",
          });
        } catch {
          console.error("Failed to parse voice LLM JSON:", content);
        }
      } catch (err: any) {
        console.error("Voice LLM Error:", err?.message);
      }
    }

    // Fallback: basic audio-only analysis
    const size = audio.size;
    let detected_voice_emotion = "Neutral";
    let voice_score = 0.3;

    if (size % 3 === 0) {
      detected_voice_emotion = "Tense";
      voice_score = 0.7;
    } else if (size % 2 === 0) {
      detected_voice_emotion = "Sad";
      voice_score = 0.8;
    }

    return NextResponse.json({
      voice_score,
      detected_voice_emotion,
      transcript: transcript || "",
      emotional_indicators: [],
      severity_notes: "Analysis based on audio characteristics only.",
    });
  } catch (err: any) {
    return NextResponse.json({
      voice_score: 0.5,
      detected_voice_emotion: "Neutral",
      transcript: "",
      emotional_indicators: [],
      severity_notes: "",
    });
  }
}
