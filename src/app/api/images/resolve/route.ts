import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const base = new URL('/api/images/search', request.url);
  const search = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ word: body.word, sense: body.sense })
  });
  const data = await search.json();
  const selected = data.results?.find((x: any) => x.width >= 600 && x.height >= 400) || data.results?.[0];
  return NextResponse.json({
    status: selected ? 'ready' : 'missing_image',
    confidence: selected ? 0.78 : 0,
    selected: selected || null,
    alternatives: data.results?.slice(1, 8) || []
  });
}
