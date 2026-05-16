import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const tracks = [
    { url: "https://youtu.be/G8M8WJ10ITU?si=mxvb-LvDpNHeCOTM", title: "Deep Focus & Binaural Relaxation" },
    { url: "https://youtu.be/NQL_Iqx-q2E?si=2d5eTiXphdg712h5", title: "Calming Ambient Soundscape" },
    { url: "https://youtu.be/MzgMBrtrFc4?si=NYSiYRHOu3ZfF1Ys", title: "Peaceful Healing Meditation" }
  ];
  
  return NextResponse.json({ tracks });
}
