// ─── SINGLETON PATTERN ───────────────────────────────────────────────────────
// ReadProgressManager: single instance managing all read progress & bookmarks.

import { apiClient } from "@/lib/api";
import type { ReadProgress, UserComment } from "@/types";
import type { BackendReadMode, ReadingProgress } from "@/types/api";

type ProgressEvent = {
	type:
		| "progress"
		| "bookmark"
		| "comment"
		| "mode"
		| "rating"
		| "notification"
		| "subscription";
	payload: unknown;
};
type Observer = (event: ProgressEvent) => void;

// ─── OBSERVER PATTERN ────────────────────────────────────────────────────────
class EventBus {
	private observers: Observer[] = [];
	subscribe(fn: Observer) {
		this.observers.push(fn);
		return () => {
			this.observers = this.observers.filter((o) => o !== fn);
		};
	}
	emit(event: ProgressEvent) {
		this.observers.forEach((fn) => fn(event));
	}
}

export const eventBus = new EventBus();

class ReadProgressManager {
	private static instance: ReadProgressManager;
	private progress: Record<string, ReadProgress> = {};
	private backendProgress: Record<number, ReadingProgress> = {};
	private backendModes: Record<string, BackendReadMode> = {};
	private bookmarks: string[] = [];
	private comments: UserComment[] = [];

	private constructor() {
		if (typeof window !== "undefined") {
			this.progress = JSON.parse(localStorage.getItem("mk_progress") || "{}");
			this.bookmarks = JSON.parse(localStorage.getItem("mk_bookmarks") || "[]");
			this.comments = JSON.parse(localStorage.getItem("mk_comments") || "[]");
		}
	}

	static getInstance(): ReadProgressManager {
		if (!ReadProgressManager.instance) {
			ReadProgressManager.instance = new ReadProgressManager();
		}
		return ReadProgressManager.instance;
	}

	private getModeKey(storyId?: number): string {
		return storyId == null ? "global" : `story:${storyId}`;
	}

	// Progress
	saveProgress(
		mangaId: string,
		chapterIndex: number,
		pageIndex: number,
		totalPages: number,
	) {
		this.progress[mangaId] = {
			mangaId,
			chapterIndex,
			pageIndex,
			totalPages,
			updatedAt: Date.now(),
		};
		localStorage.setItem("mk_progress", JSON.stringify(this.progress));
		eventBus.emit({ type: "progress", payload: this.progress[mangaId] });
	}
	getProgress(mangaId: string): ReadProgress | null {
		return this.progress[mangaId] ?? null;
	}
	getAllProgress(): Record<string, ReadProgress> {
		return this.progress;
	}

	getBackendProgress(storyId: number): ReadingProgress | null {
		return this.backendProgress[storyId] ?? null;
	}

	async loadBackendProgress(
		userId: number,
		storyId: number,
	): Promise<ReadingProgress> {
		const progress = await apiClient.getProgress(userId, storyId);
		this.backendProgress[storyId] = progress;
		eventBus.emit({ type: "progress", payload: progress });
		return progress;
	}

	async saveBackendProgress(
		userId: number,
		storyId: number,
		chapterId: number,
		scrollPosition: number,
		readingMode: BackendReadMode,
	): Promise<ReadingProgress> {
		const progress = await apiClient.saveProgress({
			userId,
			storyId,
			chapterId,
			scrollPosition,
			readingMode,
		});
		this.backendProgress[storyId] = progress;
		this.backendModes[this.getModeKey(storyId)] = progress.readingMode;
		eventBus.emit({ type: "progress", payload: progress });
		eventBus.emit({
			type: "mode",
			payload: { storyId, mode: progress.readingMode },
		});
		return progress;
	}

	getBackendReadingMode(storyId?: number): BackendReadMode | null {
		return this.backendModes[this.getModeKey(storyId)] ?? null;
	}

	async loadBackendReadingMode(
		userId: number,
		storyId?: number,
	): Promise<BackendReadMode> {
		const { mode } = await apiClient.getReadingMode(userId, storyId);
		this.backendModes[this.getModeKey(storyId)] = mode;
		eventBus.emit({ type: "mode", payload: { storyId, mode } });
		return mode;
	}

	async saveBackendReadingMode(
		userId: number,
		mode: BackendReadMode,
		storyId?: number,
	): Promise<BackendReadMode> {
		const response = await apiClient.setReadingMode({ userId, storyId, mode });
		this.backendModes[this.getModeKey(storyId)] = response.mode;
		eventBus.emit({ type: "mode", payload: { storyId, mode: response.mode } });
		return response.mode;
	}

	// Bookmarks
	toggleBookmark(mangaId: string): boolean {
		const idx = this.bookmarks.indexOf(mangaId);
		if (idx >= 0) this.bookmarks.splice(idx, 1);
		else this.bookmarks.push(mangaId);
		localStorage.setItem("mk_bookmarks", JSON.stringify(this.bookmarks));
		eventBus.emit({
			type: "bookmark",
			payload: { mangaId, saved: this.isBookmarked(mangaId) },
		});
		return this.isBookmarked(mangaId);
	}
	isBookmarked(mangaId: string): boolean {
		return this.bookmarks.includes(mangaId);
	}
	getBookmarks(): string[] {
		return [...this.bookmarks];
	}

	// Comments
	addComment(mangaId: string, text: string, user: string): UserComment {
		const c: UserComment = {
			id: crypto.randomUUID(),
			mangaId,
			user,
			text,
			createdAt: Date.now(),
		};
		this.comments.push(c);
		localStorage.setItem("mk_comments", JSON.stringify(this.comments));
		eventBus.emit({ type: "comment", payload: c });
		return c;
	}
	getComments(mangaId: string): UserComment[] {
		return this.comments
			.filter((c) => c.mangaId === mangaId)
			.sort((a, b) => b.createdAt - a.createdAt);
	}
	getAllComments(): UserComment[] {
		return [...this.comments].sort((a, b) => b.createdAt - a.createdAt);
	}
}

export const progressManager = {
	get: () => ReadProgressManager.getInstance(),
};
