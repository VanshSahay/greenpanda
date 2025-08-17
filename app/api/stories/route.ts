// app/api/stories/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOST = 'instagram-scraper-stable-api.p.rapidapi.com';
const BASE = `https://${HOST}`;

type StoriesJSON = any;

function pickLargest(cands?: Array<{ url?: string; width?: number }>) {
  if (!Array.isArray(cands) || !cands.length) return null;
  return cands.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

function extractTakenAt(n: any): number | null {
  if (typeof n?.taken_at === 'number') return n.taken_at;
  if (typeof n?.taken_at_timestamp === 'number') return n.taken_at_timestamp;
  if (typeof n?.caption?.created_at === 'number') return n.caption.created_at;
  return null;
}

export async function POST(req: Request) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: 'Missing RAPIDAPI_KEY' }, { status: 500 });

  const { username_or_url } = await req.json().catch(() => ({} as any));
  if (!username_or_url) {
    return NextResponse.json({ error: 'Missing body.username_or_url' }, { status: 400 });
  }

  // RapidAPI expects x-www-form-urlencoded
  const body = new URLSearchParams({ username_or_url });

  const r = await fetch(`${BASE}/get_ig_user_stories.php`, {
    method: 'POST',
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': HOST,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const text = await r.text();
  let json: StoriesJSON | null = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!r.ok || !json) {
    return NextResponse.json(
      { error: 'Upstream error', upstreamStatus: r.status, upstreamBody: text?.slice(0, 400) },
      { status: 502 }
    );
  }

  // Debug logging (commented out for production)
  // console.log('Stories API Response:', JSON.stringify(json, null, 2));

  // Different accounts can return slightly different shapes
  const raw =
    (Array.isArray(json) && json) ||  // Stories are directly in the array
    (Array.isArray(json?.stories) && json.stories) ||
    (Array.isArray(json?.items) && json.items) ||
    (Array.isArray(json?.reels) && json.reels) ||
    [];

  const items = (raw as any[]).map((it, i) => {
    // Stories come directly, no need for nested node/media access
    const n = it;

    const thumb =
      pickLargest(n?.image_versions2?.candidates) ||
      null;

    const mediaUrl =
      (Array.isArray(n?.video_versions) && n.video_versions[0]?.url) ||
      null;

    return {
      id: String(n?.id ?? n?.pk ?? n?.code ?? i),
      code: n?.code ?? n?.shortcode ?? null, // sometimes present
      thumbnail: thumb,
      mediaUrl,
      stats: null,
      takenAt: extractTakenAt(n),
    };
  }).filter((x) => x.thumbnail || x.mediaUrl);

  return NextResponse.json({
    items,
    pageInfo: { hasNextPage: false, endCursor: null }, // stories aren’t paginated
  });
}
