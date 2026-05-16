import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "meditation music relaxing";
  
  const apiKey = process.env.GOOGLE_API_KEY;
  
  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=5&videoCategoryId=10`);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const tracks = data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title
      }));
      return NextResponse.json({ tracks });
    }
    return NextResponse.json({ tracks: [{ videoId: "lFcSrYw-ARY", title: "Relaxing Meditation Music" }] });
  } catch (e) {
    return NextResponse.json({ tracks: [{ videoId: "lFcSrYw-ARY", title: "Relaxing Meditation Music" }] });
  }
}
