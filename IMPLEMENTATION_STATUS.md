# Implementation status

## Working in the included MVP

- No-auth editor opens directly.
- Desktop 3-zone layout.
- Bulk vocabulary parser.
- Hard 21-items-per-page pagination and global numbering.
- Figma-exact 900×1450 header, footer, permanent artwork assets, and 3×7 grid.
- Page navigation and word selection.
- Inline project/header settings.
- Vocabulary word/search-hint editing.
- Local autosave/restore.
- Openverse server search adapter and automatic image resolution queue.
- Image picker + manual upload.
- EN/AR UI direction switch independent of poster direction.
- Exact Template / True A4 profile control.
- Canonical shared preview/export renderer with PDF, PNG, JPEG, and SVG output.
- PNG/JPEG 1×, 2×, and 3× output plus ZIP packaging for multiple raster/SVG pages.
- One-file multi-page PDF export, font/image readiness checks, and full-resolution image fallback.
- Standalone no-install HTML demo for quick review.

## Production work still required for full spec parity

- Fully vector-native PDF text/card output (the current PDF path uses a sharp 2× page render for reliable browser parity).
- True A4 reflow/physical-size output implementation.
- Pexels, Unsplash and Pixabay adapters with production credentials and policy review.
- Semantic sense detection, ambiguity clustering and stronger ranking.
- Watermark/text-overlay detection and effective PPI preflight.
- Visual-consistency embeddings/anchor scoring.
- Full history-based undo/redo.
- dnd-kit reorder interactions.
- Dexie/IndexedDB asset persistence and project import/export JSON.
- Advanced crop/focal-point editor.
- Accessibility and large-project stress QA.
