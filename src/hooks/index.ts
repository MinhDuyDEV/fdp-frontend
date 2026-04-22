"use client";
import { useCallback, useEffect, useState } from "react";
import { apiClient, normalizePaginatedA, normalizePaginatedB } from "@/lib/api";
import { eventBus, progressManager } from "@/lib/progressManager";
import type { ReadProgress, UserComment } from "@/types";
import type {
	BackendReadMode,
	Chapter,
	Comment,
	Rating,
	ReadingProgress,
	Story,
} from "@/types/api";

// ── Auth helpers ─────────────────────────────────────────────────────────────
function getUserId(): number | null {
	if (typeof window === "undefined") return null;
	const usr = localStorage.getItem("mk_user");
	if (usr) {
		try {
			return JSON.parse(usr).id;
		} catch {
			/* ignore */
		}
	}
	return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW API-driven hooks — use these in Tasks 5-7 page rewrites
// ═══════════════════════════════════════════════════════════════════════════════

export function useBackendStories(genre?: string, page = 1, limit = 20) {
	const [stories, setStories] = useState<Story[]>([]);
	const [meta, setMeta] = useState({
		totalItems: 0,
		itemsPerPage: limit,
		totalPages: 0,
		currentPage: page,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancel = false;
		setIsLoading(true);
		apiClient
			.fetchStories({ genre, page, limit })
			.then((raw) => {
				if (cancel) return;
				const n = normalizePaginatedA<Story>(raw);
				setStories(n.data);
				setMeta(n.meta);
			})
			.catch((e: Error) => {
				if (!cancel) setError(e.message);
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [genre, page, limit]);

	return { stories, meta, isLoading, error };
}

export function useBackendStory(id: number | null) {
	const [story, setStory] = useState<Story | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (id == null) return;
		let cancel = false;
		setIsLoading(true);
		apiClient
			.fetchStory(id)
			.then((s) => {
				if (!cancel) setStory(s);
			})
			.catch((e: Error) => {
				if (!cancel) setError(e.message);
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [id]);

	return { story, isLoading, error };
}

export function useBackendChapters(
	storyId: number | null,
	page = 1,
	limit = 20,
) {
	const [chapters, setChapters] = useState<Chapter[]>([]);
	const [meta, setMeta] = useState({
		totalItems: 0,
		itemsPerPage: limit,
		totalPages: 0,
		currentPage: page,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (storyId == null) return;
		let cancel = false;
		setIsLoading(true);
		apiClient
			.fetchChapters(storyId, { page, limit })
			.then((raw) => {
				if (cancel) return;
				const n = normalizePaginatedA<Chapter>(raw);
				setChapters(n.data);
				setMeta(n.meta);
			})
			.catch((e: Error) => {
				if (!cancel) setError(e.message);
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [storyId, page, limit]);

	return { chapters, meta, isLoading, error };
}

export function useBackendProgress(storyId: number) {
	const [progress, setProgress] = useState<ReadingProgress | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const userId = getUserId();
		if (!userId) return;
		let cancel = false;
		setIsLoading(true);
		apiClient
			.getProgress(userId, storyId)
			.then((p) => {
				if (!cancel) setProgress(p);
			})
			.catch(() => {
				/* 404 = no progress */
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [storyId]);

	const save = useCallback(
		async (
			chapterId: number,
			scrollPosition: number,
			readingMode: BackendReadMode,
		) => {
			const userId = getUserId();
			if (!userId) return;
			const p = await apiClient.saveProgress({
				userId,
				storyId,
				chapterId,
				scrollPosition,
				readingMode,
			});
			setProgress(p);
			eventBus.emit({ type: "progress", payload: p });
		},
		[storyId],
	);

	return { progress, isLoading, error, save };
}

export function useBackendBookmark(storyId: number) {
	const key = `mk_bookmark_${storyId}`;
	const [saved, setSaved] = useState(false);
	useEffect(() => {
		setSaved(localStorage.getItem(key) === "1");
	}, [key]);
	const toggle = useCallback(() => {
		setSaved((prev) => {
			const next = !prev;
			localStorage.setItem(key, next ? "1" : "0");
			return next;
		});
	}, [key]);
	return { saved, toggle };
}

export function useBackendComments(storyId: number) {
	const [comments, setComments] = useState<Comment[]>([]);
	const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancel = false;
		setIsLoading(true);
		apiClient
			.fetchComments(storyId)
			.then((raw) => {
				if (cancel) return;
				const n = normalizePaginatedB<Comment>(raw);
				setComments(n.data);
				setMeta(n);
			})
			.catch((e: Error) => {
				if (!cancel) setError(e.message);
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [storyId]);

	return { comments, meta, isLoading, error };
}

export function useBackendRatings(storyId: number) {
	const [ratings, setRatings] = useState<Rating[]>([]);
	const [summary, setSummary] = useState<{
		storyId: number;
		averageScore: number;
		totalRatings: number;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancel = false;
		setIsLoading(true);
		Promise.all([
			apiClient.fetchRatings(storyId),
			apiClient.fetchRatingSummary(storyId).catch(() => null),
		])
			.then(([rawRatings, sum]) => {
				if (cancel) return;
				const n = normalizePaginatedB<Rating>(rawRatings);
				setRatings(n.data);
				if (sum) setSummary(sum);
			})
			.catch((e: Error) => {
				if (!cancel) setError(e.message);
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [storyId]);

	const setRating = useCallback(
		async (score: number) => {
			const userId = getUserId();
			if (!userId) return;
			await fetch("http://localhost:3000/ratings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
				},
				body: JSON.stringify({ score, userId, storyId }),
			}).catch(() => null);
		},
		[storyId],
	);

	return { ratings, summary, isLoading, error, setRating };
}

export function useBackendReadingMode(storyId?: number) {
	const [mode, setModeState] = useState<BackendReadMode>("day");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const userId = getUserId();
		if (!userId) return;
		let cancel = false;
		setIsLoading(true);
		apiClient
			.getReadingMode(userId, storyId)
			.then((m) => {
				if (!cancel) setModeState(m.mode);
			})
			.catch(() => {
				/* ignore */
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});
		return () => {
			cancel = true;
		};
	}, [storyId]);

	const setMode = useCallback(
		async (newMode: BackendReadMode) => {
			const userId = getUserId();
			if (!userId) return;
			await apiClient.setReadingMode({ userId, storyId, mode: newMode });
			setModeState(newMode);
		},
		[storyId],
	);

	return { mode, isLoading, setMode };
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export type Theme = "day" | "sepia" | "night";

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>("day");

	useEffect(() => {
		const stored = (localStorage.getItem("mk_theme") as Theme) ?? "day";
		setThemeState(stored);
		document.documentElement.setAttribute("data-theme", stored);
	}, []);

	const setTheme = useCallback((t: Theme) => {
		setThemeState(t);
		document.documentElement.setAttribute("data-theme", t);
		localStorage.setItem("mk_theme", t);
	}, []);

	return { theme, setTheme };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LEGACY hooks — old signatures so existing pages/components still compile
//  These will be replaced when pages are rewritten in Tasks 5-7
// ═══════════════════════════════════════════════════════════════════════════════

export function useProgress(mangaId: string) {
	const mgr = progressManager.get();
	const [progress, setProgress] = useState<ReadProgress | null>(null);
	useEffect(() => {
		setProgress(mgr.getProgress(mangaId));
		const unsub = eventBus.subscribe((e) => {
			if (e.type === "progress") setProgress(mgr.getProgress(mangaId));
		});
		return unsub;
	}, [mangaId]);
	const save = useCallback(
		(chapterIndex: number, pageIndex: number, totalPages: number) => {
			mgr.saveProgress(mangaId, chapterIndex, pageIndex, totalPages);
		},
		[mangaId],
	);
	return { progress, save };
}

export function useBookmark(mangaId: string) {
	const mgr = progressManager.get();
	const [saved, setSaved] = useState(false);
	useEffect(() => {
		setSaved(mgr.isBookmarked(mangaId));
		const unsub = eventBus.subscribe((e) => {
			if (e.type === "bookmark") setSaved(mgr.isBookmarked(mangaId));
		});
		return unsub;
	}, [mangaId]);
	const toggle = useCallback(() => mgr.toggleBookmark(mangaId), [mangaId]);
	return { saved, toggle };
}

export function useAllBookmarks() {
	const mgr = progressManager.get();
	const [bookmarks, setBookmarks] = useState<string[]>([]);
	useEffect(() => {
		setBookmarks(mgr.getBookmarks());
		const unsub = eventBus.subscribe((e) => {
			if (e.type === "bookmark") setBookmarks(mgr.getBookmarks());
		});
		return unsub;
	}, []);
	return bookmarks;
}

export function useComments(mangaId: string) {
	const mgr = progressManager.get();
	const [comments, setComments] = useState<UserComment[]>([]);
	useEffect(() => {
		setComments(mgr.getComments(mangaId));
		const unsub = eventBus.subscribe((e) => {
			if (e.type === "comment") setComments(mgr.getComments(mangaId));
		});
		return unsub;
	}, [mangaId]);
	const post = useCallback(
		(text: string, user: string) => mgr.addComment(mangaId, text, user),
		[mangaId],
	);
	return { comments, post };
}

export function useAllComments() {
	const mgr = progressManager.get();
	const [comments, setComments] = useState<UserComment[]>([]);
	useEffect(() => {
		setComments(mgr.getAllComments());
		const unsub = eventBus.subscribe((e) => {
			if (e.type === "comment") setComments(mgr.getAllComments());
		});
		return unsub;
	}, []);
	return comments;
}

export function useRating(mangaId: string) {
	const [rating, setRatingState] = useState(0);
	useEffect(() => {
		const stored = JSON.parse(localStorage.getItem("mk_ratings") || "{}");
		setRatingState(stored[mangaId] ?? 0);
	}, [mangaId]);
	const setRating = useCallback(
		(stars: number) => {
			const stored = JSON.parse(localStorage.getItem("mk_ratings") || "{}");
			stored[mangaId] = stars;
			localStorage.setItem("mk_ratings", JSON.stringify(stored));
			setRatingState(stars);
		},
		[mangaId],
	);
	return { rating, setRating };
}

export function useAllRatings() {
	const [ratings, setRatings] = useState<Record<string, number>>({});
	useEffect(() => {
		setRatings(JSON.parse(localStorage.getItem("mk_ratings") || "{}"));
	}, []);
	return ratings;
}
