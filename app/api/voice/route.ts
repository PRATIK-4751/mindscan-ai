import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    // Since audio analysis requires complex ML (like whisper), we mock the voice emotion
    // based on file size or simple random variation for demo purposes without python backend.
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

    return NextResponse.json({ voice_score, detected_voice_emotion });
  } catch (err: any) {
    return NextResponse.json({ voice_score: 0.5, detected_voice_emotion: "Neutral" });
  }
}
