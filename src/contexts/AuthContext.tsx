"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

import { api, clearToken, getToken, setToken } from "@/lib/api";
import type { LoginResponse, User } from "@/types/api";

// ─── JWT decode helper ─────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): { sub: number; name: string } | null {
	try {
		const base64 = token.split(".")[1];
		const json = atob(base64);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

// ─── Auth context type ─────────────────────────────────────────────────────────

export interface AuthContextType {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (name: string, password: string) => Promise<void>;
	register: (name: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setTokenState] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Restore user from stored token on mount
	useEffect(() => {
		const storedToken = getToken();
		if (storedToken) {
			const payload = decodeJwtPayload(storedToken);
			if (payload) {
				setUser({
					id: payload.sub,
					name: payload.name,
					email: null,
					createdAt: "",
					updatedAt: "",
				});
				setTokenState(storedToken);
			} else {
				// Invalid token — clear it
				clearToken();
			}
		}
		setIsLoading(false);
	}, []);

	const login = useCallback(async (name: string, password: string) => {
		const response = await api.post<LoginResponse>("/auth/login", {
			name,
			password,
		});
		setToken(response.access_token);
		const payload = decodeJwtPayload(response.access_token);
		if (!payload) {
			throw new Error("Invalid token received");
		}
		setUser({
			id: payload.sub,
			name: payload.name,
			email: null,
			createdAt: "",
			updatedAt: "",
		});
		setTokenState(response.access_token);
	}, []);

	const register = useCallback(async (name: string, password: string) => {
		await api.post<User>("/auth/register", { name, password });
	}, []);

	const logout = useCallback(async () => {
		try {
			await api.post("/auth/logout");
		} catch {
			// Ignore errors — token may already be expired
		}
		clearToken();
		setUser(null);
		setTokenState(null);
	}, []);

	const value: AuthContextType = {
		user,
		token,
		isAuthenticated: user !== null,
		isLoading,
		login,
		register,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return ctx;
}
