'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStrategy, strategies } from '@/lib/readStrategy';
import type { Manga } from '@/types';
import type { Chapter as BackendChapter, BackendReadMode, ReadingProgress } from '@/types/api';

interface Props {
  manga: Manga;
  navigationChapters?: Manga['chapters'];
  activeChapter?: BackendChapter | null;
  activeChapterId?: number | null;
  initialChapterId?: number | null;
  initialChapterIndex?: number;
  initialCursor?: number;
  backendChapters?: BackendChapter[];
  backendProgress?: ReadingProgress | null;
  backendMode?: BackendReadMode;
  onSaveProgress?: (
    chapterId: number,
    scrollPosition: number,
    readingMode: BackendReadMode
  ) => Promise<void> | void;
  onModeChange?: (readingMode: BackendReadMode) => Promise<void> | void;
  onChapterChange?: (chapterId: number) => void;
}

type SaveSnapshot = {
  chapterId: number;
  scrollPosition: number;
  readingMode: BackendReadMode;
};

type ReaderThemeMode = 'day' | 'night';
type ReaderLayoutMode = 'scroll' | 'page-flip';

function splitChapterContent(content?: string): string[] {
  if (!content) return ['Chương này chưa có nội dung.'];
  const blocks = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return blocks.length ? blocks : [content.trim() || 'Chương này chưa có nội dung.'];
}

function clampCursor(cursor: number, total: number): number {
  if (!Number.isFinite(cursor) || total <= 1) return 0;
  return Math.max(0, Math.min(Math.round(cursor), total - 1));
}

function parseChapterId(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeSnapshot(snapshot: SaveSnapshot | null): string | null {
  if (!snapshot) return null;
  return `${snapshot.chapterId}:${snapshot.scrollPosition}:${snapshot.readingMode}`;
}

function getReaderPreferenceKey(mangaId: string): string {
  return `mk_reader_pref_${mangaId}`;
}

function getReaderProgressKey(mangaId: string): string {
  return `mk_reader_progress_${mangaId}`;
}

function deriveThemeMode(mode?: BackendReadMode | null): ReaderThemeMode {
  return mode === 'night' ? 'night' : 'day';
}

function deriveLayoutMode(mode?: BackendReadMode | null): ReaderLayoutMode {
  return mode === 'page-flip' ? 'page-flip' : 'scroll';
}

function toBackendReadMode(
  themeMode: ReaderThemeMode,
  layoutMode: ReaderLayoutMode
): BackendReadMode {
  return layoutMode === 'page-flip' ? 'page-flip' : themeMode;
}

function readStoredPreference(
  mangaId: string,
  fallbackMode?: BackendReadMode | null
): { themeMode: ReaderThemeMode; layoutMode: ReaderLayoutMode; hasStoredPreference: boolean } {
  if (typeof window === 'undefined') {
    return {
      themeMode: deriveThemeMode(fallbackMode),
      layoutMode: deriveLayoutMode(fallbackMode),
      hasStoredPreference: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(getReaderPreferenceKey(mangaId));
    if (!raw) {
      return {
        themeMode: deriveThemeMode(fallbackMode),
        layoutMode: deriveLayoutMode(fallbackMode),
        hasStoredPreference: false,
      };
    }

    const parsed = JSON.parse(raw) as Partial<{
      themeMode: ReaderThemeMode;
      layoutMode: ReaderLayoutMode;
    }>;
    return {
      themeMode: parsed.themeMode === 'night' ? 'night' : 'day',
      layoutMode: parsed.layoutMode === 'page-flip' ? 'page-flip' : 'scroll',
      hasStoredPreference: true,
    };
  } catch {
    return {
      themeMode: deriveThemeMode(fallbackMode),
      layoutMode: deriveLayoutMode(fallbackMode),
      hasStoredPreference: false,
    };
  }
}

function writeStoredPreference(
  mangaId: string,
  themeMode: ReaderThemeMode,
  layoutMode: ReaderLayoutMode
) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    getReaderPreferenceKey(mangaId),
    JSON.stringify({ themeMode, layoutMode })
  );
}

function readStoredProgress(mangaId: string): SaveSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getReaderProgressKey(mangaId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SaveSnapshot>;
    if (
      typeof parsed.chapterId !== 'number' ||
      typeof parsed.scrollPosition !== 'number' ||
      !Number.isFinite(parsed.chapterId) ||
      !Number.isFinite(parsed.scrollPosition)
    ) {
      return null;
    }

    return {
      chapterId: parsed.chapterId,
      scrollPosition: parsed.scrollPosition,
      readingMode: parsed.readingMode ?? 'scroll',
    };
  } catch {
    return null;
  }
}

