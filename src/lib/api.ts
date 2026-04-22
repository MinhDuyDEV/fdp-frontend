import type {
	BackendReadMode,
	Chapter,
	Comment,
	PaginatedResponseA as PaginatedAType,
	PaginatedResponseB as PaginatedBType,
	Rating,
	ReadingProgress,
	Story,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

// ─── Auth state & 401 handler ──────────────────────────────────────────────────

let _unauthorizedHandler: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
	_unauthorizedHandler = handler;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function setToken(token: string) {
	if (typeof window !== "undefined")
		localStorage.setItem("access_token", token);
}

export function getToken(): string | null {
	if (typeof window !== "undefined")
		return localStorage.getItem("access_token");
	return null;
}

export function clearToken() {
	if (typeof window !== "undefined") localStorage.removeItem("access_token");
}

// ─── Core fetch wrapper (backward-compat + raw helpers) ───────────────────────

async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
	const token = getToken();
	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
	});
	if (res.status === 401) {
		clearToken();
		if (typeof window !== "undefined" && _unauthorizedHandler) {
			_unauthorizedHandler();
		} else if (typeof window !== "undefined") {
			window.location.href = "/login";
		}
		throw new Error("Unauthorized");
	}
	if (!res.ok) {
		const err = await res.json().catch(() => ({ message: res.statusText }));
		throw new Error(err.message || `HTTP ${res.status}`);
	}
	return res.json();
}

/** Object-style API (previous bead pattern) — AuthContext uses api.post(...) */
export const api = {
	get: <T>(path: string) => fetcher<T>(path),
	post: <T>(path: string, body?: unknown, options?: RequestInit) =>
		fetcher<T>(path, {
			...options,
			method: "POST",
			body: JSON.stringify(body),
		}),
	put: <T>(path: string, body?: unknown) =>
		fetcher<T>(path, { method: "PUT", body: JSON.stringify(body) }),
	delete: <T>(path: string) => fetcher<T>(path, { method: "DELETE" }),
	/**
	 * Low-level typed fetch (new pattern used by internal client).
	 * If AuthContext uses this signature, switch to api.get / api.post above.
	 */
	raw: fetcher,
};

// ─── Pagination helpers ───────────────────────────────────────────────────────

export function normalizePaginatedA<T>(res: PaginatedAType<T>): {
	data: T[];
	meta: {
		totalItems: number;
		itemsPerPage: number;
		totalPages: number;
		currentPage: number;
	};
} {
	return {
		data: res.data ?? [],
		meta: res.meta ?? {
			totalItems: 0,
			itemsPerPage: 20,
			totalPages: 0,
			currentPage: 1,
		},
	};
}

export function normalizePaginatedB<T>(res: PaginatedBType<T>): {
	data: T[];
	total: number;
	page: number;
	limit: number;
} {
	return {
		data: res.data ?? [],
		total: res.total ?? 0,
		page: res.page ?? 1,
		limit: res.limit ?? 20,
	};
}

// ─── API Client (typed wrappers used by hooks) ──────────────────────────────

export const apiClient = {
	fetchStories(params?: {
		genre?: string;
		page?: number;
		limit?: number;
	}): Promise<PaginatedAType<Story>> {
		const qs = new URLSearchParams();
		if (params?.genre) qs.set("genre", params.genre);
		if (params?.page) qs.set("page", String(params.page));
		if (params?.limit) qs.set("limit", String(params.limit));
		return fetcher(`/stories?${qs.toString()}`);
	},

	fetchStory(id: number): Promise<Story> {
		return fetcher(`/stories/${id}`);
	},

	fetchChapters(
		storyId: number,
		params?: { page?: number; limit?: number },
	): Promise<PaginatedAType<Chapter>> {
		const qs = new URLSearchParams();
		if (params?.page) qs.set("page", String(params.page));
		if (params?.limit) qs.set("limit", String(params.limit));
		return fetcher(`/stories/${storyId}/chapters?${qs.toString()}`);
	},

	fetchChapter(id: number): Promise<Chapter> {
		return fetcher(`/chapters/${id}`);
	},

	fetchComments(
		storyId: number,
		params?: { page?: number; limit?: number },
	): Promise<PaginatedBType<Comment>> {
		const qs = new URLSearchParams();
		if (params?.page) qs.set("page", String(params.page));
		if (params?.limit) qs.set("limit", String(params.limit));
		return fetcher(`/stories/${storyId}/comments?${qs.toString()}`);
	},

	fetchRatings(
		storyId: number,
		params?: { page?: number; limit?: number },
	): Promise<PaginatedBType<Rating>> {
		const qs = new URLSearchParams();
		if (params?.page) qs.set("page", String(params.page));
		if (params?.limit) qs.set("limit", String(params.limit));
		return fetcher(`/ratings/story/${storyId}?${qs.toString()}`);
	},

	fetchRatingSummary(
		storyId: number,
	): Promise<{ storyId: number; averageScore: number; totalRatings: number }> {
		return fetcher(`/stories/${storyId}/ratings/summary`);
	},

	createComment(data: {
		content: string;
		userId: number;
		storyId: number;
	}): Promise<Comment> {
		return fetcher("/comments", { method: "POST", body: JSON.stringify(data) });
	},

	saveProgress(data: {
		userId: number;
		storyId: number;
		chapterId: number;
		scrollPosition: number;
		readingMode: BackendReadMode;
	}): Promise<ReadingProgress> {
		return fetcher("/reading-progress", {
			method: "POST",
			body: JSON.stringify(data),
		});
	},

	getProgress(userId: number, storyId: number): Promise<ReadingProgress> {
		return fetcher(`/reading-progress?userId=${userId}&storyId=${storyId}`);
	},

	setReadingMode(data: {
		userId: number;
		storyId?: number;
		mode: BackendReadMode;
	}): Promise<{ mode: BackendReadMode }> {
		return fetcher("/reading-mode/set", {
			method: "POST",
			body: JSON.stringify(data),
		});
	},

	getReadingMode(
		userId?: number,
		storyId?: number,
	): Promise<{ mode: BackendReadMode }> {
		const qs = new URLSearchParams();
		if (userId) qs.set("userId", String(userId));
		if (storyId) qs.set("storyId", String(storyId));
		return fetcher(`/reading-mode/current?${qs.toString()}`);
	},
};
