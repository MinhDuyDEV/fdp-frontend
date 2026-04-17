# MangaKo

Manga reading web app — Design Pattern demo (Factory, Singleton, Observer, Strategy).

## Stack

Next.js 14.2.5 · React 18 · TypeScript (strict) · npm

## Structure

```
src/
├── app/                    # App Router pages + API routes
│   ├── page.tsx            # Home — genre-filtered manga grid
│   ├── manga/[id]/         # Detail + Reader pages
│   └── api/mangadex/       # Proxy to MangaDex API (cached 5min)
├── components/             # UI components (Header, MangaReader, Sidebar…)
├── hooks/index.ts          # useProgress, useBookmark, useComments, useTheme
├── lib/
│   ├── data.ts             # Factory Pattern — MangaFactory.create(genre)
│   ├── progressManager.ts  # Singleton + Observer — EventBus, ReadProgressManager
│   └── readStrategy.ts     # Strategy Pattern — scroll/flip/horizontal modes
└── types/index.ts          # Manga, Genre, ReadProgress, UserComment
```

## Design Patterns

| Pattern   | Location                  | Key class/function                     |
| --------- | ------------------------- | -------------------------------------- |
| Factory   | `src/lib/data.ts`         | `MangaFactory.create(genre)`           |
| Singleton | `src/lib/progressManager` | `ReadProgressManager.getInstance()`    |
| Observer  | `src/lib/progressManager` | `EventBus.subscribe()` / `.emit()`     |
| Strategy  | `src/lib/readStrategy.ts` | `ReadStrategy` interface, 3 read modes |

## Code Example — Factory Pattern

```ts
// src/lib/data.ts
export class MangaFactory {
  static create(genre: Genre): BaseManga {
    switch (genre) {
      case "Hành động":
        return new ActionMangaType();
      case "Kinh dị":
        return new HorrorMangaType();
      // …
    }
  }
}
```

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (next build)
npm run start        # Serve production build
npm run lint         # ESLint (next lint)
```

## Boundaries

**Always:** Use `@/*` path alias for imports. Keep patterns in their designated files.
**Ask first:** Adding new design patterns, changing data persistence strategy.
**Never:** Commit node_modules/. Modify .next/ directly. Hardcode MangaDex URLs outside config.

## Gotchas

- Build currently fails: duplicate property in `Header.tsx:110` (fontWeight declared twice)
- ESLint not yet configured (first `npm run lint` prompts for setup)
- Manga page images use placeholder (picsum.photos) — cover images from MangaDex CDN
- All user data (progress, bookmarks, comments) stored in `localStorage`
