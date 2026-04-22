"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStrategy, modeToStrategyMap, type ReadMode, strategies } from "@/lib/readStrategy";
import type { Manga } from "@/types";
import type {
	BackendReadMode,
	Chapter as BackendChapter,
	ReadingProgress,
} from "@/types/api";

interface Props {
	manga: Manga;
	initialChapterIndex: number;
	backendChapters?: BackendChapter[];
	backendProgress?: ReadingProgress | null;
	backendMode?: BackendReadMode;
	onSaveProgress?: (
		chapterId: number,
		scrollPosition: number,
		readingMode: BackendReadMode,
	) => Promise<void> | void;
}

function strategyModeToBackend(mode: ReadMode): BackendReadMode {
	if (mode === "flip") return "page-flip";
	return "scroll";
}

function splitChapterContent(content?: string): string[] {
	if (!content) return ["Chương này chưa có nội dung."];
	const blocks = content
		.split(/\n{2,}/)
		.map((part) => part.trim())
		.filter(Boolean);
	return blocks.length ? blocks : [content.trim() || "Chương này chưa có nội dung."];
}

function LoadingSkeleton() {
	return (
		<div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 12px" }}>
			<style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
			{[90, 120, 100, 130].map((h, i) => (
				<div
					key={i}
					style={{
						marginBottom: 8,
						background: "var(--aged)",
						height: h,
						animation: "pulse 1.5s ease-in-out infinite",
						animationDelay: `${i * 0.2}s`,
					}}
				/>
			))}
		</div>
	);
}

