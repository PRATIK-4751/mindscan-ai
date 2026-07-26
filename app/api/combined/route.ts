import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text_score, face_score, voice_score, phq9_score } = body;

    const weights = { text: 0.3, face: 0.2, voice: 0.2, phq9: 0.3 };
    const final_score = (text_score * weights.text) + (face_score * weights.face) + (voice_score * weights.voice) + (phq9_score * weights.phq9);

    let risk_level = "Low Risk";
    if (final_score > 0.7) risk_level = "High Risk";
    else if (final_score > 0.4) risk_level = "Medium Risk";

    const internalDistress = (text_score + phq9_score) / 2;
    const externalPresentation = (face_score + voice_score) / 2;

    let silentDistress = false;
    if (internalDistress > 0.65 && externalPresentation < 0.35) {
      silentDistress = true;
      risk_level = "High Risk (Silent Distress)";
    }

    const modalities = [
      { name: "text", score: text_score, weight: weights.text },
      { name: "face", score: face_score, weight: weights.face },
      { name: "voice", score: voice_score, weight: weights.voice },
      { name: "phq9", score: phq9_score, weight: weights.phq9 },
    ].sort((a, b) => (b.score * b.weight) - (a.score * a.weight));

    const primaryContributor = modalities[0].name;

    return NextResponse.json({
      ...body,
      final_score: Math.min(Math.max(final_score, 0), 1),
      risk_level,
      silentDistress,
      primaryContributor,
      detected_face_emotion: face_score > 0.6 ? "Distressed" : face_score > 0.35 ? "Mildly Concerned" : "Calm",
      detected_voice_emotion: voice_score > 0.6 ? "Distressed" : voice_score > 0.35 ? "Uneasy" : "Steady",
    });
  } catch (err: any) {
    return NextResponse.json({ final_score: 0.5, risk_level: "Medium Risk", silentDistress: false });
  }
}
