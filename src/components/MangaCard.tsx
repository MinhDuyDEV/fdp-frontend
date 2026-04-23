'use client';
import { useRouter } from 'next/navigation';
import MangaCover from './MangaCover';
import { useProgress } from '@/hooks';
import { MangaFactory } from '@/lib/data';
import type { Manga } from '@/types';

export default function MangaCard({ manga, index }: { manga: Manga; index: number }) {
  const router = useRouter();
  const { progress } = useProgress(manga.id);
  const accent = MangaFactory.getAccent(manga.genre);

  return (
    <button
      type="button"
      className={`manga-card-button animate-in animate-in-delay-${Math.min(index + 1, 4)}`}
      onClick={() => router.push(`/manga/${manga.id}`)}
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--aged)',
        cursor: 'pointer',
        transition: 'background 0.15s',
        overflow: 'hidden',
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cream)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
      onFocus={(e) => (e.currentTarget.style.background = 'var(--cream)')}
      onBlur={(e) => (e.currentTarget.style.background = '')}
      aria-label={`Đọc ${manga.title}`}
    >
      {/* Cover */}
      <div
        style={{
          width: 90,
          minHeight: 120,
          flexShrink: 0,
          borderRight: '1px solid var(--aged)',
          position: 'relative',
        }}
      >
        <MangaCover manga={manga} sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 200px" />
      </div>

      {/* Info */}
      <div
        style={{
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 0,
        }}
      >
        <span
          className="genre-chip"
          style={{
            color: accent,
            borderColor: accent,
            alignSelf: 'flex-start',
          }}
        >
          {manga.genre}
        </span>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '0.98rem',
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {manga.title}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--smoke)',
            fontStyle: 'italic',
          }}
        >
          — {manga.author}
        </div>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.62rem',
            color: 'var(--smoke)',
            marginTop: 'auto',
          }}
        >
          {manga.chapters.length} chương · {manga.views}
        </div>
        {progress && (
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6rem',
              color: 'var(--rust)',
            }}
          >
            ▶ Ch.{progress.chapterIndex + 1} · trang {progress.pageIndex + 1}/{progress.totalPages}
          </div>
        )}
      </div>
    </button>
  );
}
