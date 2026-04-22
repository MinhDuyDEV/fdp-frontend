"use client";

import Link from "next/link";
import { useState } from "react";
import NotificationsPanel from "@/components/NotificationsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { type Theme, useBackendNotifications, useTheme } from "@/hooks";
import type { Genre } from "@/types";

const GENRES: Genre[] = ["Hành động", "Kinh dị", "Lãng mạn", "Trinh thám"];
const THEMES: { value: Theme; label: string }[] = [
	{ value: "day", label: "Ban ngày" },
	{ value: "sepia", label: "Sepia" },
	{ value: "night", label: "Ban đêm" },
];

interface Props {
	activeGenre?: Genre | "all";
	onGenreChange?: (g: Genre | "all") => void;
	showGenreNav?: boolean;
}

export default function Header({
	activeGenre = "all",
	onGenreChange,
	showGenreNav = true,
}: Props) {
	const { theme, setTheme } = useTheme();
	const { user, isAuthenticated, isLoading, logout } = useAuth();
	const [panelOpen, setPanelOpen] = useState(false);
	const { unreadCount } = useBackendNotifications(user?.id ?? undefined);

	const today = new Date().toLocaleDateString("vi-VN", {
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

	return (
		<header
			style={{
				position: "sticky",
				top: 0,
				zIndex: 100,
				background: "var(--paper)",
				borderBottom: "3px solid var(--ink)",
			}}
		>
			{/* Top strip */}
			<div
				style={{
					display: "flex",
					alignItems: "stretch",
					borderBottom: "1px solid var(--ink)",
				}}
			>
				<Link
					href="/"
					style={{
						fontFamily: "'Playfair Display', Georgia, serif",
						fontSize: "2.8rem",
						fontWeight: 900,
						letterSpacing: "-1px",
						lineHeight: 1,
						padding: "10px 20px",
						borderRight: "2px solid var(--ink)",
						color: "var(--ink)",
						textDecoration: "none",
						display: "flex",
						alignItems: "center",
						gap: 2,
						flexShrink: 0,
					}}
				>
					Manga
					<span style={{ color: "var(--rust)", fontStyle: "italic" }}>Ko</span>
				</Link>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						padding: "0 20px",
						gap: 12,
						flex: 1,
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.68rem",
						color: "var(--smoke)",
						overflow: "hidden",
					}}
				>
					<span style={{ flexShrink: 0 }}>Vol. XXIV</span>
					<span style={{ color: "var(--aged)" }}>|</span>
					<span style={{ flexShrink: 0 }}>{today}</span>
					<span style={{ color: "var(--aged)" }}>|</span>
					<span style={{ flexShrink: 0 }}>Design Pattern Demo</span>

					{/* Auth UI — hidden while loading to prevent flicker */}
					{!isLoading && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								marginLeft: 24,
								flexShrink: 0,
							}}
						>
							{isAuthenticated ? (
								<>
									<span
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "0.68rem",
											color: "var(--ink)",
											fontWeight: 600,
											whiteSpace: "nowrap",
										}}
									>
										{user?.name}
									</span>
									<button
										onClick={() => logout()}
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "0.62rem",
											fontWeight: 700,
											textTransform: "uppercase",
											letterSpacing: "0.06em",
											padding: "3px 9px",
											border: "1px solid var(--aged)",
											cursor: "pointer",
											background: "none",
											color: "var(--smoke)",
											transition: "all 0.15s",
											whiteSpace: "nowrap",
										}}
									>
										Logout
									</button>
									<div style={{ position: "relative" }}>
										<button
											onClick={() => setPanelOpen((p) => !p)}
											aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} mới)` : ""}`}
											aria-expanded={panelOpen}
											style={{
												fontFamily: "'IBM Plex Mono', monospace",
												fontSize: "0.68rem",
												background: "none",
												border: "none",
												cursor: "pointer",
												color: "var(--ink)",
												padding: 0,
												lineHeight: 1,
												position: "relative",
											}}
										>
											🔔
											{unreadCount > 0 && (
												<span
													style={{
														position: "absolute",
														top: -4,
														right: -4,
														width: 14,
														height: 14,
														background: "var(--rust)",
														color: "#fff",
														borderRadius: "50%",
														fontSize: "0.55rem",
														fontWeight: 700,
														lineHeight: "14px",
														textAlign: "center",
													}}
												>
													{unreadCount > 9 ? "9+" : unreadCount}
												</span>
											)}
										</button>
										{user && (
											<NotificationsPanel
												userId={user.id}
												open={panelOpen}
												onClose={() => setPanelOpen(false)}
											/>
										)}
									</div>
								</>
							) : (
								<>
									<Link
										href="/login"
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "0.68rem",
											color: "var(--smoke)",
											textDecoration: "none",
											whiteSpace: "nowrap",
										}}
									>
										Login
									</Link>
									<span style={{ color: "var(--aged)" }}>|</span>
									<Link
										href="/register"
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "0.68rem",
											color: "var(--smoke)",
											textDecoration: "none",
											whiteSpace: "nowrap",
										}}
									>
										Register
									</Link>
								</>
							)}
						</div>
					)}

					{/* theme switcher — pushed right */}
					<div
						style={{
							marginLeft: "auto",
							display: "flex",
							gap: 4,
							flexShrink: 0,
						}}
					>
						{THEMES.map((t) => (
							<button
								key={t.value}
								onClick={() => setTheme(t.value)}
								aria-label={`Chế độ ${t.label}`}
								aria-pressed={theme === t.value}
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.62rem",
									fontWeight: 700,
									textTransform: "uppercase",
									letterSpacing: "0.06em",
									padding: "3px 9px",
									border: "1px solid var(--aged)",
									cursor: "pointer",
									background: theme === t.value ? "var(--ink)" : "none",
									color: theme === t.value ? "var(--paper)" : "var(--smoke)",
									transition: "all 0.15s",
								}}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Genre nav */}
			{showGenreNav && (
				<nav
					style={{
						display: "flex",
						alignItems: "stretch",
						height: 36,
						overflowX: "auto",
						padding: "0 20px",
						gap: 0,
					}}
				>
					{(["all", ...GENRES] as (Genre | "all")[]).map((g) => (
						<button
							key={g}
							onClick={() => onGenreChange?.(g)}
							aria-label={g === "all" ? "Tất cả thể loại" : `Thể loại ${g}`}
							aria-current={activeGenre === g ? "page" : undefined}
							style={{
								fontFamily: "'IBM Plex Mono', monospace",
								fontSize: "0.68rem",
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								border: "none",
								background: "none",
								cursor: "pointer",
								color: activeGenre === g ? "var(--ink)" : "var(--smoke)",
								fontWeight: activeGenre === g ? 700 : 400,
								padding: "0 14px",
								borderRight: "1px solid var(--aged)",
								borderBottom:
									activeGenre === g
										? "2px solid var(--ink)"
										: "2px solid transparent",
								transition: "color 0.15s",
								whiteSpace: "nowrap",
							}}
						>
							{g === "all" ? "Tất cả" : g}
						</button>
					))}
				</nav>
			)}
		</header>
	);
}
