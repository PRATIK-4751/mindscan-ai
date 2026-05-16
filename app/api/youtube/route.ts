import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "meditation music relaxing";
  
  const apiKey = process.env.GOOGLE_API_KEY;
  
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=1&videoCategoryId=10`);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return NextResponse.json({ videoId: data.items[0].id.videoId, title: data.items[0].snippet.title });
    }
    return NextResponse.json({ videoId: "lFcSrYw-ARY", title: "Relaxing Meditation Music" });
  } catch (e) {
    return NextResponse.json({ videoId: "lFcSrYw-ARY", title: "Relaxing Meditation Music" });
  }
}
