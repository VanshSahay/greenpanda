// app/api/reels/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOST = 'instagram-scraper-stable-api.p.rapidapi.com';
const BASE = `https://${HOST}`;

type ReelsJSON = {
  reels?: any[];
  pagination_token?: string | null;
};

function pickLargest(cands?: any[]) {
  if (!Array.isArray(cands) || !cands.length) return null;
  return cands.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

export async function POST(req: Request) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: 'Missing RAPIDAPI_KEY' }, { status: 500 });

  const { username_or_url, after } = await req.json().catch(() => ({} as any));
  if (!username_or_url) {
    return NextResponse.json({ error: 'Missing body.username_or_url' }, { status: 400 });
  }

  // upstream expects POST with form-encoded body
  const body = new URLSearchParams({
    username_or_url,
    ...(after ? { pagination_token: String(after) } : {}),
  });

  const r = await fetch(`${BASE}/get_ig_user_reels.php`, {
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
  let json: ReelsJSON | null = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!r.ok || !json) {
    return NextResponse.json(
      { error: 'Upstream error', upstreamStatus: r.status, upstreamBody: text?.slice(0, 400) },
      { status: 502 }
    );
  }

  const reels = Array.isArray(json.reels) ? json.reels : [];
  const nextCursor = json.pagination_token || null;

  const items = reels
    .map((it: any, i: number) => {
      const media = it?.node?.media ?? {};
      const thumb = pickLargest(media?.image_versions2?.candidates);
      return {
        id: String(media.id ?? media.pk ?? media.code ?? i),
        code: media.code ?? null,
        thumbnail: thumb,
        stats: {
          likeCount: media.like_count ?? null,
          commentCount: media.comment_count ?? null,
          playCount: media.play_count ?? null,
        },
      };
    })
    .filter((x) => x.thumbnail);

  return NextResponse.json({
    items,
    pageInfo: { hasNextPage: Boolean(nextCursor), endCursor: nextCursor },
  });
}
