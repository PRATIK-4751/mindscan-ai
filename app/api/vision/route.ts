import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const arrayBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) throw new Error("Missing Google API Key");

    const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "FACE_DETECTION", maxResults: 1 }]
          }
        ]
      })
    });

    const visionData = await visionResponse.json();
    const faces = visionData.responses?.[0]?.faceAnnotations;
    
    if (!faces || faces.length === 0) {
      return NextResponse.json({ face_score: 0.2, detected_face_emotion: "Neutral" });
    }

    const face = faces[0];
    
    const likelihoodScore = (val: string) => {
      switch(val) {
        case 'VERY_LIKELY': return 1.0;
        case 'LIKELY': return 0.8;
        case 'POSSIBLE': return 0.5;
        case 'UNLIKELY': return 0.2;
        default: return 0;
      }
    };

    const joy = likelihoodScore(face.joyLikelihood);
    const sorrow = likelihoodScore(face.sorrowLikelihood);
    const anger = likelihoodScore(face.angerLikelihood);
    const surprise = likelihoodScore(face.surpriseLikelihood);
    
    let detected_face_emotion = "Neutral";
    let face_score = 0.2; 
    
    if (sorrow > 0.4) {
      detected_face_emotion = "Sad";
      face_score = 0.8 + (sorrow * 0.2);
    } else if (anger > 0.4) {
      detected_face_emotion = "Tense";
      face_score = 0.7 + (anger * 0.2);
    } else if (surprise > 0.4) {
      detected_face_emotion = "Anxious";
      face_score = 0.6 + (surprise * 0.2);
    } else if (joy > 0.4) {
      detected_face_emotion = "Calm";
      face_score = 0.1;
    }

    return NextResponse.json({ face_score, detected_face_emotion });
  } catch (err: any) {
    console.error("Vision API Error:", err);
    return NextResponse.json({ face_score: 0.5, detected_face_emotion: "Neutral" });
  }
}
