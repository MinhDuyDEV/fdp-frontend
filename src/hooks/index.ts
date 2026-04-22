import { useCallback, useEffect, useMemo, useState } from "react";
import {
	apiClient,
	getToken,
	normalizePaginatedA,
	normalizePaginatedB,
} from "@/lib/api";
// ── import adapter helpers ───────────────────────────────────────────────────
import { commentToUserComment } from "@/lib/data";
import { eventBus, progressManager } from "@/lib/progressManager";
import type { ReadProgress, UserComment } from "@/types";
import type {
	BackendReadMode,
	Chapter,
	Comment,
	Notification,
	Rating,
	RatingSummary,
	ReadingProgress,
	Story,
} from "@/types/api";

// ── Auth helpers ─────────────────────────────────────────────────────────────
function decodeJwtPayload(
	token: string,
): { sub: number; name?: string } | null {
	try {
		const base64 = token.split(".")[1];
		if (!base64) return null;
		const base64Standard = base64
			.replace(/-/g, "+")
			.replace(/_/g, "/")
			.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
		const json = atob(base64Standard);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

function getUserId(): number | null {
	if (typeof window === "undefined") return null;
	const token = getToken();
	if (!token) return null;
	const payload = decodeJwtPayload(token);
	if (typeof payload?.sub === "number") return payload.sub;
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

export function useBackendChapter(id: number | null) {
	const [chapter, setChapter] = useState<Chapter | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (id == null) {
			setChapter(null);
			setError(null);
			setIsLoading(false);
			return;
		}

		let cancel = false;
		setIsLoading(true);
		setError(null);
		setChapter(null);

		apiClient
			.fetchChapter(id)
			.then((nextChapter) => {
				if (!cancel) setChapter(nextChapter);
			})
			.catch((e: Error) => {
				if (!cancel) {
					setChapter(null);
					setError(e.message);
				}
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});

		return () => {
			cancel = true;
		};
	}, [id]);

	return { chapter, isLoading, error };
}

export function useBackendProgress(storyId: number) {
	const mgr = progressManager.get();
	const [progress, setProgress] = useState<ReadingProgress | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const userId = getUserId();
		if (!userId) return;
		let cancel = false;
		setIsLoading(true);
		setProgress(mgr.getBackendProgress(storyId));
		mgr
			.loadBackendProgress(userId, storyId)
			.then((p) => {
				if (!cancel) setProgress(p);
			})
			.catch((e: Error) => {
				if (!cancel && e.message !== "Not Found") {
					setError(e.message);
				}
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});

		const unsub = eventBus.subscribe((event) => {
			if (event.type !== "progress") return;
			const payload = event.payload as ReadingProgress;
			if (payload.storyId === storyId) {
				setProgress(payload);
			}
		});
		return () => {
			cancel = true;
			unsub();
		};
	}, [mgr, storyId]);

	const save = useCallback(
		async (
			chapterId: number,
			scrollPosition: number,
			readingMode: BackendReadMode,
		) => {
			const userId = getUserId();
			if (!userId) return;
			const p = await mgr.saveBackendProgress(
				userId,
				storyId,
				chapterId,
				scrollPosition,
				readingMode,
			);
			setProgress(p);
		},
		[mgr, storyId],
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
	const [commentsBackend, setComments] = useState<Comment[]>([]);
	const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const fetchComments = useCallback(
		async (cancelRef?: { cancel: boolean }) => {
			const cancel = cancelRef?.cancel ?? false;
			setIsLoading(true);
			try {
				const raw = await apiClient.fetchComments(storyId);
				if (cancelRef?.cancel) return;
				const n = normalizePaginatedB<Comment>(raw);
				setComments(n.data);
				setMeta(n);
			} catch (e: unknown) {
				if (!cancel) setError((e as Error).message);
			} finally {
				if (!cancel) setIsLoading(false);
			}
		},
		[storyId],
	);

	useEffect(() => {
		const cancelRef = { cancel: false };
		fetchComments(cancelRef);
		return () => {
			cancelRef.cancel = true;
		};
	}, [fetchComments]);

	// Expose frontend UserComment[] so pages don't break
	const comments: UserComment[] = useMemo(
		() => commentsBackend.map(commentToUserComment),
		[commentsBackend],
	);

	const post = useCallback(
		async (content: string) => {
			const userId = getUserId();
			if (!userId) return;
			setMutationError(null);
			try {
				const c = await apiClient.createComment({
					content,
					userId,
					storyId,
				});
				setComments((prev) => [c, ...prev]);
				setMeta((m) => ({ ...m, total: m.total + 1 }));
				eventBus.emit({ type: "comment", payload: c });
			} catch (e: unknown) {
				setMutationError((e as Error).message);
			}
		},
		[storyId],
	);

	const editComment = useCallback(
		async (id: number, content: string) => {
			const userId = getUserId();
			if (!userId) return;
			setMutationError(null);
			try {
				const c = await apiClient.updateComment(id, { content });
				setComments((prev) => prev.map((item) => (item.id === id ? c : item)));
				eventBus.emit({ type: "comment", payload: c });
			} catch (e: unknown) {
				setMutationError((e as Error).message);
			}
		},
		[storyId],
	);

	const removeComment = useCallback(
		async (id: number) => {
			const userId = getUserId();
			if (!userId) return;
			setMutationError(null);
			try {
				await apiClient.deleteComment(id);
				setComments((prev) => prev.filter((item) => item.id !== id));
				setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
				eventBus.emit({ type: "comment", payload: { id } });
			} catch (e: unknown) {
				setMutationError((e as Error).message);
			}
		},
		[storyId],
	);

	return {
		comments,
		meta,
		isLoading,
		error,
		mutationError,
		post,
		editComment,
		removeComment,
	};
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
	const [mutationLoading, setMutationLoading] = useState(false);
	const [mutationError, setMutationError] = useState<string | null>(null);

	const userRatingObject = useMemo(() => {
		const userId = getUserId();
		if (!userId || !ratings.length) return null;
		return ratings.find((r) => r.userId === userId) ?? null;
	}, [ratings]);

	const userRatingId = userRatingObject?.id ?? null;
	const userRating = userRatingObject?.score ?? 0;

	const fetchRatings = useCallback(
		async (cancelRef?: { cancel: boolean }) => {
			const cancel = cancelRef?.cancel ?? false;
			setIsLoading(true);
			try {
				const [rawRatings, sum] = await Promise.all([
					apiClient.fetchRatings(storyId),
					apiClient.fetchRatingSummary(storyId).catch(() => null),
				]);
				if (cancelRef?.cancel) return;
				const n = normalizePaginatedB<Rating>(rawRatings);
				setRatings(n.data);
				if (sum) setSummary(sum);
			} catch (e: unknown) {
				if (!cancel) setError((e as Error).message);
			} finally {
				if (!cancel) setIsLoading(false);
			}
		},
		[storyId],
	);

	useEffect(() => {
		const cancelRef = { cancel: false };
		fetchRatings(cancelRef);
		return () => {
			cancelRef.cancel = true;
		};
	}, [fetchRatings]);

	const setRating = useCallback(
		async (score: number) => {
			const userId = getUserId();
			if (!userId) return;
			setMutationLoading(true);
			setMutationError(null);
			try {
				// Upsert: create new rating first to avoid data loss on failure
				const c = await apiClient.createRating({ score, userId, storyId });
				if (userRatingId != null && userRatingId !== c.id) {
					await apiClient.deleteRating(userRatingId).catch(() => undefined);
				}
				setRatings((prev) => {
					const withoutOld = prev.filter((r) => r.userId !== userId);
					return [c, ...withoutOld];
				});
				eventBus.emit({
					type: "rating",
					payload: { storyId, score, userId },
				});
			} catch (e: unknown) {
				setMutationError((e as Error).message);
				// Refetch to restore correct state after failure
				fetchRatings();
			} finally {
				setMutationLoading(false);
			}
		},
		[storyId, userRatingId],
	);

	const clearRating = useCallback(async () => {
		if (userRatingId == null) return;
		const userId = getUserId();
		if (!userId) return;
		setMutationLoading(true);
		setMutationError(null);
		try {
			await apiClient.deleteRating(userRatingId);
			setRatings((prev) => prev.filter((r) => r.id !== userRatingId));
			eventBus.emit({
				type: "rating",
				payload: { storyId, score: null, userId },
			});
		} catch (e: unknown) {
			setMutationError((e as Error).message);
		} finally {
			setMutationLoading(false);
		}
	}, [storyId, userRatingId, fetchRatings]);

	const refresh = useCallback(() => {
		fetchRatings();
	}, [fetchRatings]);

	return {
		rating: userRatingObject?.score ?? 0,
		average: summary?.averageScore ?? 0,
		totalRatings: summary?.totalRatings ?? 0,
		ratingId: userRatingId,
		summary,
		isLoading,
		error,
		mutationLoading,
		setRating,
		clearRating,
	};
}

