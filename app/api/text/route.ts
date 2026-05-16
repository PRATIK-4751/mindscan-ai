import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    // Fallback simple lexicon analysis since we are moving away from python backend
    const lowerText = text.toLowerCase();
    const sadWords = ['sad', 'depressed', 'hopeless', 'tired', 'cry', 'alone', 'lonely', 'dark', 'pain'];
    const anxiousWords = ['anxious', 'nervous', 'scared', 'worry', 'panic', 'fear'];
    
    let score = 0.2;
    let matches: string[] = [];

    sadWords.forEach(w => { if(lowerText.includes(w)) { score += 0.2; matches.push(w); } });
    anxiousWords.forEach(w => { if(lowerText.includes(w)) { score += 0.15; matches.push(w); } });

    score = Math.min(score, 0.95);

    const lime_words = matches.map(w => ({ word: w, weight: 0.15 }));

    return NextResponse.json({ text_score: score, lime_words });
  } catch (err: any) {
    return NextResponse.json({ text_score: 0.5, lime_words: [] });
  }
}
