import type { VocabularyItem } from './types';

const arabic = /[\u0600-\u06FF]/;

export function parseVocabulary(input: string): VocabularyItem[] {
  const raw = input
    .split(/\n|\t|,/)
    .map((line) => line.trim().replace(/^\d+[.)\-]\s*/, ''))
    .filter(Boolean);

  return raw.map((line, index) => {
    const [wordRaw, hintRaw] = line.split('|').map((v) => v?.trim());
    const word = wordRaw || `Word ${index + 1}`;
    return {
      id: crypto.randomUUID(),
      order: index + 1,
      word,
      displayWord: word,
      language: arabic.test(word) ? 'ar' : 'en',
      searchHint: hintRaw || undefined,
      status: 'queued',
      manualImageLock: false
    };
  });
}

export function paginate<T>(items: T[], size = 21): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}
