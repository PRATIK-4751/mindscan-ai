import { NextResponse } from "next/server";
import { voiceAnalysisLLM } from "../../../lib/llm";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const transcript = formData.get("transcript") as string;

    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    if (transcript && transcript.trim().length > 5) {
      try {
        const content = await voiceAnalysisLLM([
          {
            role: "system",
            content: `Analyze this voice transcript for emotional content. Return ONLY valid JSON (no markdown, no code fences):
{"voice_score":0.5,"detected_voice_emotion":"Sadness","emotional_indicators":["tired","isolated"],"severity_notes":"Brief observation"}

voice_score: 0.0-1.0 (0=calm, 1=severe distress). detected_voice_emotion: single word (Sadness/Anxiety/Frustration/Hopelessness/Fear/Numbness/Neutral). emotional_indicators: 2-4 words from the text. severity_notes: one sentence. If crisis language (suicide/self-harm), set score >= 0.8 and emotion to "Crisis".`,
          },
          { role: "user", content: transcript },
        ]);

        let jsonStr = content;
        const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) {
          jsonStr = fenceMatch[1];
        } else {
          const braceMatch = content.match(/\{[\s\S]*\}/);
          if (braceMatch) jsonStr = braceMatch[0];
        }

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

    return NextResponse.json({
      voice_score: 0.25,
      detected_voice_emotion: "Neutral",
      transcript: transcript || "",
      emotional_indicators: [],
      severity_notes: transcript
        ? "Transcript was too short for reliable analysis."
        : "No speech detected. Please try speaking clearly into your microphone.",
    });
  } catch (err: any) {
    return NextResponse.json({
      voice_score: 0.25,
      detected_voice_emotion: "Neutral",
      transcript: "",
      emotional_indicators: [],
      severity_notes: "Voice analysis encountered an error.",
    });
  }
}
