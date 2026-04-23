// ─── STRATEGY PATTERN ────────────────────────────────────────────────────────
// ReadStrategy: explicit backend reading-mode behavior selected at runtime.

import type { CSSProperties } from 'react';
import type { BackendReadMode } from '@/types/api';

export type ReadMode = BackendReadMode;

type ScrollDirection = 'vertical' | null;

type ReaderTheme = {
  background: string;
  color: string;
  pageBackground: string;
  borderColor: string;
  progressColor: string;
  mutedColor: string;
  textShadow?: string;
};

export interface ReadStrategy {
  mode: ReadMode;
  label: string;
  labelVI: string;
  description: string;
  usesPagedNavigation: boolean;
  getContainerStyle(): CSSProperties;
  getPageStyle(index: number, total: number): CSSProperties;
  getContentStyle(): CSSProperties;
  getReaderTheme(): ReaderTheme;
  isBlockVisible(blockIndex: number, cursor: number): boolean;
  showNavigation(): boolean;
  nextCursor(current: number, total: number): number;
  prevCursor(current: number): number;
  getScrollDirection(): ScrollDirection;
}

function createScrollStrategy(config: {
  mode: ReadMode;
  label: string;
  labelVI: string;
  description: string;
  theme: ReaderTheme;
}): ReadStrategy {
  return {
    mode: config.mode,
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
        border: `1px solid ${config.theme.borderColor}`,
        background: config.theme.pageBackground,
        boxShadow: `0 12px 24px ${config.theme.borderColor}22`,
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
        color: config.theme.color,
        textShadow: config.theme.textShadow,
      };
    },
    getReaderTheme() {
      return config.theme;
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

function createPagedStrategy(config: {
  mode: ReadMode;
  label: string;
  labelVI: string;
  description: string;
  theme: ReaderTheme;
}): ReadStrategy {
  return {
    mode: config.mode,
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
        border: `1px solid ${config.theme.borderColor}`,
        background: config.theme.pageBackground,
        boxShadow: `10px 10px 0 ${config.theme.borderColor}`,
        padding: '28px 24px 44px',
        lineHeight: 1.9,
      };
    },
    getContentStyle() {
      return {
        whiteSpace: 'pre-wrap',
        fontSize: '1rem',
        fontFamily: "'Noto Serif', Georgia, serif",
        color: config.theme.color,
        textShadow: config.theme.textShadow,
      };
    },
    getReaderTheme() {
      return config.theme;
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

const strategyMap: Record<ReadMode, ReadStrategy> = {
  day: createScrollStrategy({
    mode: 'day',
    label: 'DAY',
    labelVI: 'Ban ngày',
    description: 'Nền sáng, cuộn dọc liên tục',
    theme: {
      background: 'var(--paper)',
      color: 'var(--ink)',
      pageBackground: '#fcfaf4',
      borderColor: 'var(--aged)',
      progressColor: 'var(--rust)',
      mutedColor: 'var(--smoke)',
    },
  }),
  night: createScrollStrategy({
    mode: 'night',
    label: 'NIGHT',
    labelVI: 'Ban đêm',
    description: 'Nền tối, cuộn dọc dịu mắt',
    theme: {
      background: '#171411',
      color: '#f4ebd6',
      pageBackground: '#201b17',
      borderColor: '#453b33',
      progressColor: '#d6a56f',
      mutedColor: '#c1b29d',
      textShadow: '0 1px 0 rgba(0, 0, 0, 0.25)',
    },
  }),
  scroll: createScrollStrategy({
    mode: 'scroll',
    label: 'SCROLL',
    labelVI: 'Cuộn dọc',
    description: 'Chế độ đọc cuộn dọc mặc định',
    theme: {
      background: 'var(--paper)',
      color: 'var(--ink)',
      pageBackground: '#fffdf8',
      borderColor: 'var(--aged)',
      progressColor: 'var(--ink)',
      mutedColor: 'var(--smoke)',
    },
  }),
  'page-flip': createPagedStrategy({
    mode: 'page-flip',
    label: 'FLIP',
    labelVI: 'Lật trang',
    description: 'Một khối nội dung tại một thời điểm',
    theme: {
      background: 'var(--cream)',
      color: 'var(--ink)',
      pageBackground: '#fffaf1',
      borderColor: 'var(--aged)',
      progressColor: 'var(--rust)',
      mutedColor: 'var(--smoke)',
    },
  }),
};

export function getStrategy(mode: ReadMode): ReadStrategy {
  return strategyMap[mode];
}

export const strategies = strategyMap;
