// app/api/reel-download/route.ts
import { NextResponse } from 'next/server';

const KEY = process.env.RAPIDAPI_KEY!;
const HOST = process.env.IGDL_HOST || 'instagram-video-image-downloader.p.rapidapi.com';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

    const url = `https://www.instagram.com/reel/${code}`;
    const resp = await fetch(`https://${HOST}/igdl?url=${encodeURIComponent(url)}`, {
      headers: {
        'x-rapidapi-key': KEY,
        'x-rapidapi-host': HOST,
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: `IGDL failed: ${t}` }, { status: 502 });
    }
    const json = await resp.json();

    // IGDL often returns an array; find the first mp4
    const files: any[] = Array.isArray(json) ? json : (json?.data || []);
    const mp4 = files.find((f: any) => String(f?.url || '').includes('.mp4'))?.url || files[0]?.url;

    return NextResponse.json({ videoUrl: mp4 || null }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'download error' }, { status: 500 });
  }
}
