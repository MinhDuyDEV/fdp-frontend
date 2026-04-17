// ─── STRATEGY PATTERN ────────────────────────────────────────────────────────
// ReadStrategy: swappable reading behaviour at runtime.
// Each concrete strategy encapsulates layout, visibility, and navigation logic.
// The client (MangaReader) delegates to the strategy instead of using conditionals.

import type { CSSProperties } from "react";

export type ReadMode = "scroll" | "flip" | "horizontal";

// ─── STRATEGY INTERFACE ──────────────────────────────────────────────────────

export interface ReadStrategy {
	mode: ReadMode;
	label: string;
	labelVI: string;
	description: string;

	/** CSS for the pages container — controls overall layout direction */
	getContainerStyle(): CSSProperties;
	/** CSS for individual page wrapper — controls sizing and spacing */
	getPageStyle(index: number, total: number): CSSProperties;
	/** CSS for the img element — controls how images fill their container */
	getImageStyle(): CSSProperties;
	/** Whether a page should be rendered given the current page position */
	isPageVisible(pageIndex: number, currentPage: number): boolean;
	/** Whether prev/next navigation buttons are shown */
	showNavigation(): boolean;
	/** Calculate next page index */
	nextPage(current: number, total: number): number;
	/** Calculate previous page index */
	prevPage(current: number): number;
	/** Scroll direction to track for progress: 'vertical', 'horizontal', or null (manual nav) */
	getScrollDirection(): "vertical" | "horizontal" | null;
}

// ─── CONCRETE STRATEGIES ─────────────────────────────────────────────────────

/** Cuộn dọc — all pages stacked vertically, user scrolls down */
class ScrollStrategy implements ReadStrategy {
	mode: ReadMode = "scroll";
	label = "SCROLL";
	labelVI = "Cuộn dọc";
	description = "Cuộn liên tục từ trên xuống";

	getContainerStyle(): CSSProperties {
		return {
			maxWidth: 720,
			margin: "0 auto",
			padding: "20px 12px",
			width: "100%",
		};
	}

	getPageStyle(): CSSProperties {
		return {
			marginBottom: 6,
			border: "1px solid var(--aged)",
			position: "relative",
			lineHeight: 0,
		};
	}

	getImageStyle(): CSSProperties {
		return { width: "100%", display: "block", filter: "var(--page-filter)" };
	}

	isPageVisible(): boolean {
		return true; // all pages always visible
	}

	showNavigation(): boolean {
		return false; // scroll — no buttons needed
	}

	nextPage(current: number, total: number): number {
		return Math.min(total - 1, current + 1);
	}

	prevPage(current: number): number {
		return Math.max(0, current - 1);
	}

	getScrollDirection(): "vertical" | "horizontal" | null {
		return "vertical"; // track vertical scroll position
	}
}

/** Lật trang — one page at a time with prev/next buttons */
class FlipStrategy implements ReadStrategy {
	mode: ReadMode = "flip";
	label = "FLIP";
	labelVI = "Lật trang";
	description = "Một trang tại một thời điểm";

	getContainerStyle(): CSSProperties {
		return {
			flex: 1,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			padding: "24px 16px",
		};
	}

	getPageStyle(): CSSProperties {
		return {
			maxWidth: 600,
			width: "100%",
			height: "calc(100vh - 200px)",
			border: "1px solid var(--aged)",
			boxShadow: "4px 4px 0 var(--aged)",
			position: "relative",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: "var(--aged)",
			overflow: "hidden",
		};
	}

	getImageStyle(): CSSProperties {
		return {
			maxWidth: "100%",
			maxHeight: "100%",
			objectFit: "contain",
			display: "block",
			filter: "var(--page-filter)",
		};
	}

	isPageVisible(pageIndex: number, currentPage: number): boolean {
		return pageIndex === currentPage; // only current page
	}

	showNavigation(): boolean {
		return true; // flip — needs prev/next buttons
	}

	nextPage(current: number, total: number): number {
		return Math.min(total - 1, current + 1);
	}

	prevPage(current: number): number {
		return Math.max(0, current - 1);
	}

	getScrollDirection(): "vertical" | "horizontal" | null {
		return null; // uses prev/next buttons, no scroll tracking
	}
}

/** Cuộn ngang — horizontal strip with scroll-snap, swipe-style reading */
class HorizontalStrategy implements ReadStrategy {
	mode: ReadMode = "horizontal";
	label = "SWIPE";
	labelVI = "Cuộn ngang";
	description = "Vuốt ngang như manga thật";

	getContainerStyle(): CSSProperties {
		return {
			display: "flex",
			gap: 4,
			overflowX: "auto",
			padding: "20px",
			flex: 1,
			scrollSnapType: "x mandatory",
		};
	}

	getPageStyle(): CSSProperties {
		return {
			flexShrink: 0,
			height: "calc(100vh - 160px)",
			border: "1px solid var(--aged)",
			lineHeight: 0,
			position: "relative",
			scrollSnapAlign: "start",
		};
	}

	getImageStyle(): CSSProperties {
		return {
			height: "100%",
			width: "auto",
			display: "block",
			filter: "var(--page-filter)",
		};
	}

	isPageVisible(): boolean {
		return true; // all pages in DOM, scrolled horizontally
	}

	showNavigation(): boolean {
		return false; // swipe — no buttons needed
	}

	nextPage(current: number, total: number): number {
		return Math.min(total - 1, current + 1);
	}

	prevPage(current: number): number {
		return Math.max(0, current - 1);
	}

	getScrollDirection(): "vertical" | "horizontal" | null {
		return "horizontal"; // track horizontal scroll position
	}
}

// ─── STRATEGY MAP ────────────────────────────────────────────────────────────

const strategyMap: Record<ReadMode, ReadStrategy> = {
	scroll: new ScrollStrategy(),
	flip: new FlipStrategy(),
	horizontal: new HorizontalStrategy(),
};

/** Get the reading strategy for a given mode */
export function getStrategy(mode: ReadMode): ReadStrategy {
	return strategyMap[mode];
}

/** All available strategies — used for toolbar iteration */
export const strategies = strategyMap;
