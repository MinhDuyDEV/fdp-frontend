"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProgress } from "@/hooks";
import { MangaFactory } from "@/lib/data";
import {
	fetchChapterPages,
	fetchChapters,
	type MdxChapterInfo,
} from "@/lib/mangadexApi";
import { getStrategy, type ReadMode, strategies } from "@/lib/readStrategy";
import type { Chapter, Manga } from "@/types";

function placeholder(
	mangaId: string,
	chapterNum: number,
	count: number,
): string[] {
	return Array.from(
		{ length: count },
		(_, i) =>
			`https://picsum.photos/seed/${mangaId}-${chapterNum}-${i}/720/1080?grayscale`,
	);
}

function LoadingSkeleton() {
	return (
		<div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 12px" }}>
			<style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
			{[500, 460, 420].map((h, i) => (
				<div
					key={i}
					style={{
						marginBottom: 6,
						background: "var(--aged)",
						height: h,
						animation: "pulse 1.5s ease-in-out infinite",
						animationDelay: `${i * 0.2}s`,
					}}
				/>
			))}
			<div
				style={{
					textAlign: "center",
					padding: "16px",
					fontFamily: "'IBM Plex Mono',monospace",
					fontSize: "0.72rem",
					color: "var(--smoke)",
				}}
			>
				Đang tải trang truyện từ MangaDex…
			</div>
		</div>
	);
}

interface Props {
	manga: Manga;
	initialChapterIndex: number;
}

