import { NextRequest, NextResponse } from 'next/server';

// MangaDex public API — no auth needed for most endpoints
const BASE = 'https://api.mangadex.org';

// GET /api/mangadex?path=/manga/...
// Proxies any MangaDex API call to avoid CORS
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 });

  try {
    const url = `${BASE}${path}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 300 }, // cache 5 min
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }
}