// ── Notification Badge (lightweight — only unread count, no list fetching) ─────
export function useNotificationBadge(userId?: number) {
	const [unreadCount, setUnreadCount] = useState(0);
	const fetchUnreadCount = useCallback(async () => {
		if (userId == null) return;
		try {
			const raw = await apiClient.fetchUserNotifications(userId, {
				unreadOnly: true,
				page: 1,
				limit: 1,
			});
			const n = normalizePaginatedB<Notification>(raw);
			setUnreadCount(n.total);
		} catch {
			/* silently fail */
		}
	}, [userId]);

	useEffect(() => {
		if (userId == null) return;
		fetchUnreadCount();
		const interval = setInterval(fetchUnreadCount, 60_000);
		return () => clearInterval(interval);
	}, [fetchUnreadCount, userId]);

	return { unreadCount };
}

// ── Full notification inbox (list + mark read) — used by NotificationsPanel ──────
export function useBackendNotifications(userId?: number) {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);

	const fetchNotifications = useCallback(
		async (unreadOnly = false, page = 1, limit = 20) => {
			if (userId == null) return;
			setIsLoading(true);
			try {
				const raw = await apiClient.fetchUserNotifications(userId, {
					page,
					limit,
					unreadOnly,
				});
				const n = normalizePaginatedB<Notification>(raw);
				setNotifications(n.data);
				setTotal(n.total);
				if (unreadOnly) setUnreadCount(n.total);
			} catch (e: unknown) {
				setError((e as Error).message);
			} finally {
				setIsLoading(false);
			}
		},
		[userId],
	);

	const markRead = useCallback(async (id: number) => {
		try {
			await apiClient.markNotificationRead(id);
			setNotifications((prev) =>
				prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
			);
			setUnreadCount((c) => Math.max(0, c - 1));
			eventBus.emit({ type: "notification", payload: { id, isRead: true } });
		} catch (e: unknown) {
			setError((e as Error).message);
		}
	}, []);

	return {
		notifications,
		unreadCount,
		total,
		isLoading,
		error,
		fetchNotifications,
		markRead,
	};
}

