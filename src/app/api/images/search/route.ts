import { NextResponse } from 'next/server';

type ImageResult = {
  id: string;
  provider: 'openverse' | 'unsplash' | 'pixabay' | 'google';
  previewUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  author?: string;
  sourcePageUrl?: string;
  licenseName?: string;
  title?: string;
};

async function searchOpenverse(query: string): Promise<ImageResult[]> {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', '20');
  url.searchParams.set('mature', 'false');
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Openverse ${response.status}`);
  const data = await response.json();
  return (data.results || [])
    .map((item: any) => ({
      id: `openverse-${item.id}`,
      provider: 'openverse' as const,
      previewUrl: item.thumbnail || item.url,
      fullUrl: item.url,
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      author: item.creator || undefined,
      sourcePageUrl: item.foreign_landing_url || undefined,
      licenseName: item.license || undefined,
      title: item.title || undefined
    }))
    .filter((item: ImageResult) => item.previewUrl);
}

async function searchUnsplash(query: string): Promise<ImageResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '20');
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    next: { revalidate: 3600 }
  });
  if (!response.ok) throw new Error(`Unsplash ${response.status}`);
  const data = await response.json();
  return (data.results || [])
    .map((item: any) => ({
      id: `unsplash-${item.id}`,
      provider: 'unsplash' as const,
      previewUrl: item.urls?.thumb,
      fullUrl: item.urls?.regular || item.urls?.full,
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      author: item.user?.name || undefined,
      sourcePageUrl: item.links?.html || undefined,
      licenseName: 'Unsplash License',
      title: item.alt_description || undefined
    }))
    .filter((item: ImageResult) => item.previewUrl);
}

async function searchPixabay(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];
  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('per_page', '20');
  url.searchParams.set('safesearch', 'true');
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Pixabay ${response.status}`);
  const data = await response.json();
  return (data.hits || [])
    .map((item: any) => ({
      id: `pixabay-${item.id}`,
      provider: 'pixabay' as const,
      previewUrl: item.webformatURL,
      fullUrl: item.largeImageURL || item.webformatURL,
      width: Number(item.imageWidth || 0),
      height: Number(item.imageHeight || 0),
      author: item.user || undefined,
      sourcePageUrl: item.pageURL || undefined,
      licenseName: 'Pixabay License',
      title: item.tags || undefined
    }))
    .filter((item: ImageResult) => item.previewUrl);
}

async function searchGoogle(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;
  if (!apiKey || !cx) return [];
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('num', '10');
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Google ${response.status}`);
  const data = await response.json();
  return (data.items || [])
    .map((item: any) => ({
      id: `google-${item.link}`,
      provider: 'google' as const,
      previewUrl: item.image?.thumbnailLink || item.link,
      fullUrl: item.link,
      width: Number(item.image?.width || 0),
      height: Number(item.image?.height || 0),
      author: undefined,
      sourcePageUrl: item.image?.contextLink || undefined,
      licenseName: undefined,
      title: item.title || undefined
    }))
    .filter((item: ImageResult) => item.previewUrl);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const word = String(body.word || '').trim();
  const sense = String(body.sense || '').trim();
  const query = [word, sense].filter(Boolean).join(' ');
  if (!query) return NextResponse.json({ query, results: [] });

  const settled = await Promise.allSettled([
    searchOpenverse(query),
    searchUnsplash(query),
    searchPixabay(query),
    searchGoogle(query)
  ]);

  const results = settled.flatMap((outcome) => (outcome.status === 'fulfilled' ? outcome.value : []));
  const allFailed = settled.every((outcome) => outcome.status === 'rejected');

  if (allFailed) {
    return NextResponse.json({ query, ambiguous: false, results: [], error: 'IMAGE_PROVIDER_UNAVAILABLE' }, { status: 200 });
  }
  return NextResponse.json({ query, ambiguous: false, results });
}
