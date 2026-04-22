"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStrategy, type ReadMode, strategies } from "@/lib/readStrategy";
import type { Manga } from "@/types";
import type {
	Chapter as BackendChapter,
	BackendReadMode,
	ReadingProgress,
} from "@/types/api";

interface Props {
	manga: Manga;
	navigationChapters?: Manga["chapters"];
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
		readingMode: BackendReadMode,
	) => Promise<void> | void;
	onModeChange?: (readingMode: BackendReadMode) => Promise<void> | void;
	onChapterChange?: (chapterId: number) => void;
}

type SaveSnapshot = {
	chapterId: number;
	scrollPosition: number;
	readingMode: BackendReadMode;
};

function splitChapterContent(content?: string): string[] {
	if (!content) return ["Chương này chưa có nội dung."];
	const blocks = content
		.split(/\n{2,}/)
		.map((part) => part.trim())
		.filter(Boolean);
	return blocks.length
		? blocks
		: [content.trim() || "Chương này chưa có nội dung."];
}

function clampCursor(cursor: number, total: number): number {
	if (!Number.isFinite(cursor) || total <= 1) return 0;
	return Math.max(0, Math.min(Math.round(cursor), total - 1));
}

function parseChapterId(
	value: string | number | null | undefined,
): number | null {
	if (value == null) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function serializeSnapshot(snapshot: SaveSnapshot | null): string | null {
	if (!snapshot) return null;
	return `${snapshot.chapterId}:${snapshot.scrollPosition}:${snapshot.readingMode}`;
}

function LoadingSkeleton({ background }: { background: string }) {
	return (
		<div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 12px" }}>
			<style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
			{[90, 120, 100, 130].map((height, index) => (
				<div
					key={index}
					style={{
						marginBottom: 8,
						background,
						height,
						animation: "pulse 1.5s ease-in-out infinite",
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
			Math.max(
				0,
				Math.min(initialChapterIndex, Math.max(chapterSummaries.length - 1, 0)),
			)
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
	const latestSnapshotRef = useRef<SaveSnapshot | null>(null);

	const [localChapterId, setLocalChapterId] = useState<number | null>(
		inferredInitialChapterId,
	);
	const [cursor, setCursor] = useState(0);
	const [readMode, setReadMode] = useState<ReadMode>(
		() => backendMode ?? backendProgress?.readingMode ?? "scroll",
	);

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
		if (!backendMode) return;
		setReadMode(backendMode);
	}, [backendMode]);

	const resolvedChapterId =
		localChapterId ?? activeChapterId ?? activeChapter?.id;

	const currentSummaryIndex = useMemo(() => {
		if (resolvedChapterId != null) {
			const matchedIndex = chapterSummaries.findIndex(
				(chapter) => parseChapterId(chapter.id) === resolvedChapterId,
			);
			if (matchedIndex >= 0) return matchedIndex;
		}
		return Math.max(
			0,
			Math.min(initialChapterIndex, Math.max(chapterSummaries.length - 1, 0)),
		);
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
		[currentBackendChapter?.content],
	);

	const totalBlocks = blocks.length;
	const safeCursor = clampCursor(cursor, totalBlocks);
	const strategy = getStrategy(readMode);
	const theme = strategy.getReaderTheme();

	const persistSnapshot = useCallback(
		(snapshot: SaveSnapshot | null) => {
			if (!snapshot || !onSaveProgress) return;
			const snapshotKey = serializeSnapshot(snapshot);
			if (snapshotKey && snapshotKey === lastPersistedKeyRef.current) return;
			lastPersistedKeyRef.current = snapshotKey;
			Promise.resolve(
				onSaveProgress(
					snapshot.chapterId,
					snapshot.scrollPosition,
					snapshot.readingMode,
				),
			).catch(() => {
				if (lastPersistedKeyRef.current === snapshotKey) {
					lastPersistedKeyRef.current = null;
				}
			});
		},
		[onSaveProgress],
	);

	const flushProgress = useCallback(
		(options?: {
			requireInteraction?: boolean;
			snapshot?: SaveSnapshot | null;
		}) => {
			if (saveTimerRef.current != null) {
				window.clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
			if (options?.requireInteraction !== false && !userInteractedRef.current) {
				return;
			}
			persistSnapshot(options?.snapshot ?? latestSnapshotRef.current);
		},
		[persistSnapshot],
	);

	const scrollCursorIntoView = useCallback(
		(targetCursor: number) => {
			if (strategy.getScrollDirection() !== "vertical") return;
			window.requestAnimationFrame(() => {
				const container = containerRef.current;
				if (!container) return;
				const children = Array.from(container.children) as HTMLElement[];
				const target = children[targetCursor];
				if (!target) return;
				target.scrollIntoView({ behavior: "auto", block: "center" });
			});
		},
		[strategy],
	);

	useEffect(() => {
		if (!currentBackendChapter) {
			lastLoadedChapterRef.current = null;
			return;
		}

		const chapterChanged =
			lastLoadedChapterRef.current !== currentBackendChapter.id;
		const restoredSnapshot =
			backendProgress && backendProgress.chapterId === currentBackendChapter.id
				? {
						chapterId: currentBackendChapter.id,
						scrollPosition: clampCursor(
							backendProgress.scrollPosition,
							totalBlocks,
						),
						readingMode: backendProgress.readingMode,
					}
				: null;

		lastPersistedKeyRef.current = serializeSnapshot(restoredSnapshot);
		if (!chapterChanged && userInteractedRef.current) {
			return;
		}

		lastLoadedChapterRef.current = currentBackendChapter.id;
		userInteractedRef.current = false;
		const nextCursor = restoredSnapshot
			? restoredSnapshot.scrollPosition
			: clampCursor(initialCursor, totalBlocks);
		setCursor(nextCursor);
		scrollCursorIntoView(nextCursor);
	}, [
		backendProgress?.chapterId,
		backendProgress?.readingMode,
		backendProgress?.scrollPosition,
		currentBackendChapter?.id,
		initialCursor,
		scrollCursorIntoView,
		totalBlocks,
	]);

	useEffect(() => {
		latestSnapshotRef.current = currentBackendChapter
			? {
					chapterId: currentBackendChapter.id,
					scrollPosition: safeCursor,
					readingMode: readMode,
				}
			: null;
	}, [currentBackendChapter, readMode, safeCursor]);

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
	}, [currentBackendChapter?.id, persistSnapshot, readMode, safeCursor]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				flushProgress({ requireInteraction: false });
			}
		};
		const handlePageHide = () => {
			flushProgress({ requireInteraction: false });
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("pagehide", handlePageHide);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("pagehide", handlePageHide);
			flushProgress({ requireInteraction: false });
		};
	}, [flushProgress]);

	useEffect(() => {
		if (strategy.getScrollDirection() !== "vertical") return;
		scrollCursorIntoView(safeCursor);
	}, [currentBackendChapter?.id, readMode, scrollCursorIntoView]);

	const handleScrollTracking = useCallback(() => {
		if (strategy.getScrollDirection() !== "vertical") return;
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
		setCursor((previous) =>
			previous === closestIndex ? previous : closestIndex,
		);
	}, [strategy]);

	useEffect(() => {
		if (strategy.getScrollDirection() !== "vertical" || totalBlocks === 0)
			return;
		const options: AddEventListenerOptions = { passive: true };
		window.addEventListener("scroll", handleScrollTracking, options);
		return () => window.removeEventListener("scroll", handleScrollTracking);
	}, [handleScrollTracking, strategy, totalBlocks]);

	const handleModeChange = useCallback(
		(nextMode: ReadMode) => {
			if (nextMode === readMode) return;
			userInteractedRef.current = true;
			setReadMode(nextMode);
			if (onModeChange) {
				Promise.resolve(onModeChange(nextMode)).catch(() => undefined);
			}
		},
		[onModeChange, readMode],
	);

	const handleCursorStep = useCallback(
		(nextCursor: number) => {
			userInteractedRef.current = true;
			setCursor(clampCursor(nextCursor, totalBlocks));
		},
		[totalBlocks],
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
		[flushProgress, onChapterChange, resolvedChapterId],
	);

	const loadingContent = !currentBackendChapter && chapterSummaries.length > 0;
	const progressPercent =
		totalBlocks > 0 ? Math.round(((safeCursor + 1) / totalBlocks) * 100) : 0;
	const modeList: ReadMode[] = ["day", "night", "scroll", "page-flip"];

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minHeight: "calc(100vh - 40px)",
				background: theme.background,
				color: theme.color,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					height: 40,
					borderBottom: `2px solid ${theme.borderColor}`,
					background: theme.pageBackground,
					position: "sticky",
					top: 40,
					zIndex: 50,
					flexShrink: 0,
				}}
			>
				<select
					value={resolvedChapterId ?? ""}
					onChange={(event) =>
						navigateToChapter(parseChapterId(event.target.value))
					}
					aria-label="Chọn chương"
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.68rem",
						fontWeight: 600,
						background: theme.pageBackground,
						color: theme.color,
						border: "none",
						borderRight: `1px solid ${theme.borderColor}`,
						padding: "0 14px",
						height: "100%",
						cursor: "pointer",
						outline: "none",
						minWidth: 240,
					}}
				>
					{chapterSummaries.map((chapter) => {
						const chapterId = parseChapterId(chapter.id);
						return (
							<option key={chapter.id} value={chapterId ?? ""}>
								Ch.{chapter.number} — {chapter.title}
							</option>
						);
					})}
				</select>

				<div
					style={{
						flex: 1,
						padding: "0 16px",
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.63rem",
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
								height: "100%",
								background: theme.progressColor,
								transition: "width 0.25s",
							}}
						/>
					</div>
					<span>
						{loadingContent
							? "Đang tải…"
							: `${safeCursor + 1}/${Math.max(totalBlocks, 1)} đoạn`}
					</span>
				</div>

				<div
					style={{
						display: "flex",
						borderLeft: `1px solid ${theme.borderColor}`,
						height: "100%",
					}}
				>
					{modeList.map((mode) => {
						const isActive = readMode === mode;
						return (
							<button
								key={mode}
								onClick={() => handleModeChange(mode)}
								title={strategies[mode].description}
								aria-label={`Chế độ đọc: ${strategies[mode].labelVI}`}
								aria-pressed={isActive}
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.62rem",
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									border: "none",
									borderRight: `1px solid ${theme.borderColor}`,
									background: isActive ? theme.color : "transparent",
									color: isActive ? theme.pageBackground : theme.mutedColor,
									padding: "0 12px",
									cursor: "pointer",
									transition: "all 0.15s",
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
							key={`${currentBackendChapter?.id ?? "chapter"}-${index}`}
							style={{
								...strategy.getPageStyle(index, blocks.length),
								display: strategy.isBlockVisible(index, safeCursor)
									? undefined
									: "none",
							}}
						>
							<div style={strategy.getContentStyle()}>{text}</div>
							<span
								style={{
									position: "absolute",
									bottom: 8,
									right: 10,
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.58rem",
									color: theme.pageBackground,
									background: theme.color,
									padding: "2px 6px",
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
						display: "flex",
						alignItems: "center",
						gap: 16,
						justifyContent: "center",
						padding: "12px 0",
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.72rem",
						color: theme.mutedColor,
					}}
				>
					<button
						className="btn btn-primary"
						onClick={() => handleCursorStep(strategy.prevCursor(safeCursor))}
						disabled={safeCursor === 0}
						aria-label="Đoạn trước"
						style={{
							padding: "7px 18px",
							opacity: safeCursor === 0 ? 0.3 : 1,
							cursor: safeCursor === 0 ? "not-allowed" : "pointer",
						}}
					>
						← Trước
					</button>
					<span>
						Đoạn {safeCursor + 1} / {Math.max(blocks.length, 1)}
					</span>
					<button
						className="btn btn-primary"
						onClick={() =>
							handleCursorStep(strategy.nextCursor(safeCursor, blocks.length))
						}
						disabled={safeCursor >= blocks.length - 1}
						aria-label="Đoạn sau"
						style={{
							padding: "7px 18px",
							opacity: safeCursor >= blocks.length - 1 ? 0.3 : 1,
							cursor:
								safeCursor >= blocks.length - 1 ? "not-allowed" : "pointer",
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
					borderTop: `2px solid ${theme.borderColor}`,
					background: theme.pageBackground,
					fontFamily: "'IBM Plex Mono', monospace",
					fontSize: "0.7rem",
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
						cursor: previousSummary ? "pointer" : "not-allowed",
					}}
				>
					← Chương trước
				</button>
				<span>
					Chương {currentSummary?.number ?? currentSummaryIndex + 1} /{" "}
					{chapterSummaries.length}
				</span>
				<button
					className="btn btn-primary"
					onClick={() => navigateToChapter(parseChapterId(nextSummary?.id))}
					disabled={!nextSummary}
					aria-label="Chương sau"
					style={{
						opacity: nextSummary ? 1 : 0.3,
						cursor: nextSummary ? "pointer" : "not-allowed",
					}}
				>
					Chương sau →
				</button>
			</div>
		</div>
	);
}
