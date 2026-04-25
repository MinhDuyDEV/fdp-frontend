'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';

const MangaReader = dynamic(() => import('@/components/MangaReader'), {
  loading: () => (
    <div className="reader-loading">
      <div className="skeleton skeleton-reader-page" />
    </div>
  ),
});

import {
  useBackendChapter,
  useBackendChapters,
  useBackendProgress,
  useBackendReadingMode,
  useBackendStory,
} from '@/hooks';
import { apiClient } from '@/lib/api';
import { addChaptersToManga, storyToManga } from '@/lib/data';

function parseQueryNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function ReadPage({ params }: { params: { id: string } }) {
  const storyId = Number(params.id);
  if (Number.isNaN(storyId)) notFound();

  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { story } = useBackendStory(storyId);
  const {
    chapters,
    isLoading: chaptersLoading,
    error: chaptersError,
  } = useBackendChapters(storyId);
  const { progress, save } = useBackendProgress(storyId);
  const { mode, setMode } = useBackendReadingMode(storyId);
  const chapterIdParam = parseQueryNumber(searchParams.get('chapterId'));
  const legacyChapterIndex = parseQueryNumber(searchParams.get('chapter'));

  const legacyChapterId = useMemo(() => {
    if (legacyChapterIndex == null || chapters.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(legacyChapterIndex, chapters.length - 1));
    return chapters[safeIndex]?.id ?? null;
  }, [legacyChapterIndex, chapters]);

  const waitingForLegacyChapter =
    chapterIdParam == null && legacyChapterIndex != null && chapters.length === 0;

  const resolvedChapterId = useMemo(() => {
    if (waitingForLegacyChapter) return null;
    return chapterIdParam ?? legacyChapterId ?? progress?.chapterId ?? chapters[0]?.id ?? null;
  }, [chapterIdParam, legacyChapterId, progress?.chapterId, chapters, waitingForLegacyChapter]);

  const {
    chapter: activeChapter,
    isLoading: activeChapterLoading,
    error: activeChapterError,
  } = useBackendChapter(resolvedChapterId);

  const manga = useMemo(() => {
    if (!story) return null;
    const base = storyToManga(story);
    return addChaptersToManga(base, chapters);
  }, [story, chapters]);

  const initialChapterIndex = useMemo(() => {
    if (resolvedChapterId == null) return 0;
    const chapterIndex = chapters.findIndex((chapter) => chapter.id === resolvedChapterId);
    return chapterIndex >= 0 ? chapterIndex : 0;
  }, [chapters, resolvedChapterId]);

  const initialCursor = progress?.chapterId === resolvedChapterId ? progress.scrollPosition : 0;

  const handleChapterChange = useCallback(
    (nextChapterId: number) => {
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.delete('chapter');
      nextParams.set('chapterId', String(nextChapterId));
      router.replace(`/manga/${storyId}/read?${nextParams.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParamsString, storyId]
  );

  useEffect(() => {
    if (legacyChapterIndex == null || chapterIdParam != null || legacyChapterId == null) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.delete('chapter');
    nextParams.set('chapterId', String(legacyChapterId));
    router.replace(`/manga/${storyId}/read?${nextParams.toString()}`, {
      scroll: false,
    });
  }, [chapterIdParam, legacyChapterId, legacyChapterIndex, router, searchParamsString, storyId]);

  // Increment view count once per page visit
  const viewCountedRef = useRef(false);
  useEffect(() => {
    if (viewCountedRef.current) return;
    viewCountedRef.current = true;
    apiClient.incrementViewCount(storyId).catch(() => {});
  }, [storyId]);

  if (!manga) return null;

  const showReaderLoading =
    chaptersLoading ||
    waitingForLegacyChapter ||
    (resolvedChapterId != null &&
      (activeChapterLoading || (!activeChapter && !activeChapterError)));
  const chapterLoadError = chaptersError ?? activeChapterError;
  const hasNoReadableChapter = !chaptersLoading && chapters.length === 0;

  return (
    <>
      {/* Slim reader header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 120,
          background: 'var(--paper)',
          borderBottom: '3px solid var(--ink)',
          display: 'flex',
          alignItems: 'stretch',
          height: 40,
          boxSizing: 'border-box',
        }}
      >
        <Link
          href={`/manga/${manga.id}`}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--ink)',
            textDecoration: 'none',
            borderRight: '1px solid var(--aged)',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s',
          }}
        >
          ← {manga.title}
        </Link>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.68rem',
            color: 'var(--smoke)',
          }}
        >
          {activeChapter
            ? `${manga.title} — Ch.${activeChapter.chapterNumber}`
            : `${manga.title} — chọn chương bên dưới`}
        </div>
      </header>
      <div aria-hidden="true" style={{ height: 40 }} />

      {showReaderLoading ? (
        <main
          style={{
            padding: '32px 20px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.72rem',
            color: 'var(--smoke)',
          }}
        >
          Đang tải nội dung chương…
        </main>
      ) : chapterLoadError ? (
        <main
          style={{
            padding: '32px 20px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.72rem',
            color: 'var(--rust)',
          }}
        >
          Không tải được chương hiện tại: {chapterLoadError}
        </main>
      ) : hasNoReadableChapter ? (
        <main
          style={{
            padding: '32px 20px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.72rem',
            color: 'var(--smoke)',
          }}
        >
          Truyện này chưa có chương để đọc.
        </main>
      ) : activeChapter ? (
        <MangaReader
          manga={manga}
          navigationChapters={manga.chapters}
          activeChapter={activeChapter}
          activeChapterId={resolvedChapterId}
          initialChapterId={resolvedChapterId}
          initialChapterIndex={initialChapterIndex}
          initialCursor={initialCursor}
          backendProgress={progress}
          backendMode={mode}
          onSaveProgress={save}
          onModeChange={setMode}
          onChapterChange={handleChapterChange}
        />
      ) : null}
    </>
  );
}