export function useBackendSubscription(storyId: number) {
	const [subscribed, setSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Restore last-known local state
	useEffect(() => {
		const userId = getUserId();
		if (!userId) return;
		const key = `mk_subscription_${userId}_${storyId}`;
		const stored = localStorage.getItem(key);
		if (stored === "1") setSubscribed(true);
	}, [storyId]);

	const toggle = useCallback(async () => {
		const userId = getUserId();
		if (!userId) return;
		setIsLoading(true);
		setError(null);
		const next = !subscribed;
		try {
			if (next) {
				await apiClient.subscribeToStory({ userId, storyId });
			} else {
				await apiClient.unsubscribeFromStory({ userId, storyId });
			}
			setSubscribed(next);
			const key = `mk_subscription_${userId}_${storyId}`;
			localStorage.setItem(key, next ? "1" : "0");
			eventBus.emit({
				type: "subscription",
				payload: { storyId, userId, subscribed: next },
			});
		} catch (e: unknown) {
			setError((e as Error).message);
		} finally {
			setIsLoading(false);
		}
	}, [storyId, subscribed]);

	return { subscribed, isLoading, error, toggle };
}

export function useBackendReadingMode(storyId?: number) {
	const mgr = progressManager.get();
	const [mode, setModeState] = useState<BackendReadMode>("day");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const userId = getUserId();
		if (!userId) return;
		let cancel = false;
		setIsLoading(true);
		const cachedMode = mgr.getBackendReadingMode(storyId);
		if (cachedMode) {
			setModeState(cachedMode);
		}
		mgr
			.loadBackendReadingMode(userId, storyId)
			.then((loadedMode) => {
				if (!cancel) setModeState(loadedMode);
			})
			.catch(() => {
				/* ignore */
			})
			.finally(() => {
				if (!cancel) setIsLoading(false);
			});

		const unsub = eventBus.subscribe((event) => {
			if (event.type !== "mode") return;
			const payload = event.payload as {
				storyId?: number;
				mode: BackendReadMode;
			};
			if ((payload.storyId ?? undefined) === (storyId ?? undefined)) {
				setModeState(payload.mode);
			}
		});
		return () => {
			cancel = true;
			unsub();
		};
	}, [mgr, storyId]);

	const setMode = useCallback(
		async (newMode: BackendReadMode) => {
			const userId = getUserId();
			if (!userId) return;
			const savedMode = await mgr.saveBackendReadingMode(
				userId,
				newMode,
				storyId,
			);
			setModeState(savedMode);
		},
		[mgr, storyId],
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
