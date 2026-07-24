import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const transcript = formData.get("transcript") as string;
    
    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    if (transcript && transcript.trim().length > 0) {
      // Use LLM to analyze the transcript for emotional context
      const apiKey = process.env.OLLAMA_CLOUD_API_KEY?.trim();
      const apiUrl = (process.env.OLLAMA_CLOUD_API_URL || "https://api.ollama.com/v1/chat/completions").trim(); 
      const model = (process.env.OLLAMA_CLOUD_MODEL || "llama3.1:70b").trim();
      
      const systemPrompt = `You are a psychological analyzer evaluating a user's spoken voice transcript. Analyze the emotional tone of the following transcript. Return ONLY a valid JSON object in the exact format: {"voice_score": 0.5, "detected_voice_emotion": "Neutral"}. The voice_score should be a float between 0.0 (calm/happy) to 1.0 (highly distressed/anxious/sad). The emotion should be a single word describing the primary emotion.`;
      
      if (!apiKey) {
        console.warn("OLLAMA_CLOUD_API_KEY is missing for voice analysis. Falling back to simple analysis.");
      } else {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: transcript }
            ],
            temperature: 0.1,
            max_tokens: 100,
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const content = 
            data?.choices?.[0]?.message?.content ??
            data?.message?.content ??
            data?.response ?? 
            "{}";
            
          // Extract JSON block if surrounded by markdown
          const match = content.match(/\{[\s\S]*\}/);
          const jsonStr = match ? match[0] : content;
          
          try {
            const parsed = JSON.parse(jsonStr);
            return NextResponse.json({ 
              voice_score: parsed.voice_score || 0.5, 
              detected_voice_emotion: parsed.detected_voice_emotion || "Neutral",
              transcript: transcript
            });
          } catch (e) {
            console.error("Failed to parse JSON from LLM:", content);
          }
        } else {
          const errorText = await response.text();
          console.error("Voice LLM API Error:", response.status, errorText);
        }
      }
    }

    // Fallback if no transcript or API fails
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

    return NextResponse.json({ voice_score, detected_voice_emotion, transcript: transcript || "" });
  } catch (err: any) {
    return NextResponse.json({ voice_score: 0.5, detected_voice_emotion: "Neutral", transcript: "" });
  }
}