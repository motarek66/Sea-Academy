# Vocabulary Poster Studio

Implementation-ready MVP based on the supplied product specification.

## Included

- Desktop-first 3-zone editor (pages/words, poster canvas, contextual inspector)
- Exact 900×1450 poster template with 3×7 / 21-item pagination
- Global numbering across pages
- Bulk vocabulary parsing (`word`, comma/tab-separated, numbered lists, `word | meaning`)
- Progressive per-item image search with a concurrency cap
- Openverse, Unsplash, and Pixabay provider adapters through a server route
- Image picker with source metadata and manual upload
- Word editing, image replacement, delete/reflow
- English/Arabic UI direction switch independent of poster direction
- Local autosave and restore with browser storage
- Explicit Exact Template / True A4 profile selector
- Export-preflight UI and a separate vector page-source export handoff

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Image search providers

Openverse works out of the box with no key. Unsplash and Pixabay are optional — add their keys to unlock more results in the picker:

1. Copy `.env.example` to `.env.local`.
2. Get a free Unsplash key at https://unsplash.com/oauth/applications and set `UNSPLASH_ACCESS_KEY`.
3. Get a free Pixabay key at https://pixabay.com/api/docs/ and set `PIXABAY_API_KEY`.
4. Restart `npm run dev`.

Any provider missing a key is skipped silently; results from the remaining providers are still returned.

On Vercel, add the same two variables under Project Settings → Environment Variables.

## Production integrations still to connect

The spec requires a deterministic server export renderer (PDF/PNG/JPEG) and stronger provider ranking/compliance. The UI and document model are separated so these can be added without using the visible editor as the export surface.

Recommended next additions:

1. Playwright/Chromium PDF route with true A4 physical sizing.
2. Sharp-based 1x/2x/3x PNG/JPEG routes and ZIP for all pages.
3. Pexels adapter for further variety.
4. Semantic ambiguity and visual-consistency ranking.
5. IndexedDB/Dexie persistence for large local projects and uploaded assets.
6. Full undo/redo history store and drag reordering via dnd-kit.

## Architecture

- `src/components/Studio.tsx` — editor shell, project state, poster renderer, picker/export UI
- `src/app/api/images/search/route.ts` — normalized Openverse/Unsplash/Pixabay search adapter
- `src/app/api/images/resolve/route.ts` — auto-selection endpoint
- `src/lib/types.ts` — typed project/vocabulary/image model
- `src/lib/parser.ts` — bulk vocabulary parsing + 21-item pagination
