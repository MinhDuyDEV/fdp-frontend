const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const TOKEN_KEY = "mk_auth_token";

// ─── 401 callback (registered by AuthContext) ─────────────────────────────────

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null): void {
	onUnauthorized = cb;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function isBrowser(): boolean {
	return typeof window !== "undefined";
}

export function getToken(): string | null {
	if (!isBrowser()) return null;
	return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
	if (!isBrowser()) return;
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
	if (!isBrowser()) return;
	localStorage.removeItem(TOKEN_KEY);
}

// ─── ApiError ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
	statusCode: number;
	error: string;

	constructor(statusCode: number, message: string | string[], error: string) {
		const displayMessage = Array.isArray(message)
			? message.join(", ")
			: message;
		super(displayMessage);
		this.name = "ApiError";
		this.statusCode = statusCode;
		this.error = error;
	}
}

// ─── Core request ─────────────────────────────────────────────────────────────

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	const token = getToken();
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	const mergedOptions: RequestInit = {
		...options,
		headers: {
			...headers,
			...options?.headers,
		},
	};

	const response = await fetch(url, mergedOptions);

	if (!response.ok) {
		let errorBody: {
			statusCode?: number;
			message?: string | string[];
			error?: string;
		} = {};
		try {
			errorBody = await response.json();
		} catch {
			// ignore parse error
		}

		if (response.status === 401) {
			clearToken();
			onUnauthorized?.();
		}

		throw new ApiError(
			response.status,
			errorBody.message ?? response.statusText,
			errorBody.error ?? "Unknown error",
		);
	}

	if (response.status === 204) {
		return null as T;
	}

	return response.json() as Promise<T>;
}

// ─── Convenience methods ───────────────────────────────────────────────────────

export const api = {
	get: <T>(endpoint: string) => request<T>(endpoint),

	post: <T>(endpoint: string, data?: unknown) =>
		request<T>(endpoint, {
			method: "POST",
			body: data ? JSON.stringify(data) : undefined,
		}),

	patch: <T>(endpoint: string, data?: unknown) =>
		request<T>(endpoint, {
			method: "PATCH",
			body: data ? JSON.stringify(data) : undefined,
		}),

	del: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
