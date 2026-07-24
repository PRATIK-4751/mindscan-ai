import { NextResponse } from 'next/server';

async function callGoogleVision(base64Image: string) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { content: base64Image },
        features: [
          { type: "FACE_DETECTION", maxResults: 1 },
          { type: "LABEL_DETECTION", maxResults: 5 },
        ],
      }],
    }),
    signal: AbortSignal.timeout(10000),
  });

  const visionData = await visionResponse.json();
  return visionData.responses?.[0] || null;
}

function likelihoodScore(val: string): number {
  switch (val) {
    case 'VERY_LIKELY': return 1.0;
    case 'LIKELY': return 0.8;
    case 'POSSIBLE': return 0.5;
    case 'UNLIKELY': return 0.2;
    default: return 0;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const textContext = formData.get("textContext") as string | null;
    const clientEmotionsRaw = formData.get("clientEmotions") as string | null;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const clientEmotions = clientEmotionsRaw ? JSON.parse(clientEmotionsRaw) : null;

    const arrayBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    const googleVision = await callGoogleVision(base64Image);

    const faces = googleVision?.faceAnnotations;
    let googleJoy = 0, googleSorrow = 0, googleAnger = 0, googleSurprise = 0;
    let googleLabels: string[] = [];

    if (faces && faces.length > 0) {
      const face = faces[0];
      googleJoy = likelihoodScore(face.joyLikelihood);
      googleSorrow = likelihoodScore(face.sorrowLikelihood);
      googleAnger = likelihoodScore(face.angerLikelihood);
      googleSurprise = likelihoodScore(face.surpriseLikelihood);
    }

    if (googleVision?.labelAnnotations) {
      googleLabels = googleVision.labelAnnotations.map((l: any) => l.description).slice(0, 5);
    }

    // Use client-side emotion results if provided, otherwise fall back to Google Vision only
    let face_score = 0.2;
    let detected_face_emotion = "Neutral";
    let emotions: Record<string, number> | null = null;
    let dominant_emotion: string | null = null;
    let emotion_confidence: number | null = null;
    let faces_detected = faces?.length ?? 0;

    if (clientEmotions && clientEmotions.face_detected) {
      emotions = clientEmotions.emotions;
      dominant_emotion = clientEmotions.dominant_emotion;
      emotion_confidence = clientEmotions.confidence;
      faces_detected = 1;

      const emo = clientEmotions.dominant_emotion;
      const conf = clientEmotions.confidence;

      if (emo === "Sad") { detected_face_emotion = "Sad"; face_score = 0.7 + conf * 0.2; }
      else if (emo === "Angry") { detected_face_emotion = "Tense"; face_score = 0.6 + conf * 0.2; }
      else if (emo === "Fear") { detected_face_emotion = "Anxious"; face_score = 0.65 + conf * 0.2; }
      else if (emo === "Disgust") { detected_face_emotion = "Distressed"; face_score = 0.55 + conf * 0.2; }
      else if (emo === "Surprise") { detected_face_emotion = "Surprised"; face_score = 0.3 + conf * 0.2; }
      else if (emo === "Happy") { detected_face_emotion = "Calm"; face_score = 0.1; }
      else { detected_face_emotion = "Neutral"; face_score = 0.2; }

      // Cross-reference with Google Vision
      if (googleSorrow > 0.4 && detected_face_emotion !== "Sad") {
        face_score = Math.min(face_score + 0.15, 0.95);
        detected_face_emotion = "Sad";
      }
      if (googleAnger > 0.4 && detected_face_emotion !== "Tense") {
        face_score = Math.min(face_score + 0.1, 0.95);
        detected_face_emotion = "Tense";
      }
    } else if (faces && faces.length > 0) {
      // Google Vision only fallback
      if (googleSorrow > 0.4) { detected_face_emotion = "Sad"; face_score = 0.8 + googleSorrow * 0.15; }
      else if (googleAnger > 0.4) { detected_face_emotion = "Tense"; face_score = 0.7 + googleAnger * 0.15; }
      else if (googleSurprise > 0.4) { detected_face_emotion = "Anxious"; face_score = 0.6 + googleSurprise * 0.15; }
      else if (googleJoy > 0.4) { detected_face_emotion = "Calm"; face_score = 0.1; }
    }

    const emotionSummary = dominant_emotion
      ? `Face emotion analysis detected: ${dominant_emotion} (${Math.round((emotion_confidence ?? 0) * 100)}% confidence). Scores: ${Object.entries(emotions ?? {}).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(', ')}.`
      : "No facial emotion detected.";

    const googleContext = faces && faces.length > 0
      ? `Google Vision detected emotions - Joy: ${Math.round(googleJoy * 100)}%, Sorrow: ${Math.round(googleSorrow * 100)}%, Anger: ${Math.round(googleAnger * 100)}%, Surprise: ${Math.round(googleSurprise * 100)}%. Labels: ${googleLabels.join(', ')}.`
      : "No face detected by Google Vision.";

    return NextResponse.json({
      face_score,
      detected_face_emotion,
      faces_detected,
      emotions,
      dominant_emotion,
      emotion_confidence,
      google_labels: googleLabels,
      llm_context: `${emotionSummary} ${googleContext} ${textContext ? `User's written context: "${textContext}"` : ''}`.trim(),
    });
  } catch (err: any) {
    console.error("Vision API Error:", err);
    return NextResponse.json({
      face_score: 0.5,
      detected_face_emotion: "Neutral",
      faces_detected: 0,
      emotions: null,
      llm_context: "Vision analysis unavailable.",
    });
  }
}
