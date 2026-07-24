import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "API key is missing" }, { status: 500 });
    }

    // Use a pre-made voice that is available on the free tier
    // Bella: EXAVITQu4vr4xnSDxMaL, Rachel: 21m00Tcm4TlvDq8ikWAM, Antoni: MF3mGyEYCl7XYWbV9CcA
    const VOICE_ID = (process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL").trim(); 

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.detail?.message || "Failed to generate speech";
      console.error("ElevenLabs Error:", errorData);
      return NextResponse.json({ error: errorMsg, details: errorData }, { status: response.status });
    }

    // Return the raw audio buffer
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
