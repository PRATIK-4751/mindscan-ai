import { NextResponse } from "next/server";
import { voiceAnalysisLLM } from "../../../lib/llm";
import type { ShapValue } from "../../../lib/types";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

async function analyzeWithLibrosa(audioBuffer: ArrayBuffer, filename: string) {
  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/wav" });
    formData.append("audio", blob, filename);
    const res = await fetch(`${ML_SERVICE_URL}/analyze`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchVoiceSHAP(features: Record<string, number>) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/explain/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions: features }),
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
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const transcript = formData.get("transcript") as string;

    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    // Try Librosa analysis and LLM transcript analysis in parallel
    const audioBuffer = await audio.arrayBuffer();
    const [librosaResult, llmResult] = await Promise.allSettled([
      analyzeWithLibrosa(audioBuffer, audio.name || "audio.wav"),
      transcript && transcript.trim().length > 5
        ? voiceAnalysisLLM([
            {
              role: "system",
              content: `Analyze this voice transcript for emotional content. Return ONLY valid JSON (no markdown, no code fences):
{"voice_score":0.5,"detected_voice_emotion":"Sadness","emotional_indicators":["tired","isolated"],"severity_notes":"Brief observation"}

voice_score: 0.0-1.0 (0=calm, 1=severe distress). detected_voice_emotion: single word (Sadness/Anxiety/Frustration/Hopelessness/Fear/Numbness/Neutral). emotional_indicators: 2-4 words from the text. severity_notes: one sentence. If crisis language (suicide/self-harm), set score >= 0.8 and emotion to "Crisis".`,
            },
            { role: "user", content: transcript },
          ])
        : Promise.resolve(null),
    ]);

    // Parse Librosa result
    const librosa = librosaResult.status === "fulfilled" ? librosaResult.value : null;
    const librosaScore = librosa?.depression_risk ?? librosa?.voice_score ?? null;
    const librosaEmotion = librosa?.predicted_emotion ?? null;
    const librosaFeatures = librosa?.features ?? null;

    // Parse LLM result
    let llmData: any = null;
    if (llmResult.status === "fulfilled" && llmResult.value) {
      try {
        let jsonStr = llmResult.value;
        const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) jsonStr = fenceMatch[1];
        else { const m = jsonStr.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }
        llmData = JSON.parse(jsonStr);
      } catch { llmData = null; }
    }

    // Get SHAP explanation if we have Librosa features
    let shapResult: any = null;
    if (librosaFeatures) {
      shapResult = await fetchVoiceSHAP(librosaFeatures);
    }

    // Use Librosa score if available, else LLM score, else fallback
    const voiceScore = librosaScore ?? llmData?.voice_score ?? 0.25;
    const voiceEmotion = librosaEmotion ?? llmData?.detected_voice_emotion ?? "Neutral";

    const shapValues: ShapValue[] = shapResult?.shap_values ?? [];

    return NextResponse.json({
      voice_score: Math.min(Math.max(Number(voiceScore) || 0.25, 0), 1),
      detected_voice_emotion: voiceEmotion,
      transcript: transcript || "",
      emotional_indicators: llmData?.emotional_indicators || [],
      severity_notes: llmData?.severity_notes || "",
      shap_values: shapValues,
      shap_method: shapResult?.method ?? "unavailable",
      librosa_available: librosa !== null,
      librosa_confidence: librosa?.confidence ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({
      voice_score: 0.25,
      detected_voice_emotion: "Neutral",
      transcript: "",
      emotional_indicators: [],
      severity_notes: "Voice analysis encountered an error.",
      shap_values: [],
      shap_method: "unavailable",
      librosa_available: false,
    });
  }
}
