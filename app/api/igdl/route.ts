/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const key  = process.env.RAPIDAPI_KEY!;
  const host = process.env.RAPIDAPI_HOST!; 
  const base = process.env.RAPIDAPI_BASE_URL!; 

  const igUrl = new URL(req.url).searchParams.get('url');
  if (!igUrl) return NextResponse.json({ error: 'Missing ?url' }, { status: 400 });

  const upstream = await fetch(`${base}/igdl?url=${encodeURIComponent(igUrl)}`, {
    headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': host },
  });

  const json = await upstream.json().catch(() => null);
  if (!upstream.ok || !json) {
    return NextResponse.json({ error: 'Upstream error', details: await upstream.text() }, { status: upstream.status || 502 });
  }

  // Your sample shows an ARRAY at the root: [{ thumbnail, url }, ...]
  const raw: any[] =
    Array.isArray(json) ? json :
    json?.data ?? json?.result ?? json?.results ?? [];

  // Normalize + dedupe (same thumb repeated)
  const seen = new Set<string>();
  const items = raw
    .filter((it) => it?.thumbnail)
    .map((it, i) => ({
      id: it.url ?? i,
      thumbnail: it.thumbnail as string,
      mediaUrl: (it.url as string) || (it.thumbnail as string),
    }))
    .filter((it) => {
      if (seen.has(it.thumbnail)) return false;
      seen.add(it.thumbnail);
      return true;
    });

  return NextResponse.json({ items });
}
