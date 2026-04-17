# MangaKo

Manga reading web app — Design Pattern demo (Factory, Singleton, Observer, Strategy).

## Stack

Next.js 14.2.5 · React 18 · TypeScript 5 (strict) · npm · clsx

## Structure

```
src/
├── app/                    # App Router pages + API routes
│   ├── page.tsx            # Home — genre-filtered manga grid
│   ├── manga/[id]/         # Detail + Reader pages
│   └── api/mangadex/       # Proxy to MangaDex API (cached 5min)
├── components/             # Header, Sidebar, MangaReader, MangaCard, MangaCover, FeaturedManga
├── hooks/index.ts          # useProgress, useBookmark, useComments, useTheme
├── lib/
│   ├── data.ts             # Factory — MangaFactory.create(genre)
│   ├── progressManager.ts  # Singleton + Observer — EventBus, ReadProgressManager
│   └── readStrategy.ts     # Strategy — scroll/flip/horizontal read modes
└── types/index.ts          # Manga, Genre, ReadProgress, UserComment
```

## Design Patterns

| Pattern   | File                      | Entry point                            |
| --------- | ------------------------- | -------------------------------------- |
| Factory   | `src/lib/data.ts`         | `MangaFactory.create(genre)`           |
| Singleton | `src/lib/progressManager` | `ReadProgressManager.getInstance()`    |
| Observer  | `src/lib/progressManager` | `EventBus.subscribe()` / `.emit()`     |
| Strategy  | `src/lib/readStrategy.ts` | `ReadStrategy` interface, 3 read modes |

## Code Example — Singleton + Observer

```ts
// src/lib/progressManager.ts:13-22
class EventBus {
  private observers: Observer[] = []
  subscribe(fn: Observer) { this.observers.push(fn); return () => { ... } }
  emit(event: ProgressEvent) { this.observers.forEach(fn => fn(event)) }
}
export const eventBus = new EventBus()
```

## Commands

```bash
npm run dev          # Dev server (localhost:3000) ✓
npm run build        # Production build ✓
npm run start        # Serve production build
npm run lint         # ESLint — first run prompts for setup
```

## Boundaries

**Always:** Use `@/*` path alias. Keep patterns in their designated files.
**Ask first:** Adding new design patterns, changing data persistence strategy.
**Never:** Commit node_modules/. Modify .next/ directly. Hardcode MangaDex URLs outside config.

## Gotchas

- ESLint not yet configured (first `npm run lint` prompts for setup)
- Manga page images use placeholder (picsum.photos) — covers from MangaDex CDN
- All user data (progress, bookmarks, comments) stored in `localStorage`
- `next.config.js` allows images from `uploads.mangadex.org` only
