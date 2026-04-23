'use client';
import { useState } from 'react';
import FeaturedManga from '@/components/FeaturedManga';
import Header from '@/components/Header';
import MangaCard from '@/components/MangaCard';
import Sidebar from '@/components/Sidebar';
import { useBackendStories } from '@/hooks';
import { genreReverseMap, storyToManga } from '@/lib/data';
import type { Genre } from '@/types';

export default function HomePage() {
  const [activeGenre, setActiveGenre] = useState<Genre | 'all'>('all');

  const backendGenre = activeGenre === 'all' ? undefined : genreReverseMap[activeGenre];
  const { stories, isLoading, error } = useBackendStories(backendGenre);
  // meta is available for future pagination UI
  // const { meta } = useBackendStories(backendGenre);

  const mangaList = stories.map(storyToManga);
  const featured = mangaList[0];
  const rest = mangaList.slice(1);

  return (
    <>
      <Header activeGenre={activeGenre} onGenreChange={setActiveGenre} showGenreNav />

      <main
        className="home-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          minHeight: 'calc(100vh - 73px)',
        }}
      >
        {/* Left — manga list */}
        <div style={{ borderRight: '2px solid var(--ink)' }}>
          {/* Featured */}
          {featured && !isLoading && (
            <>
              <div className="section-rule">Nổi bật hôm nay</div>
              <FeaturedManga manga={featured} />
            </>
          )}

          {/* Grid */}
          <div className="section-rule">Danh sách truyện</div>

          {isLoading && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--smoke)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Đang tải…
            </div>
          )}

          {error && !isLoading && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--rust)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Lỗi: {error}
            </div>
          )}

          {!isLoading && !error && rest.length === 0 && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                color: 'var(--smoke)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Không có truyện nào
            </div>
          )}

          <div
            className="manga-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
            }}
          >
            {rest.map((m, i) => (
              <div
                key={m.id}
                style={{
                  borderRight: i % 2 === 0 ? '1px solid var(--aged)' : 'none',
                }}
              >
                <MangaCard manga={m} index={i} />
              </div>
            ))}
          </div>
        </div>

        {/* Right — sidebar */}
        <Sidebar className="home-sidebar" />
      </main>
    </>
  );
}
