import type { BackendReadMode as ReadMode } from '@/types/api';
import type { Chapter, Genre, Manga, UserComment } from '@/types';
import type {
  Chapter as BackendChapter,
  Comment as BackendComment,
  BackendGenre,
  Story,
} from '@/types/api';

// ─── GENRE MAPPING ───────────────────────────────────────────────────────────

const genreToDisplayMap: Record<BackendGenre, Genre> = {
  Action: 'Hành động',
  Horror: 'Kinh dị',
  Romance: 'Lãng mạn',
  Detective: 'Trinh thám',
};

export const genreReverseMap: Record<Genre, BackendGenre> = {
  'Hành động': 'Action',
  'Kinh dị': 'Horror',
  'Lãng mạn': 'Romance',
  'Trinh thám': 'Detective',
};

export function storyToManga(story: Story): Manga {
  return {
    id: String(story.id),
    title: story.title,
    titleJP: '',
    genre: genreToDisplayMap[story.genre],
    author: story.author,
    coverUrl: story.coverImage || '',
    coverFallback: '#1a1a1a',
    rating: 0,
    views: String(story.viewCount ?? 0),
    synopsis: story.description,
    tags: [genreToDisplayMap[story.genre]],
    chapters: [],
    status: 'Đang tiến hành',
    year: new Date(story.createdAt).getFullYear(),
  };
}

// Adapt backend Chapter → frontend Chapter shape
function countContentBlocks(content?: string): number {
  if (!content) return 1;
  const blocks = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return blocks.length || 1;
}

export function chapterToMangaChapter(ch: BackendChapter): Chapter {
  return {
    id: String(ch.id),
    number: ch.chapterNumber,
    title: ch.title || `Chương ${ch.chapterNumber}`,
    date: new Date(ch.createdAt).toLocaleDateString('vi-VN'),
    pages: countContentBlocks(ch.content),
  };
}

// Adapt backend Comment → frontend UserComment shape (idempotent)
export function commentToUserComment(c: BackendComment): UserComment {
  return {
    id: String(c.id),
    mangaId: String(c.storyId),
    user: c.user?.name ?? `User #${c.userId}`,
    userId: c.userId,
    text: c.content,
    createdAt: new Date(c.createdAt).getTime(),
  };
}

// Add chapters to a Manga object from a Story
export function addChaptersToManga(manga: Manga, backendChapters: BackendChapter[]): Manga {
  return {
    ...manga,
    chapters: backendChapters.map(chapterToMangaChapter),
  };
}

// Each genre subclass extends BaseManga with genre-specific metadata AND behavior.
// The Factory creates the correct subclass based on genre, enabling polymorphism.

abstract class BaseManga {
  abstract genre: Genre;
  abstract accentColor: string; // used for UI theming per genre
  abstract labelEN: string;

  // ── Behavioral methods — each genre implements differently ──

  /** Recommended reading mode for this genre */
  abstract getRecommendedReadMode(): ReadMode;

  /** Content warning text, or null if none needed */
  abstract getContentWarning(): string | null;

  /** Icon/emoji representing the genre */
  abstract getGenreIcon(): string;
}

class ActionMangaType extends BaseManga {
  genre: Genre = 'Hành động';
  accentColor = '#c0392b';
  labelEN = 'ACTION';

  getRecommendedReadMode(): ReadMode {
    return 'scroll';
  }
  getContentWarning(): string | null {
    return 'Chứa cảnh bạo lực';
  }
  getGenreIcon(): string {
    return '⚔️';
  }
}

class HorrorMangaType extends BaseManga {
  genre: Genre = 'Kinh dị';
  accentColor = '#2c3e50';
  labelEN = 'HORROR';

  getRecommendedReadMode(): ReadMode {
    return 'night';
  }
  getContentWarning(): string | null {
    return 'Nội dung kinh dị — không phù hợp trẻ em';
  }
  getGenreIcon(): string {
    return '👻';
  }
}

class RomanceMangaType extends BaseManga {
  genre: Genre = 'Lãng mạn';
  accentColor = '#8e4585';
  labelEN = 'ROMANCE';

  getRecommendedReadMode(): ReadMode {
    return 'day';
  }
  getContentWarning(): string | null {
    return null;
  }
  getGenreIcon(): string {
    return '💕';
  }
}

class MysteryMangaType extends BaseManga {
  genre: Genre = 'Trinh thám';
  accentColor = '#1a5276';
  labelEN = 'MYSTERY';

  getRecommendedReadMode(): ReadMode {
    return 'page-flip';
  }
  getContentWarning(): string | null {
    return null;
  }
  getGenreIcon(): string {
    return '🔍';
  }
}

export class MangaFactory {
  static create(genre: Genre): BaseManga {
    switch (genre as string) {
      case 'Hành động':
        return new ActionMangaType();
      case 'Kinh dị':
        return new HorrorMangaType();
      case 'Lãng mạn':
        return new RomanceMangaType();
      case 'Trinh thám':
        return new MysteryMangaType();
    }
    // Fallback for runtime safety — should never hit with TypeScript
    return new ActionMangaType();
  }

  static createFromBackend(genre: BackendGenre): BaseManga {
    return MangaFactory.create(genreToDisplayMap[genre]);
  }

  // ── Data helpers (backward compatible) ──

  static getAccent(genre: Genre | BackendGenre): string {
    if (genreToDisplayMap[genre as BackendGenre]) {
      return MangaFactory.createFromBackend(genre as BackendGenre).accentColor;
    }
    return MangaFactory.create(genre as Genre).accentColor;
  }

  static getLabelEN(genre: Genre | BackendGenre): string {
    if (genreToDisplayMap[genre as BackendGenre]) {
      return MangaFactory.createFromBackend(genre as BackendGenre).labelEN;
    }
    return MangaFactory.create(genre as Genre).labelEN;
  }

  // ── Behavioral helpers ──

  static getRecommendedReadMode(genre: Genre | BackendGenre): ReadMode {
    if (genreToDisplayMap[genre as BackendGenre]) {
      return MangaFactory.createFromBackend(genre as BackendGenre).getRecommendedReadMode();
    }
    return MangaFactory.create(genre as Genre).getRecommendedReadMode();
  }

  static getContentWarning(genre: Genre | BackendGenre): string | null {
    if (genreToDisplayMap[genre as BackendGenre]) {
      return MangaFactory.createFromBackend(genre as BackendGenre).getContentWarning();
    }
    return MangaFactory.create(genre as Genre).getContentWarning();
  }

  static getGenreIcon(genre: Genre | BackendGenre): string {
    if (genreToDisplayMap[genre as BackendGenre]) {
      return MangaFactory.createFromBackend(genre as BackendGenre).getGenreIcon();
    }
    return MangaFactory.create(genre as Genre).getGenreIcon();
  }

  static getDisplayGenre(genre: BackendGenre): Genre {
    return genreToDisplayMap[genre];
  }
}
