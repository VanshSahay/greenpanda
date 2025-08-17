// app/api/profile/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HOST = 'instagram-scraper-stable-api.p.rapidapi.com';
const BASE = `https://${HOST}`;

export async function POST(req: Request) {
  try {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) return NextResponse.json({ error: 'Missing RAPIDAPI_KEY' }, { status: 500 });

    const { username_or_url } = await req.json().catch(() => ({} as Record<string, unknown>));
    if (!username_or_url) {
      return NextResponse.json({ error: 'Missing body.username_or_url' }, { status: 400 });
    }

    // RapidAPI expects x-www-form-urlencoded
    const body = new URLSearchParams({ username_or_url });

    const response = await fetch(`${BASE}/ig_get_fb_profile_v3.php`, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': HOST,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
      cache: 'no-store',
    });

    const text = await response.text();
    let json: Record<string, unknown> | null = null;
    try { 
      json = text ? JSON.parse(text) : null; 
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
    }

    if (!response.ok || !json) {
      return NextResponse.json(
        { error: 'Upstream error', upstreamStatus: response.status, upstreamBody: text?.slice(0, 400) },
        { status: 502 }
      );
    }

    // Extract profile picture URL from the response
    const profilePicUrl = json?.profile_pic_url || null;

    if (!profilePicUrl) {
      return NextResponse.json({ error: 'Profile picture not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profilePicUrl
    });

  } catch (error: unknown) {
    console.error('Profile API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
