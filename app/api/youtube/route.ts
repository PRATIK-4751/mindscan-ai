import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Using the user's explicitly requested therapeutic playlist
  const tracks = [
    { videoId: "G8M8WJ10ITU", title: "Deep Focus & Binaural Relaxation" },
    { videoId: "NQL_Iqx-q2E", title: "Calming Ambient Soundscape" },
    { videoId: "MzgMBrtrFc4", title: "Peaceful Healing Meditation" }
  ];
  
  return NextResponse.json({ tracks });
}
