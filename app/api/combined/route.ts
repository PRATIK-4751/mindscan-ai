import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text_score, face_score, voice_score, phq9_score } = body;

    const final_score = (text_score * 0.3) + (face_score * 0.2) + (voice_score * 0.2) + (phq9_score * 0.3);

    let risk_level = "Low Risk";
    if (final_score > 0.7) risk_level = "High Risk";
    else if (final_score > 0.4) risk_level = "Medium Risk";

    return NextResponse.json({
      ...body,
      final_score,
      risk_level,
      detected_face_emotion: face_score > 0.6 ? "Sad/Tense" : "Neutral",
      detected_voice_emotion: voice_score > 0.6 ? "Sad/Tense" : "Neutral",
    });
  } catch (err: any) {
    return NextResponse.json({ final_score: 0.5, risk_level: "Medium Risk" });
  }
}
