// app/api/stories/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOST = 'instagram-scraper-stable-api.p.rapidapi.com';
const BASE = `https://${HOST}`;

type StoriesJSON = {
  stories?: unknown[];
  items?: unknown[];
  reels?: unknown[];
  [key: string]: unknown;
};

function pickLargest(cands?: Array<{ url?: string; width?: number }>) {
  if (!Array.isArray(cands) || !cands.length) return null;
  return cands.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

function extractTakenAt(n: Record<string, unknown>): number | null {
  if (typeof n?.taken_at === 'number') return n.taken_at;
  if (typeof n?.taken_at_timestamp === 'number') return n.taken_at_timestamp;
  const caption = n?.caption as Record<string, unknown>;
  if (typeof caption?.created_at === 'number') return caption.created_at;
  return null;
}

export async function POST(req: Request) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: 'Missing RAPIDAPI_KEY' }, { status: 500 });

  const { username_or_url } = await req.json().catch(() => ({} as Record<string, unknown>));
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

  const items = (raw as Record<string, unknown>[]).map((it, i) => {
    // Stories come directly, no need for nested node/media access
    const n = it;

    const imageVersions = (n as Record<string, unknown>)?.image_versions2 as Record<string, unknown>;
    const thumb = pickLargest(imageVersions?.candidates as Array<{ url?: string; width?: number }>) || null;

    const videoVersions = (n as Record<string, unknown>)?.video_versions;
    const mediaUrl =
      (Array.isArray(videoVersions) && (videoVersions[0] as Record<string, unknown>)?.url as string) ||
      null;

    return {
      id: String((n as Record<string, unknown>)?.id ?? (n as Record<string, unknown>)?.pk ?? (n as Record<string, unknown>)?.code ?? i),
      code: (n as Record<string, unknown>)?.code as string ?? (n as Record<string, unknown>)?.shortcode as string ?? null,
      thumbnail: thumb,
      mediaUrl,
      stats: null,
      takenAt: extractTakenAt(n as Record<string, unknown>),
    };
  }).filter((x) => x.thumbnail || x.mediaUrl);

  return NextResponse.json({
    items,
    pageInfo: { hasNextPage: false, endCursor: null }, // stories aren’t paginated
  });
}