export default function MangaReader({
	manga,
	initialChapterIndex,
	backendChapters = [],
	backendProgress,
	backendMode,
	onSaveProgress,
}: Props) {
	const [chapterIdx, setChapterIdx] = useState(initialChapterIndex);
	const [currentPage, setCurrentPage] = useState(0);
	const [readMode, setReadMode] = useState<ReadMode>(() =>
		backendMode ? modeToStrategyMap[backendMode] : "scroll",
	);

	const containerRef = useRef<HTMLDivElement>(null);
	const strategy = getStrategy(readMode);

	const chapterSummaries = manga.chapters;
	const currentSummary = chapterSummaries[chapterIdx];
	const currentBackendChapter = backendChapters[chapterIdx];

	const pages = useMemo(
		() => splitChapterContent(currentBackendChapter?.content),
		[currentBackendChapter?.content],
	);

	const loadingContent = !currentBackendChapter && chapterSummaries.length > 0;

	useEffect(() => {
		if (!backendMode) return;
		setReadMode(modeToStrategyMap[backendMode]);
	}, [backendMode]);

	useEffect(() => {
		if (!backendProgress || backendChapters.length === 0) return;
		const progressChapterIndex = backendChapters.findIndex(
			(ch) => ch.id === backendProgress.chapterId,
		);
		if (progressChapterIndex >= 0) {
			setChapterIdx(progressChapterIndex);
			setCurrentPage(Math.max(0, Math.floor(backendProgress.scrollPosition || 0)));
		}
	}, [backendProgress, backendChapters]);

	useEffect(() => {
		setCurrentPage(0);
	}, [chapterIdx]);

	const handleScrollTracking = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;
		const children = Array.from(container.children) as HTMLElement[];
		if (children.length === 0) return;

		const dir = strategy.getScrollDirection();
		if (dir === "vertical") {
			const viewportCenter = window.innerHeight / 2;
			let closest = 0;
			let closestDist = Infinity;
			for (let i = 0; i < children.length; i++) {
				const rect = children[i].getBoundingClientRect();
				const blockCenter = rect.top + rect.height / 2;
				const dist = Math.abs(blockCenter - viewportCenter);
				if (dist < closestDist) {
					closestDist = dist;
					closest = i;
				}
			}
			setCurrentPage(closest);
		} else if (dir === "horizontal") {
			const scrollLeft = container.scrollLeft;
			let closest = 0;
			let closestDist = Infinity;
			for (let i = 0; i < children.length; i++) {
				const dist = Math.abs(children[i].offsetLeft - scrollLeft);
				if (dist < closestDist) {
					closestDist = dist;
					closest = i;
				}
			}
			setCurrentPage(closest);
		}
	}, [strategy]);

	useEffect(() => {
		const dir = strategy.getScrollDirection();
		if (!dir || pages.length === 0) return;

		const opts: AddEventListenerOptions = { passive: true };
		if (dir === "vertical") {
			window.addEventListener("scroll", handleScrollTracking, opts);
			return () => window.removeEventListener("scroll", handleScrollTracking);
		}
		const container = containerRef.current;
		if (!container) return;
		container.addEventListener("scroll", handleScrollTracking, opts);
		return () => container.removeEventListener("scroll", handleScrollTracking);
	}, [pages.length, strategy, handleScrollTracking]);

	useEffect(() => {
		if (!currentBackendChapter || !onSaveProgress) return;
		onSaveProgress(
			currentBackendChapter.id,
			Math.max(0, currentPage),
			strategyModeToBackend(readMode),
		);
	}, [currentBackendChapter, currentPage, readMode, onSaveProgress]);

	useEffect(() => {
		if (pages.length === 0) return;
		const dir = strategy.getScrollDirection();
		if (!dir) return;
		requestAnimationFrame(() => {
			const container = containerRef.current;
			if (!container) return;
			const children = Array.from(container.children) as HTMLElement[];
			const target = children[currentPage];
			if (!target) return;
			if (dir === "vertical") {
				target.scrollIntoView({ behavior: "instant", block: "center" });
			} else {
				container.scrollTo({ left: target.offsetLeft, behavior: "instant" });
			}
		});
	}, [readMode, pages.length, currentPage, strategy]);

	const totalPages = pages.length;
	const safeCurrentPage = Math.max(0, Math.min(currentPage, Math.max(totalPages - 1, 0)));
	const pct = totalPages ? Math.round(((safeCurrentPage + 1) / totalPages) * 100) : 0;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minHeight: "calc(100vh - 40px)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					height: 40,
					borderBottom: "2px solid var(--ink)",
					background: "var(--paper)",
					position: "sticky",
					top: 40,
					zIndex: 50,
					flexShrink: 0,
				}}
			>
				<select
					value={chapterIdx}
					onChange={(e) => setChapterIdx(Number(e.target.value))}
					aria-label="Chọn chương"
					style={{
						fontFamily: "'IBM Plex Mono',monospace",
						fontSize: "0.68rem",
						fontWeight: 600,
						background: "var(--paper)",
						color: "var(--ink)",
						border: "none",
						borderRight: "1px solid var(--aged)",
						padding: "0 14px",
						height: "100%",
						cursor: "pointer",
						outline: "none",
						minWidth: 220,
					}}
				>
					{chapterSummaries.map((ch, i) => (
						<option key={ch.id} value={i}>
							Ch.{ch.number} — {ch.title}
						</option>
					))}
				</select>

				<div
					style={{
						flex: 1,
						padding: "0 16px",
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontFamily: "'IBM Plex Mono',monospace",
						fontSize: "0.63rem",
						color: "var(--smoke)",
					}}
				>
					<div style={{ flex: 1, height: 3, background: "var(--aged)" }}>
						<div
							style={{
								width: `${loadingContent ? 0 : pct}%`,
								height: "100%",
								background: "var(--rust)",
								transition: "width 0.3s",
							}}
						/>
					</div>
					<span>{loadingContent ? "Đang tải…" : `${totalPages} đoạn`}</span>
				</div>

				<div
					style={{
						display: "flex",
						borderLeft: "1px solid var(--aged)",
						height: "100%",
					}}
				>
					{(Object.keys(strategies) as ReadMode[]).map((mode) => (
						<button
							key={mode}
							onClick={() => setReadMode(mode)}
							title={strategies[mode].description}
							aria-label={`Chế độ đọc: ${strategies[mode].labelVI}`}
							aria-pressed={readMode === mode}
							style={{
								fontFamily: "'IBM Plex Mono',monospace",
								fontSize: "0.62rem",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.06em",
								border: "none",
								borderRight: "1px solid var(--aged)",
								background: readMode === mode ? "var(--ink)" : "none",
								color: readMode === mode ? "var(--paper)" : "var(--smoke)",
								padding: "0 12px",
								cursor: "pointer",
								transition: "all 0.15s",
							}}
						>
							{strategies[mode].labelVI}
						</button>
					))}
				</div>
			</div>

			{loadingContent ? (
				<LoadingSkeleton />
			) : (
				<div ref={containerRef} style={strategy.getContainerStyle()}>
					{pages.map((text, i) => (
						<div
							key={i}
							style={{
								...strategy.getPageStyle(i, pages.length),
								display: strategy.isPageVisible(i, safeCurrentPage)
									? undefined
									: "none",
								lineHeight: 1.8,
								padding: "18px 16px",
								background: "var(--paper)",
								color: "var(--ink)",
								fontSize: "1rem",
								fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
								whiteSpace: "pre-wrap",
							}}
						>
							<div>{text}</div>
							<span
								style={{
									position: "absolute",
									bottom: 5,
									right: 7,
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.58rem",
									color: "#fff",
									background: "rgba(0,0,0,0.6)",
									padding: "2px 6px",
									borderRadius: "3px",
								}}
							>
								{i + 1}/{pages.length}
							</span>
						</div>
					))}
				</div>
			)}

			{strategy.showNavigation() && !loadingContent && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 16,
						justifyContent: "center",
						padding: "12px 0",
						fontFamily: "'IBM Plex Mono',monospace",
						fontSize: "0.72rem",
						color: "var(--smoke)",
					}}
				>
					<button
						className="btn btn-primary"
						onClick={() => setCurrentPage(strategy.prevPage(safeCurrentPage))}
						disabled={safeCurrentPage === 0}
						aria-label="Trang trước"
						style={{
							padding: "7px 18px",
							opacity: safeCurrentPage === 0 ? 0.3 : 1,
							cursor: safeCurrentPage === 0 ? "not-allowed" : "pointer",
						}}
					>
						← Trước
					</button>
					<span>
						Đoạn {safeCurrentPage + 1} / {pages.length || "?"}
					</span>
					<button
						className="btn btn-primary"
						onClick={() => setCurrentPage(strategy.nextPage(safeCurrentPage, pages.length))}
						disabled={safeCurrentPage >= pages.length - 1}
						aria-label="Trang sau"
						style={{
							padding: "7px 18px",
							opacity: safeCurrentPage >= pages.length - 1 ? 0.3 : 1,
							cursor: safeCurrentPage >= pages.length - 1 ? "not-allowed" : "pointer",
						}}
					>
						Sau →
					</button>
				</div>
			)}

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "14px 20px",
					borderTop: "2px solid var(--ink)",
					background: "var(--paper)",
					fontFamily: "'IBM Plex Mono',monospace",
					fontSize: "0.7rem",
				}}
			>
				<button
					className="btn"
					onClick={() => setChapterIdx((c) => c - 1)}
					disabled={chapterIdx === 0}
					aria-label="Chương trước"
					style={{
						opacity: chapterIdx === 0 ? 0.3 : 1,
						cursor: chapterIdx === 0 ? "not-allowed" : "pointer",
					}}
				>
					← Chương trước
				</button>
				<span style={{ color: "var(--smoke)" }}>
					Chương {currentSummary?.number ?? chapterIdx + 1} / {chapterSummaries.length}
				</span>
				<button
					className="btn btn-primary"
					onClick={() => setChapterIdx((c) => c + 1)}
					disabled={chapterIdx === chapterSummaries.length - 1}
					aria-label="Chương sau"
					style={{
						opacity: chapterIdx === chapterSummaries.length - 1 ? 0.3 : 1,
						cursor:
							chapterIdx === chapterSummaries.length - 1
								? "not-allowed"
								: "pointer",
					}}
				>
					Chương sau →
				</button>
			</div>
		</div>
	);
}
