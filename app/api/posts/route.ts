// app/api/posts/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOST = 'instagram-scraper-stable-api.p.rapidapi.com';
const BASE = `https://${HOST}`;

type PostsJSON = {
  data?: {
    user?: {
      edge_owner_to_timeline_media?: {
        edges?: unknown[];
        page_info?: unknown;
      };
    };
  };
  [key: string]: unknown;
};

function pickLargest(cands?: Array<{ url?: string; width?: number }>) {
  if (!Array.isArray(cands) || !cands.length) return null;
  return cands.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url ?? null;
}

// Be defensive: posts payloads vary a bit across accounts.
function extractThumbFromNode(node: any): string | null {
  // 1) Same structure as reels (rare for posts)
  const v2 = node?.image_versions2?.candidates;
  if (v2?.length) return pickLargest(v2);

  // 2) Common Graph shape
  if (typeof node?.display_url === 'string' && node.display_url.startsWith('http')) {
    return node.display_url;
  }
  if (typeof node?.thumbnail_src === 'string' && node.thumbnail_src.startsWith('http')) {
    return node.thumbnail_src;
  }

  // 3) Carousel: take first image
  const c0 = node?.carousel_media?.[0]?.image_versions2?.candidates;
  if (c0?.length) return pickLargest(c0);

  return null;
}

function extractTakenAt(node: any): number | null {
  // seconds (preferred) or ms → normalize to seconds
  if (typeof node?.taken_at_timestamp === 'number') return node.taken_at_timestamp;
  if (typeof node?.taken_at === 'number') {
    return node.taken_at > 2e10 ? Math.floor(node.taken_at / 1000) : node.taken_at;
  }
  if (typeof node?.caption?.created_at === 'number') return node.caption.created_at;
  return null;
}

function extractCaption(node: any): string | null {
  // 1) Direct object with text (your sample)
  if (typeof node?.caption?.text === 'string') return node.caption.text;

  // 2) GraphQL-style edges
  const edgeText = node?.edge_media_to_caption?.edges?.[0]?.node?.text;
  if (typeof edgeText === 'string') return edgeText;

  // 3) Some IGTV/Reels shapes expose title
  if (typeof node?.title === 'string') return node.title;

  // 4) Nothing found
  return null;
}

export async function POST(req: Request) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) return NextResponse.json({ error: 'Missing RAPIDAPI_KEY' }, { status: 500 });

  const { username_or_url, after } = await req.json().catch(() => ({} as any));
  if (!username_or_url) {
    return NextResponse.json({ error: 'Missing body.username_or_url' }, { status: 400 });
  }

  const body = new URLSearchParams({
    username_or_url,
    ...(after ? { pagination_token: String(after) } : {}),
  });

  const r = await fetch(`${BASE}/get_ig_user_posts.php`, {
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
  let json: PostsJSON | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // fall through
  }

  if (!r.ok || !json) {
    return NextResponse.json(
      { error: 'Upstream error', upstreamStatus: r.status, upstreamBody: text?.slice(0, 400) },
      { status: 502 }
    );
  }

  // The API usually returns edges under: data.user.edge_owner_to_timeline_media
  const edges =
    json?.data?.user?.edge_owner_to_timeline_media?.edges ??
    (json as any)?.edges ??
    (json as any)?.posts ??
    [];

  const items = (Array.isArray(edges) ? edges : [])
    .map((e: any, i: number) => {
      const n = e?.node ?? e?.media ?? e;
      const thumb = extractThumbFromNode(n);

      return {
        id: String(n?.id ?? n?.pk ?? n?.code ?? i),
        code: n?.shortcode ?? n?.code ?? null, // reels/igtv sometimes surface here
        thumbnail: thumb,
        caption: extractCaption(n),            // <-- ✅ include caption
        stats: {
          likeCount:
            n?.edge_media_preview_like?.count ??
            n?.like_count ??
            null,
          commentCount:
            n?.edge_media_to_comment?.count ??
            n?.comment_count ??
            null,
          playCount: n?.play_count ?? null,
        },
        takenAt: extractTakenAt(n),
      };
    })
    .filter((x: any) => x.thumbnail); // keep only items with a thumbnail

  const pageInfo = (json?.data?.user?.edge_owner_to_timeline_media?.page_info ?? {}) as Record<
    string,
    unknown
  >;
  const nextCursor = (json as any)?.pagination_token ?? pageInfo?.end_cursor ?? null;

  return NextResponse.json({
    items,
    pageInfo: { hasNextPage: Boolean(nextCursor), endCursor: nextCursor },
  });
}