export default function MangaReader({ manga, initialChapterIndex }: Props) {
	const { progress, save } = useProgress(manga.id);
	const [chapterIdx, setChapterIdx] = useState(initialChapterIndex);

	// ─── FACTORY + STRATEGY: genre determines default reading mode ───
	const [readMode, setReadMode] = useState<ReadMode>(
		MangaFactory.getRecommendedReadMode(manga.genre),
	);
	const [currentPage, setCurrentPage] = useState(0);
	const [mdxChapters, setMdxChapters] = useState<MdxChapterInfo[]>([]);
	const [mdxFetched, setMdxFetched] = useState(false);
	const [pages, setPages] = useState<string[]>([]);
	const [loadingPages, setLoadingPages] = useState(true);
	const [pageError, setPageError] = useState<string | null>(null);

	const chapter: Chapter = manga.chapters[chapterIdx];

	// ─── STRATEGY PATTERN: get active reading strategy ───
	const strategy = getStrategy(readMode);
	const containerRef = useRef<HTMLDivElement>(null);

	// Fetch MangaDex chapter list once
	useEffect(() => {
		if (!manga.mangadexId || mdxFetched) return;
		fetchChapters(manga.mangadexId, 20)
			.then((chs) => {
				setMdxChapters(chs);
				setMdxFetched(true);
			})
			.catch(() => setMdxFetched(true));
	}, [manga.mangadexId, mdxFetched]);

	// Fetch pages whenever chapter changes
	useEffect(() => {
		setPages([]);
		setLoadingPages(true);
		setPageError(null);

		const localId = chapter.mangadexId;
		const dynMatch = mdxChapters.find(
			(c) => c.chapter === String(chapter.number),
		);
		const chapterId = localId || dynMatch?.id;

		if (!chapterId) {
			setPages(placeholder(manga.id, chapter.number, chapter.pages));
			setLoadingPages(false);
			return;
		}

		fetchChapterPages(chapterId)
			.then(({ pages: realPages }) => {
				if (realPages.length === 0) throw new Error("empty");
				setPages(realPages);
				setLoadingPages(false);
			})
			.catch(() => {
				setPageError("Không thể tải từ MangaDex — hiển thị ảnh demo.");
				setPages(placeholder(manga.id, chapter.number, chapter.pages));
				setLoadingPages(false);
			});
	}, [chapterIdx, mdxChapters]);

	// Restore page from progress
	useEffect(() => {
		if (progress?.chapterIndex === chapterIdx)
			setCurrentPage(progress.pageIndex);
		else setCurrentPage(0);
	}, [chapterIdx]);

	// Save progress — track page position in all modes
	useEffect(() => {
		if (pages.length === 0) return;
		save(chapterIdx, currentPage, pages.length);
	}, [chapterIdx, currentPage, readMode, pages.length]);

	// ─── SCROLL TRACKING: update currentPage based on scroll position ───
	// Strategy declares its scroll direction; we listen accordingly.
	const handleScrollTracking = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;
		const children = Array.from(container.children) as HTMLElement[];
		if (children.length === 0) return;

		const dir = strategy.getScrollDirection();
		if (dir === "vertical") {
			// Find which page's top edge is closest to viewport center
			const viewportCenter = window.innerHeight / 2;
			let closest = 0;
			let closestDist = Infinity;
			for (let i = 0; i < children.length; i++) {
				const rect = children[i].getBoundingClientRect();
				const pageCenter = rect.top + rect.height / 2;
				const dist = Math.abs(pageCenter - viewportCenter);
				if (dist < closestDist) {
					closestDist = dist;
					closest = i;
				}
			}
			setCurrentPage(closest);
		} else if (dir === "horizontal") {
			// Find which page is snapped to the left edge (matches scrollSnapAlign: "start")
			const scrollLeft = container.scrollLeft;
			let closest = 0;
			let closestDist = Infinity;
			for (let i = 0; i < children.length; i++) {
				const child = children[i];
				const dist = Math.abs(child.offsetLeft - scrollLeft);
				if (dist < closestDist) {
					closestDist = dist;
					closest = i;
				}
			}
			setCurrentPage(closest);
		}
	}, [strategy]);

	useEffect(() => {
		if (loadingPages || pages.length === 0) return;
		const dir = strategy.getScrollDirection();
		if (!dir) return; // flip mode — no scroll tracking needed

		const opts: AddEventListenerOptions = { passive: true };

		if (dir === "vertical") {
			window.addEventListener("scroll", handleScrollTracking, opts);
			return () => window.removeEventListener("scroll", handleScrollTracking);
		}
		// horizontal — listen on the container itself
		const container = containerRef.current;
		if (!container) return;
		container.addEventListener("scroll", handleScrollTracking, opts);
		return () => container.removeEventListener("scroll", handleScrollTracking);
	}, [loadingPages, pages.length, strategy, handleScrollTracking]);

	// ─── SYNC VIEW TO CURRENT PAGE when switching read mode ───
	// After mode change, scroll/snap the viewport to the page the user was reading.
	useEffect(() => {
		if (loadingPages || pages.length === 0) return;
		const dir = strategy.getScrollDirection();
		if (!dir) return; // flip mode shows the correct page via isPageVisible

		// Wait one frame for the DOM to re-render with new layout
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
	}, [readMode, loadingPages]); // intentionally only readMode + loadingPages

	const pct = pages.length
		? Math.round(((currentPage + 1) / pages.length) * 100)
		: 0;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minHeight: "calc(100vh - 40px)",
			}}
		>
			{/* TOOLBAR */}
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
					{manga.chapters.map((ch, i) => (
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
								width: `${loadingPages ? 0 : pct}%`,
								height: "100%",
								background: "var(--rust)",
								transition: "width 0.3s",
							}}
						/>
					</div>
					<span>{loadingPages ? "Đang tải…" : `${pages.length} trang`}</span>
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

			{/* ERROR */}
			{pageError && (
				<div
					style={{
						background: "var(--aged)",
						borderBottom: "1px solid var(--ink)",
						padding: "6px 20px",
						fontFamily: "'IBM Plex Mono',monospace",
						fontSize: "0.68rem",
						color: "var(--smoke)",
					}}
				>
					⚠ {pageError}
				</div>
			)}

			{/* ─── STRATEGY-DRIVEN PAGE RENDERING ───
           Instead of 3 conditional blocks (scroll/flip/horizontal),
           the active strategy controls layout, visibility, and styling. */}
			{loadingPages ? (
				<LoadingSkeleton />
			) : (
				<div ref={containerRef} style={strategy.getContainerStyle()}>
					{pages.map((src, i) => (
						<div
							key={i}
							style={{
								...strategy.getPageStyle(i, pages.length),
								display: strategy.isPageVisible(i, currentPage)
									? undefined
									: "none",
							}}
						>
							<img
								src={src}
								alt={`Trang ${i + 1}`}
								loading={i < 3 ? "eager" : "lazy"}
								style={strategy.getImageStyle()}
								onError={(e) => {
									const img = e.target as HTMLImageElement;
									if (!img.dataset.fallback) {
										img.dataset.fallback = "1";
										img.src = `https://picsum.photos/seed/fallback-${i}/720/1080?grayscale`;
									}
								}}
							/>
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

			{/* ─── STRATEGY-DRIVEN NAVIGATION ───
           Only strategies that need manual page-turning show controls. */}
			{strategy.showNavigation() && !loadingPages && (
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
						onClick={() => setCurrentPage(strategy.prevPage(currentPage))}
						disabled={currentPage === 0}
						aria-label="Trang trước"
						style={{
							padding: "7px 18px",
							opacity: currentPage === 0 ? 0.3 : 1,
							cursor: currentPage === 0 ? "not-allowed" : "pointer",
						}}
					>
						← Trước
					</button>
					<span>
						Trang {currentPage + 1} / {pages.length || "?"}
					</span>
					<button
						className="btn btn-primary"
						onClick={() =>
							setCurrentPage(strategy.nextPage(currentPage, pages.length))
						}
						disabled={currentPage >= pages.length - 1}
						aria-label="Trang sau"
						style={{
							padding: "7px 18px",
							opacity: currentPage >= pages.length - 1 ? 0.3 : 1,
							cursor:
								currentPage >= pages.length - 1 ? "not-allowed" : "pointer",
						}}
					>
						Sau →
					</button>
				</div>
			)}

			{/* FOOTER NAV */}
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
					Chương {chapterIdx + 1} / {manga.chapters.length}
				</span>
				<button
					className="btn btn-primary"
					onClick={() => setChapterIdx((c) => c + 1)}
					disabled={chapterIdx === manga.chapters.length - 1}
					aria-label="Chương sau"
					style={{
						opacity: chapterIdx === manga.chapters.length - 1 ? 0.3 : 1,
						cursor:
							chapterIdx === manga.chapters.length - 1
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
