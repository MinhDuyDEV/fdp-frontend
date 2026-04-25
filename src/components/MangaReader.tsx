'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getReaderTheme,
  getStrategy,
  layoutStrategies,
  type LayoutMode,
  type ThemeMode,
} from '@/lib/readStrategy';
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

// ─── helpers ─────────────────────────────────────────────────────────────────

function splitChapterContent(content?: string): string[] {
  if (!content) return ['Chương này chưa có nội dung.'];
  const blocks = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return blocks.length ? blocks : [content.trim() || 'Chương này chưa có nội dung.'];
}

function clampCursor(cursor: number, total: number): number {
  if (!Number.isFinite(cursor) || total <= 0) return 0;
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

const LAYOUT_MODES: LayoutMode[] = ['scroll', 'horizontal-scroll', 'page-flip'];

/** Map old backend mode values → layout mode */
function deriveLayoutMode(mode?: BackendReadMode | null): LayoutMode {
  if (mode === 'page-flip') return 'page-flip';
  if (mode === 'horizontal-scroll') return 'horizontal-scroll';
  return 'scroll'; // 'day', 'night', 'scroll' → vertical scroll
}

function deriveThemeMode(mode?: BackendReadMode | null): ThemeMode {
  return mode === 'night' ? 'night' : 'day';
}

/** Layout mode IS the backend read mode now (theme is separate) */
function toBackendReadMode(layoutMode: LayoutMode): BackendReadMode {
  return layoutMode;
}

// ─── localStorage helpers ────────────────────────────────────────────────────

function readStoredPreference(
  mangaId: string,
  fallbackMode?: BackendReadMode | null
): { themeMode: ThemeMode; layoutMode: LayoutMode; hasStoredPreference: boolean } {
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
      themeMode: ThemeMode;
      layoutMode: LayoutMode;
    }>;
    return {
      themeMode: parsed.themeMode === 'night' ? 'night' : 'day',
      layoutMode: deriveLayoutMode(parsed.layoutMode),
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

function writeStoredPreference(mangaId: string, themeMode: ThemeMode, layoutMode: LayoutMode) {
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

// ─── sub-components ──────────────────────────────────────────────────────────

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

/** ☀ / ☾ toggle icon */
function ThemeToggle({
  themeMode,
  onToggle,
  color,
  hoverBg,
}: {
  themeMode: ThemeMode;
  onToggle: () => void;
  color: string;
  hoverBg: string;
}) {
  return (
    <button
      onClick={onToggle}
      title={themeMode === 'day' ? 'Chuyển sang ban đêm' : 'Chuyển sang ban ngày'}
      aria-label={themeMode === 'day' ? 'Chuyển ban đêm' : 'Chuyển ban ngày'}
      style={{
        position: 'fixed',
        top: 90,
        right: 16,
        zIndex: 120,
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        background: hoverBg,
        color,
        fontSize: '1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'all 0.2s',
      }}
    >
      {themeMode === 'day' ? '☾' : '☀'}
    </button>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

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

  // ── refs ──
  const userNavigatedChapterRef = useRef(false);
  const userInteractedRef = useRef(false);
  const lastLoadedChapterRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastPersistedKeyRef = useRef<string | null>(null);
  const lastRestoredProgressKeyRef = useRef<string | null>(null);
  const latestSnapshotRef = useRef<SaveSnapshot | null>(null);
  const hasStoredPreferenceRef = useRef(false);
  const suppressScrollTrackingRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const initialRestoreDoneRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── initial preference (from localStorage or backend) ──
  const initialPreference = useMemo(() => {
    const pref = readStoredPreference(manga.id, backendMode ?? backendProgress?.readingMode);
    hasStoredPreferenceRef.current = pref.hasStoredPreference;
    return pref;
  }, [backendMode, backendProgress?.readingMode, manga.id]);

  // ── state ──
  const [localChapterId, setLocalChapterId] = useState<number | null>(inferredInitialChapterId);
  const [cursor, setCursor] = useState(() => {
    const stored = readStoredProgress(manga.id);
    if (stored && stored.chapterId === inferredInitialChapterId) {
      return stored.scrollPosition;
    }
    return initialCursor;
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialPreference.themeMode);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialPreference.layoutMode);

  // ── sync chapter id from props ──
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

  // ── sync theme/layout from backend (only if no local pref yet) ──
  useEffect(() => {
    if (hasStoredPreferenceRef.current || userInteractedRef.current) return;
    const sourceMode = backendMode ?? backendProgress?.readingMode;
    if (!sourceMode) return;
    setThemeMode(deriveThemeMode(sourceMode));
    setLayoutMode(deriveLayoutMode(sourceMode));
  }, [backendMode, backendProgress?.readingMode]);

  // ── derived ──
  const resolvedChapterId = localChapterId ?? activeChapterId ?? activeChapter?.id;

  const currentSummaryIndex = useMemo(() => {
    if (resolvedChapterId != null) {
      const idx = chapterSummaries.findIndex((ch) => parseChapterId(ch.id) === resolvedChapterId);
      if (idx >= 0) return idx;
    }
    return Math.max(0, Math.min(initialChapterIndex, Math.max(chapterSummaries.length - 1, 0)));
  }, [chapterSummaries, initialChapterIndex, resolvedChapterId]);

  const currentSummary = chapterSummaries[currentSummaryIndex] ?? null;
  const previousSummary = chapterSummaries[currentSummaryIndex - 1] ?? null;
  const nextSummary = chapterSummaries[currentSummaryIndex + 1] ?? null;

  const currentBackendChapter = useMemo(() => {
    if (activeChapter && activeChapter.id === resolvedChapterId) return activeChapter;
    return null;
  }, [activeChapter, resolvedChapterId]);

  const blocks = useMemo(
    () => splitChapterContent(currentBackendChapter?.content),
    [currentBackendChapter?.content]
  );

  const totalBlocks = blocks.length;
  const safeCursor = clampCursor(cursor, totalBlocks);
  const strategy = getStrategy(layoutMode);
  const theme = getReaderTheme(themeMode);
  const persistedReadMode = toBackendReadMode(layoutMode);

  // ── persist helpers ──
  const persistSnapshot = useCallback(
    (snapshot: SaveSnapshot | null) => {
      if (!snapshot) return;
      writeStoredProgress(manga.id, snapshot);
      if (!onSaveProgress) return;
      const key = serializeSnapshot(snapshot);
      if (key && key === lastPersistedKeyRef.current) return;
      lastPersistedKeyRef.current = key;
      Promise.resolve(
        onSaveProgress(snapshot.chapterId, snapshot.scrollPosition, snapshot.readingMode)
      ).catch(() => {
        if (lastPersistedKeyRef.current === key) lastPersistedKeyRef.current = null;
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
      if (options?.requireInteraction !== false && !userInteractedRef.current) return;
      persistSnapshot(options?.snapshot ?? latestSnapshotRef.current);
    },
    [persistSnapshot]
  );

  const syncSnapshotNow = useCallback(
    (chapterId: number, scrollPos: number) => {
      const snap: SaveSnapshot = {
        chapterId,
        scrollPosition: scrollPos,
        readingMode: persistedReadMode,
      };
      latestSnapshotRef.current = snap;
      writeStoredProgress(manga.id, snap);
    },
    [manga.id, persistedReadMode]
  );

  // ── scroll into view ──
  const FIXED_HEADER_HEIGHT = 80; // two 40px fixed headers

  const scrollCursorIntoView = useCallback(
    (targetCursor: number) => {
      const dir = strategy.getScrollDirection();
      if (!dir) return;
      // Suppress any scroll-tracking while we programmatically scroll
      suppressScrollTrackingRef.current = true;
      if (suppressTimerRef.current != null) window.clearTimeout(suppressTimerRef.current);
      window.requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) {
          suppressScrollTrackingRef.current = false;
          return;
        }
        const children = Array.from(container.children) as HTMLElement[];
        const target = children[targetCursor];
        if (!target) {
          suppressScrollTrackingRef.current = false;
          return;
        }
        if (dir === 'horizontal') {
          container.scrollTo({ left: target.offsetLeft - 16, behavior: 'auto' });
        } else {
          // Scroll so the target block sits just below the fixed headers
          const targetTop =
            target.getBoundingClientRect().top + window.scrollY - FIXED_HEADER_HEIGHT - 12;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
        }
        // Keep suppressing for 300ms so the browser can fully settle
        suppressTimerRef.current = window.setTimeout(() => {
          suppressTimerRef.current = null;
          suppressScrollTrackingRef.current = false;
        }, 300);
      });
    },
    [strategy]
  );

  // ── restore progress on chapter load ──
  useEffect(() => {
    if (!currentBackendChapter) {
      lastLoadedChapterRef.current = null;
      return;
    }
    if (!currentBackendChapter.content) return;

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
    if (!chapterChanged && userInteractedRef.current && !progressChanged) return;

    lastRestoredProgressKeyRef.current = restoredKey;
    lastLoadedChapterRef.current = currentBackendChapter.id;
    userInteractedRef.current = false;
    const nextCursor = restoredSnapshot
      ? restoredSnapshot.scrollPosition
      : clampCursor(initialCursor, totalBlocks);
    setCursor(nextCursor);
    scrollCursorIntoView(nextCursor);
    // Mark initial restore as done so scroll tracking can begin
    if (!initialRestoreDoneRef.current) {
      initialRestoreDoneRef.current = true;
    }
  }, [
    backendProgress,
    currentBackendChapter,
    initialCursor,
    manga.id,
    scrollCursorIntoView,
    totalBlocks,
  ]);

  // ── keep latestSnapshotRef in sync ──
  useEffect(() => {
    latestSnapshotRef.current =
      currentBackendChapter && currentBackendChapter.content
        ? {
            chapterId: currentBackendChapter.id,
            scrollPosition: safeCursor,
            readingMode: persistedReadMode,
          }
        : null;
  }, [currentBackendChapter, persistedReadMode, safeCursor]);

  // ── debounced save to backend ──
  useEffect(() => {
    if (!userInteractedRef.current || !latestSnapshotRef.current) return;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
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

  // ── flush on unload / visibility change ──
  useEffect(() => {
    const onHide = () => flushProgress({ requireInteraction: false });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      flushProgress({ requireInteraction: false });
      if (suppressTimerRef.current != null) {
        window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
    };
  }, [flushProgress]);

  // ── scroll into view on layout/chapter change ──
  useEffect(() => {
    const dir = strategy.getScrollDirection();
    if (!dir) return;
    // When switching layout modes, reset window scroll first so the new
    // layout can measure positions correctly, then scroll to cursor.
    if (dir === 'vertical') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    // Wait an extra frame for the new layout to settle before measuring
    window.requestAnimationFrame(() => {
      scrollCursorIntoView(safeCursor);
    });
  }, [currentBackendChapter?.id, layoutMode, safeCursor, scrollCursorIntoView, strategy]);

  // ── VERTICAL scroll tracking ──
  const handleVerticalScrollTracking = useCallback(() => {
    if (!initialRestoreDoneRef.current) return;
    if (suppressScrollTrackingRef.current) return;
    if (strategy.getScrollDirection() !== 'vertical') return;
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const vh = window.innerHeight;
    let bestIndex = 0;
    let bestOverlap = -1;
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      if (r.bottom < 0) continue;
      if (r.top > vh) break;
      const overlap = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = i;
      }
    }

    userInteractedRef.current = true;
    setCursor((prev) => {
      if (prev === bestIndex) return prev;
      if (currentBackendChapter?.content) {
        syncSnapshotNow(currentBackendChapter.id, bestIndex);
      }
      return bestIndex;
    });
  }, [currentBackendChapter, strategy, syncSnapshotNow]);

  useEffect(() => {
    if (strategy.getScrollDirection() !== 'vertical' || totalBlocks === 0) return;
    window.addEventListener('scroll', handleVerticalScrollTracking, { passive: true });
    return () => window.removeEventListener('scroll', handleVerticalScrollTracking);
  }, [handleVerticalScrollTracking, strategy, totalBlocks]);

  // ── HORIZONTAL scroll tracking ──
  const handleHorizontalScrollTracking = useCallback(() => {
    if (!initialRestoreDoneRef.current) return;
    if (suppressScrollTrackingRef.current) return;
    if (strategy.getScrollDirection() !== 'horizontal') return;
    const container = containerRef.current;
    if (!container) return;
    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) return;

    const cw = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    let bestIndex = 0;
    let bestOverlap = -1;
    for (let i = 0; i < children.length; i++) {
      const left = children[i].offsetLeft - container.offsetLeft;
      const right = left + children[i].offsetWidth;
      const overlap = Math.min(right, scrollLeft + cw) - Math.max(left, scrollLeft);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = i;
      }
    }

    userInteractedRef.current = true;
    setCursor((prev) => {
      if (prev === bestIndex) return prev;
      if (currentBackendChapter?.content) {
        syncSnapshotNow(currentBackendChapter.id, bestIndex);
      }
      return bestIndex;
    });
  }, [currentBackendChapter, strategy, syncSnapshotNow]);

  useEffect(() => {
    if (strategy.getScrollDirection() !== 'horizontal' || totalBlocks === 0) return;
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleHorizontalScrollTracking, { passive: true });
    return () => el.removeEventListener('scroll', handleHorizontalScrollTracking);
  }, [handleHorizontalScrollTracking, strategy, totalBlocks]);

  // ── mode change handlers ──
  const persistModePreference = useCallback(
    (nextTheme: ThemeMode, nextLayout: LayoutMode) => {
      const nextReadMode = toBackendReadMode(nextLayout);
      writeStoredPreference(manga.id, nextTheme, nextLayout);
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

  const handleThemeToggle = useCallback(() => {
    const next: ThemeMode = themeMode === 'day' ? 'night' : 'day';
    userInteractedRef.current = true;
    setThemeMode(next);
    persistModePreference(next, layoutMode);
  }, [layoutMode, persistModePreference, themeMode]);

  const handleLayoutChange = useCallback(
    (nextLayout: LayoutMode) => {
      if (nextLayout === layoutMode) return;
      userInteractedRef.current = true;
      suppressScrollTrackingRef.current = true;
      setLayoutMode(nextLayout);
      persistModePreference(themeMode, nextLayout);
    },
    [layoutMode, persistModePreference, themeMode]
  );

  const handleCursorStep = useCallback(
    (nextCursor: number) => {
      const clamped = clampCursor(nextCursor, totalBlocks);
      userInteractedRef.current = true;
      setCursor(clamped);
      if (currentBackendChapter?.content) {
        syncSnapshotNow(currentBackendChapter.id, clamped);
      }
      // For horizontal-scroll, programmatically scroll the container
      if (strategy.getScrollDirection() === 'horizontal') {
        scrollCursorIntoView(clamped);
      }
    },
    [currentBackendChapter, scrollCursorIntoView, strategy, syncSnapshotNow, totalBlocks]
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

  // ── derived render values ──
  const loadingContent = !currentBackendChapter && chapterSummaries.length > 0;
  const progressPercent = totalBlocks > 0 ? Math.round(((safeCursor + 1) / totalBlocks) * 100) : 0;

  const pageShadow =
    layoutMode === 'page-flip'
      ? `10px 10px 0 ${theme.borderColor}`
      : `0 12px 24px ${theme.borderColor}22`;

  // ── RENDER ─────────────────────────────────────────────────────────────────

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
      {/* ── Toolbar ── */}
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
        {/* Chapter select */}
        <select
          value={resolvedChapterId ?? ''}
          onChange={(e) => navigateToChapter(parseChapterId(e.target.value))}
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
            const cid = parseChapterId(chapter.id);
            return (
              <option key={chapter.id} value={cid ?? ''}>
                Ch.{chapter.number} — {chapter.title}
              </option>
            );
          })}
        </select>

        {/* Progress bar */}
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
          <div style={{ flex: 1, height: 3, background: theme.borderColor }}>
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

        {/* Layout mode buttons */}
        <div
          style={{
            display: 'flex',
            borderLeft: `1px solid ${theme.borderColor}`,
            height: '100%',
          }}
        >
          {LAYOUT_MODES.map((mode) => {
            const isActive = layoutMode === mode;
            const s = layoutStrategies[mode];
            return (
              <button
                key={mode}
                onClick={() => handleLayoutChange(mode)}
                title={s.description}
                aria-label={`Kiểu đọc: ${s.labelVI}`}
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
                {s.labelVI}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Theme toggle icon (top-right corner) ── */}
      <ThemeToggle
        themeMode={themeMode}
        onToggle={handleThemeToggle}
        color={theme.color}
        hoverBg={theme.pageBackground}
      />

      {/* ── Content area ── */}
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
                boxShadow: pageShadow,
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

      {/* ── Paged / horizontal navigation ── */}
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

      {/* ── Chapter navigation (bottom) ── */}
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