function writeStoredProgress(mangaId: string, snapshot: SaveSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getReaderProgressKey(mangaId), JSON.stringify(snapshot));
}

function LoadingSkeleton({ background }: { background: string }) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 12px' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
      {[90, 120, 100, 130].map((height, index) => (
        <div
          key={index}
          style={{
            marginBottom: 8,
            background,
            height,
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function MangaReader({
  manga,
  navigationChapters,
  activeChapter,
  activeChapterId,
  initialChapterId,
  initialChapterIndex = 0,
  initialCursor = 0,
  backendChapters = [],
  backendProgress,
  backendMode,
  onSaveProgress,
  onModeChange,
  onChapterChange,
}: Props) {
  const chapterSummaries = navigationChapters ?? manga.chapters;
  const initialSummary =
    chapterSummaries[
      Math.max(0, Math.min(initialChapterIndex, Math.max(chapterSummaries.length - 1, 0)))
    ];
  const inferredInitialChapterId =
    activeChapter?.id ??
    activeChapterId ??
    initialChapterId ??
    backendProgress?.chapterId ??
    parseChapterId(initialSummary?.id) ??
    backendChapters[initialChapterIndex]?.id ??
    backendChapters[0]?.id ??
    null;

  const userNavigatedChapterRef = useRef(false);
  const userInteractedRef = useRef(false);
  const lastLoadedChapterRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastPersistedKeyRef = useRef<string | null>(null);
  const lastRestoredProgressKeyRef = useRef<string | null>(null);
  const latestSnapshotRef = useRef<SaveSnapshot | null>(null);
  const hasStoredPreferenceRef = useRef(false);
  const initialPreference = useMemo(() => {
    const preference = readStoredPreference(manga.id, backendMode ?? backendProgress?.readingMode);
    hasStoredPreferenceRef.current = preference.hasStoredPreference;
    return preference;
  }, [backendMode, backendProgress?.readingMode, manga.id]);

  const [localChapterId, setLocalChapterId] = useState<number | null>(inferredInitialChapterId);
  const [cursor, setCursor] = useState(0);
  const [themeMode, setThemeMode] = useState<ReaderThemeMode>(initialPreference.themeMode);
  const [layoutMode, setLayoutMode] = useState<ReaderLayoutMode>(initialPreference.layoutMode);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChapterId != null) {
      setLocalChapterId(activeChapterId);
      return;
    }
    if (activeChapter?.id != null) {
      setLocalChapterId(activeChapter.id);
      return;
    }
    if (!userNavigatedChapterRef.current && inferredInitialChapterId != null) {
      setLocalChapterId(inferredInitialChapterId);
    }
  }, [activeChapter?.id, activeChapterId, inferredInitialChapterId]);

  useEffect(() => {
    if (hasStoredPreferenceRef.current || userInteractedRef.current) return;
    const sourceMode = backendMode ?? backendProgress?.readingMode;
    if (!sourceMode) return;
    setThemeMode(deriveThemeMode(sourceMode));
    setLayoutMode(deriveLayoutMode(sourceMode));
  }, [backendMode, backendProgress?.readingMode]);

  const resolvedChapterId = localChapterId ?? activeChapterId ?? activeChapter?.id;

  const currentSummaryIndex = useMemo(() => {
    if (resolvedChapterId != null) {
      const matchedIndex = chapterSummaries.findIndex(
        (chapter) => parseChapterId(chapter.id) === resolvedChapterId
      );
      if (matchedIndex >= 0) return matchedIndex;
    }
    return Math.max(0, Math.min(initialChapterIndex, Math.max(chapterSummaries.length - 1, 0)));
  }, [chapterSummaries, initialChapterIndex, resolvedChapterId]);

  const currentSummary = chapterSummaries[currentSummaryIndex] ?? null;
  const previousSummary = chapterSummaries[currentSummaryIndex - 1] ?? null;
  const nextSummary = chapterSummaries[currentSummaryIndex + 1] ?? null;

  const currentBackendChapter = useMemo(() => {
    if (activeChapter && activeChapter.id === resolvedChapterId) {
      return activeChapter;
    }
    return null;
  }, [activeChapter, resolvedChapterId]);

  const blocks = useMemo(
    () => splitChapterContent(currentBackendChapter?.content),
    [currentBackendChapter?.content]
  );

  const totalBlocks = blocks.length;
  const safeCursor = clampCursor(cursor, totalBlocks);
  const strategy = getStrategy(layoutMode);
  const theme = strategies[themeMode].getReaderTheme();
  const persistedReadMode = toBackendReadMode(themeMode, layoutMode);

  const persistSnapshot = useCallback(
    (snapshot: SaveSnapshot | null) => {
      if (!snapshot) return;
      writeStoredProgress(manga.id, snapshot);
      if (!onSaveProgress) return;

      const snapshotKey = serializeSnapshot(snapshot);
      if (snapshotKey && snapshotKey === lastPersistedKeyRef.current) return;
      lastPersistedKeyRef.current = snapshotKey;
      Promise.resolve(
        onSaveProgress(snapshot.chapterId, snapshot.scrollPosition, snapshot.readingMode)
      ).catch(() => {
        if (lastPersistedKeyRef.current === snapshotKey) {
          lastPersistedKeyRef.current = null;
        }
      });
    },
    [manga.id, onSaveProgress]
  );

  const flushProgress = useCallback(
    (options?: { requireInteraction?: boolean; snapshot?: SaveSnapshot | null }) => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (options?.requireInteraction !== false && !userInteractedRef.current) {
        return;
      }
      persistSnapshot(options?.snapshot ?? latestSnapshotRef.current);
    },
    [persistSnapshot]
  );

  const scrollCursorIntoView = useCallback(
    (targetCursor: number) => {
      if (strategy.getScrollDirection() !== 'vertical') return;
      window.requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const children = Array.from(container.children) as HTMLElement[];
        const target = children[targetCursor];
        if (!target) return;
        target.scrollIntoView({ behavior: 'auto', block: 'center' });
      });
    },
    [strategy]
  );

  useEffect(() => {
    if (!currentBackendChapter) {
      lastLoadedChapterRef.current = null;
      return;
    }

    const chapterChanged = lastLoadedChapterRef.current !== currentBackendChapter.id;
    const localProgress = readStoredProgress(manga.id);
    const restoredSnapshot =
      localProgress && localProgress.chapterId === currentBackendChapter.id
        ? {
            chapterId: currentBackendChapter.id,
            scrollPosition: clampCursor(localProgress.scrollPosition, totalBlocks),
            readingMode: localProgress.readingMode,
          }
        : backendProgress && backendProgress.chapterId === currentBackendChapter.id
          ? {
              chapterId: currentBackendChapter.id,
              scrollPosition: clampCursor(backendProgress.scrollPosition, totalBlocks),
              readingMode: backendProgress.readingMode,
            }
          : null;
    const restoredKey = serializeSnapshot(restoredSnapshot);
    const progressChanged = restoredKey !== lastRestoredProgressKeyRef.current;

    lastPersistedKeyRef.current = restoredKey;
    if (!chapterChanged && userInteractedRef.current && !progressChanged) {
      return;
    }

    lastRestoredProgressKeyRef.current = restoredKey;
    lastLoadedChapterRef.current = currentBackendChapter.id;
    userInteractedRef.current = false;
    const nextCursor = restoredSnapshot
      ? restoredSnapshot.scrollPosition
      : clampCursor(initialCursor, totalBlocks);
    setCursor(nextCursor);
    scrollCursorIntoView(nextCursor);
  }, [
    backendProgress,
    currentBackendChapter,
    initialCursor,
    manga.id,
    scrollCursorIntoView,
    totalBlocks,
  ]);

  useEffect(() => {
    latestSnapshotRef.current = currentBackendChapter
      ? {
          chapterId: currentBackendChapter.id,
          scrollPosition: safeCursor,
          readingMode: persistedReadMode,
        }
      : null;
  }, [currentBackendChapter, persistedReadMode, safeCursor]);

  useEffect(() => {
    if (!userInteractedRef.current || !latestSnapshotRef.current) return;
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      persistSnapshot(latestSnapshotRef.current);
    }, 500);
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [currentBackendChapter?.id, persistSnapshot, persistedReadMode, safeCursor]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushProgress({ requireInteraction: false });
      }
    };
    const handlePageHide = () => {
      flushProgress({ requireInteraction: false });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      flushProgress({ requireInteraction: false });
    };
  }, [flushProgress]);

  useEffect(() => {
    if (strategy.getScrollDirection() !== 'vertical') return;
    scrollCursorIntoView(safeCursor);
  }, [currentBackendChapter?.id, layoutMode, safeCursor, scrollCursorIntoView, strategy]);

  const handleScrollTracking = useCallback(() => {
    if (strategy.getScrollDirection() !== 'vertical') return;
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const viewportCenter = window.innerHeight / 2;
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let index = 0; index < children.length; index += 1) {
      const rect = children[index].getBoundingClientRect();
      const blockCenter = rect.top + rect.height / 2;
      const distance = Math.abs(blockCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }

    userInteractedRef.current = true;
    setCursor((previous) => (previous === closestIndex ? previous : closestIndex));
  }, [strategy]);

  useEffect(() => {
    if (strategy.getScrollDirection() !== 'vertical' || totalBlocks === 0) return;
    const options: AddEventListenerOptions = { passive: true };
    window.addEventListener('scroll', handleScrollTracking, options);
    return () => window.removeEventListener('scroll', handleScrollTracking);
  }, [handleScrollTracking, strategy, totalBlocks]);

  const persistModePreference = useCallback(
    (nextThemeMode: ReaderThemeMode, nextLayoutMode: ReaderLayoutMode) => {
      const nextReadMode = toBackendReadMode(nextThemeMode, nextLayoutMode);
      writeStoredPreference(manga.id, nextThemeMode, nextLayoutMode);
      hasStoredPreferenceRef.current = true;
      if (currentBackendChapter) {
        persistSnapshot({
          chapterId: currentBackendChapter.id,
          scrollPosition: safeCursor,
          readingMode: nextReadMode,
        });
      }
      if (onModeChange) {
        Promise.resolve(onModeChange(nextReadMode)).catch(() => undefined);
      }
    },
    [currentBackendChapter, manga.id, onModeChange, persistSnapshot, safeCursor]
  );

  const handleThemeChange = useCallback(
    (nextThemeMode: ReaderThemeMode) => {
      if (nextThemeMode === themeMode) return;
      userInteractedRef.current = true;
      setThemeMode(nextThemeMode);
      persistModePreference(nextThemeMode, layoutMode);
    },
    [layoutMode, persistModePreference, themeMode]
  );

  const handleLayoutChange = useCallback(
    (nextLayoutMode: ReaderLayoutMode) => {
      if (nextLayoutMode === layoutMode) return;
      userInteractedRef.current = true;
      setLayoutMode(nextLayoutMode);
      persistModePreference(themeMode, nextLayoutMode);
    },
    [layoutMode, persistModePreference, themeMode]
  );

  const handleCursorStep = useCallback(
    (nextCursor: number) => {
      userInteractedRef.current = true;
      setCursor(clampCursor(nextCursor, totalBlocks));
    },
    [totalBlocks]
  );

  const navigateToChapter = useCallback(
    (summaryId: number | null) => {
      if (summaryId == null || summaryId === resolvedChapterId) return;
      userInteractedRef.current = true;
      userNavigatedChapterRef.current = true;
      flushProgress({ requireInteraction: false });
      setLocalChapterId(summaryId);
      if (onChapterChange) {
        onChapterChange(summaryId);
        return;
      }
    },
    [flushProgress, onChapterChange, resolvedChapterId]
  );

  const loadingContent = !currentBackendChapter && chapterSummaries.length > 0;
  const progressPercent = totalBlocks > 0 ? Math.round(((safeCursor + 1) / totalBlocks) * 100) : 0;
  const themeModeList: ReaderThemeMode[] = ['day', 'night'];
  const layoutModeList: ReaderLayoutMode[] = ['scroll', 'page-flip'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 40px)',
        paddingTop: 40,
        background: theme.background,
        color: theme.color,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 40,
          borderBottom: `2px solid ${theme.borderColor}`,
          background: theme.pageBackground,
          position: 'fixed',
          top: 40,
          left: 0,
          right: 0,
          zIndex: 110,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <select
          value={resolvedChapterId ?? ''}
          onChange={(event) => navigateToChapter(parseChapterId(event.target.value))}
          aria-label="Chọn chương"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.68rem',
            fontWeight: 600,
            background: theme.pageBackground,
            color: theme.color,
            border: 'none',
            borderRight: `1px solid ${theme.borderColor}`,
            padding: '0 14px',
            height: '100%',
            cursor: 'pointer',
            outline: 'none',
            minWidth: 240,
          }}
        >
          {chapterSummaries.map((chapter) => {
            const chapterId = parseChapterId(chapter.id);
            return (
              <option key={chapter.id} value={chapterId ?? ''}>
                Ch.{chapter.number} — {chapter.title}
              </option>
            );
          })}
        </select>

        <div
          style={{
            flex: 1,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.63rem',
            color: theme.mutedColor,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 3,
              background: theme.borderColor,
            }}
          >
            <div
              style={{
                width: `${loadingContent ? 0 : progressPercent}%`,
                height: '100%',
                background: theme.progressColor,
                transition: 'width 0.25s',
              }}
            />
          </div>
          <span>
            {loadingContent ? 'Đang tải…' : `${safeCursor + 1}/${Math.max(totalBlocks, 1)} đoạn`}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            borderLeft: `1px solid ${theme.borderColor}`,
            height: '100%',
          }}
        >
          {themeModeList.map((mode) => {
            const isActive = themeMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleThemeChange(mode)}
                title={`${strategies[mode].description}; kết hợp được với mọi kiểu đọc`}
                aria-label={`Giao diện đọc: ${strategies[mode].labelVI}`}
                aria-pressed={isActive}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  border: 'none',
                  borderRight: `1px solid ${theme.borderColor}`,
                  background: isActive ? theme.color : 'transparent',
                  color: isActive ? theme.pageBackground : theme.mutedColor,
                  padding: '0 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {strategies[mode].labelVI}
              </button>
            );
          })}
          {layoutModeList.map((mode) => {
            const isActive = layoutMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleLayoutChange(mode)}
                title={`${strategies[mode].description}; giữ nguyên giao diện sáng/tối`}
                aria-label={`Kiểu đọc: ${strategies[mode].labelVI}`}
                aria-pressed={isActive}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  border: 'none',
                  borderRight: `1px solid ${theme.borderColor}`,
                  background: isActive ? theme.color : 'transparent',
                  color: isActive ? theme.pageBackground : theme.mutedColor,
                  padding: '0 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {strategies[mode].labelVI}
              </button>
            );
          })}
        </div>
      </div>

      {loadingContent ? (
        <LoadingSkeleton background={theme.borderColor} />
      ) : (
        <div ref={containerRef} style={strategy.getContainerStyle()}>
          {blocks.map((text, index) => (
            <div
              key={`${currentBackendChapter?.id ?? 'chapter'}-${index}`}
              style={{
                ...strategy.getPageStyle(index, blocks.length),
                border: `1px solid ${theme.borderColor}`,
                background: theme.pageBackground,
                boxShadow:
                  layoutMode === 'page-flip'
                    ? `10px 10px 0 ${theme.borderColor}`
                    : `0 12px 24px ${theme.borderColor}22`,
                display: strategy.isBlockVisible(index, safeCursor) ? undefined : 'none',
              }}
            >
              <div
                style={{
                  ...strategy.getContentStyle(),
                  color: theme.color,
                  textShadow: theme.textShadow,
                }}
              >
                {text}
              </div>
              <span
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.58rem',
                  color: theme.pageBackground,
                  background: theme.color,
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                {index + 1}/{blocks.length}
              </span>
            </div>
          ))}
        </div>
      )}

      {strategy.showNavigation() && !loadingContent && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'center',
            padding: '12px 0',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.72rem',
            color: theme.mutedColor,
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() => handleCursorStep(strategy.prevCursor(safeCursor))}
            disabled={safeCursor === 0}
            aria-label="Đoạn trước"
            style={{
              padding: '7px 18px',
              opacity: safeCursor === 0 ? 0.3 : 1,
              cursor: safeCursor === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Trước
          </button>
          <span>
            Đoạn {safeCursor + 1} / {Math.max(blocks.length, 1)}
          </span>
          <button
            className="btn btn-primary"
            onClick={() => handleCursorStep(strategy.nextCursor(safeCursor, blocks.length))}
            disabled={safeCursor >= blocks.length - 1}
            aria-label="Đoạn sau"
            style={{
              padding: '7px 18px',
              opacity: safeCursor >= blocks.length - 1 ? 0.3 : 1,
              cursor: safeCursor >= blocks.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Sau →
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderTop: `2px solid ${theme.borderColor}`,
          background: theme.pageBackground,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.7rem',
          color: theme.mutedColor,
        }}
      >
        <button
          className="btn"
          onClick={() => navigateToChapter(parseChapterId(previousSummary?.id))}
          disabled={!previousSummary}
          aria-label="Chương trước"
          style={{
            opacity: previousSummary ? 1 : 0.3,
            cursor: previousSummary ? 'pointer' : 'not-allowed',
          }}
        >
          ← Chương trước
        </button>
        <span>
          Chương {currentSummary?.number ?? currentSummaryIndex + 1} / {chapterSummaries.length}
        </span>
        <button
          className="btn btn-primary"
          onClick={() => navigateToChapter(parseChapterId(nextSummary?.id))}
          disabled={!nextSummary}
          aria-label="Chương sau"
          style={{
            opacity: nextSummary ? 1 : 0.3,
            cursor: nextSummary ? 'pointer' : 'not-allowed',
          }}
        >
          Chương sau →
        </button>
      </div>
    </div>
  );
}
