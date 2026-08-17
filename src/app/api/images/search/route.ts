import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const word = String(body.word || '').trim();
  const sense = String(body.sense || '').trim();
  const query = [word, sense].filter(Boolean).join(' ');
  if (!query) return NextResponse.json({ query, results: [] });

  try {
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', query);
    url.searchParams.set('page_size', '20');
    url.searchParams.set('mature', 'false');
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`Openverse ${response.status}`);
    const data = await response.json();
    const results = (data.results || []).map((item: any) => ({
      id: item.id,
      provider: 'openverse',
      previewUrl: item.thumbnail || item.url,
      fullUrl: item.url,
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      author: item.creator || undefined,
      sourcePageUrl: item.foreign_landing_url || undefined,
      licenseName: item.license || undefined,
      title: item.title || undefined
    })).filter((item: any) => item.previewUrl);
    return NextResponse.json({ query, ambiguous: false, results });
  } catch {
    return NextResponse.json({ query, ambiguous: false, results: [], error: 'IMAGE_PROVIDER_UNAVAILABLE' }, { status: 200 });
  }
}
