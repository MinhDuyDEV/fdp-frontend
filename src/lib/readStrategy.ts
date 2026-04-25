// ─── STRATEGY PATTERN ────────────────────────────────────────────────────────
// ReadStrategy: layout behavior selected at runtime.
// Theme (day/night) is independent — applied via getReaderTheme(themeMode).

import type { CSSProperties } from 'react';

export type LayoutMode = 'scroll' | 'horizontal-scroll' | 'page-flip';
export type ThemeMode = 'day' | 'night';

type ScrollDirection = 'vertical' | 'horizontal' | null;

export type ReaderTheme = {
  background: string;
  color: string;
  pageBackground: string;
  borderColor: string;
  progressColor: string;
  mutedColor: string;
  textShadow?: string;
};

export interface ReadStrategy {
  layoutMode: LayoutMode;
  label: string;
  labelVI: string;
  description: string;
  usesPagedNavigation: boolean;
  getContainerStyle(): CSSProperties;
  getPageStyle(index: number, total: number): CSSProperties;
  getContentStyle(): CSSProperties;
  isBlockVisible(blockIndex: number, cursor: number): boolean;
  showNavigation(): boolean;
  nextCursor(current: number, total: number): number;
  prevCursor(current: number): number;
  getScrollDirection(): ScrollDirection;
}

// ─── THEMES ──────────────────────────────────────────────────────────────────

const themes: Record<ThemeMode, ReaderTheme> = {
  day: {
    background: 'var(--paper)',
    color: 'var(--ink)',
    pageBackground: '#fcfaf4',
    borderColor: 'var(--aged)',
    progressColor: 'var(--rust)',
    mutedColor: 'var(--smoke)',
  },
  night: {
    background: '#171411',
    color: '#f4ebd6',
    pageBackground: '#201b17',
    borderColor: '#453b33',
    progressColor: '#d6a56f',
    mutedColor: '#c1b29d',
    textShadow: '0 1px 0 rgba(0, 0, 0, 0.25)',
  },
};

export function getReaderTheme(themeMode: ThemeMode): ReaderTheme {
  return themes[themeMode];
}

// ─── LAYOUT STRATEGIES ───────────────────────────────────────────────────────

function createScrollStrategy(config: {
  layoutMode: LayoutMode;
  label: string;
  labelVI: string;
  description: string;
}): ReadStrategy {
  return {
    layoutMode: config.layoutMode,
    label: config.label,
    labelVI: config.labelVI,
    description: config.description,
    usesPagedNavigation: false,
    getContainerStyle() {
      return {
        maxWidth: 780,
        margin: '0 auto',
        padding: '24px 16px 48px',
        width: '100%',
        display: 'grid',
        gap: 18,
      };
    },
    getPageStyle() {
      return {
        position: 'relative',
        padding: '24px 20px',
        lineHeight: 1.85,
        minHeight: 'calc(60vh - 80px)',
      };
    },
    getContentStyle() {
      return {
        whiteSpace: 'pre-wrap',
        fontSize: '1rem',
        fontFamily: "'Noto Serif', Georgia, serif",
      };
    },
    isBlockVisible() {
      return true;
    },
    showNavigation() {
      return false;
    },
    nextCursor(current, total) {
      return Math.min(total - 1, current + 1);
    },
    prevCursor(current) {
      return Math.max(0, current - 1);
    },
    getScrollDirection() {
      return 'vertical';
    },
  };
}

function createHorizontalScrollStrategy(config: {
  layoutMode: LayoutMode;
  label: string;
  labelVI: string;
  description: string;
}): ReadStrategy {
  return {
    layoutMode: config.layoutMode,
    label: config.label,
    labelVI: config.labelVI,
    description: config.description,
    usesPagedNavigation: false,
    getContainerStyle() {
      return {
        display: 'flex',
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        gap: 24,
        padding: '24px 16px 48px',
        width: '100%',
      };
    },
    getPageStyle() {
      return {
        position: 'relative',
        minWidth: 'calc(100vw - 64px)',
        maxWidth: 780,
        flexShrink: 0,
        scrollSnapAlign: 'center',
        padding: '24px 20px',
        lineHeight: 1.85,
        minHeight: 180,
      };
    },
    getContentStyle() {
      return {
        whiteSpace: 'pre-wrap',
        fontSize: '1rem',
        fontFamily: "'Noto Serif', Georgia, serif",
      };
    },
    isBlockVisible() {
      return true;
    },
    showNavigation() {
      return true;
    },
    nextCursor(current, total) {
      return Math.min(total - 1, current + 1);
    },
    prevCursor(current) {
      return Math.max(0, current - 1);
    },
    getScrollDirection() {
      return 'horizontal';
    },
  };
}

function createPagedStrategy(config: {
  layoutMode: LayoutMode;
  label: string;
  labelVI: string;
  description: string;
}): ReadStrategy {
  return {
    layoutMode: config.layoutMode,
    label: config.label,
    labelVI: config.labelVI,
    description: config.description,
    usesPagedNavigation: true,
    getContainerStyle() {
      return {
        maxWidth: 880,
        margin: '0 auto',
        padding: '32px 16px 24px',
        display: 'flex',
        justifyContent: 'center',
      };
    },
    getPageStyle() {
      return {
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 220px)',
        maxWidth: 720,
        padding: '28px 24px 44px',
        lineHeight: 1.9,
      };
    },
    getContentStyle() {
      return {
        whiteSpace: 'pre-wrap',
        fontSize: '1rem',
        fontFamily: "'Noto Serif', Georgia, serif",
      };
    },
    isBlockVisible(blockIndex, cursor) {
      return blockIndex === cursor;
    },
    showNavigation() {
      return true;
    },
    nextCursor(current, total) {
      return Math.min(total - 1, current + 1);
    },
    prevCursor(current) {
      return Math.max(0, current - 1);
    },
    getScrollDirection() {
      return null;
    },
  };
}

const layoutStrategyMap: Record<LayoutMode, ReadStrategy> = {
  scroll: createScrollStrategy({
    layoutMode: 'scroll',
    label: 'SCROLL',
    labelVI: 'Cuộn dọc',
    description: 'Cuộn dọc liên tục',
  }),
  'horizontal-scroll': createHorizontalScrollStrategy({
    layoutMode: 'horizontal-scroll',
    label: 'H-SCROLL',
    labelVI: 'Cuộn ngang',
    description: 'Cuộn ngang liên tục',
  }),
  'page-flip': createPagedStrategy({
    layoutMode: 'page-flip',
    label: 'FLIP',
    labelVI: 'Lật trang',
    description: 'Một đoạn tại một thời điểm',
  }),
};

export function getStrategy(layoutMode: LayoutMode): ReadStrategy {
  return layoutStrategyMap[layoutMode];
}

export const layoutStrategies = layoutStrategyMap;
