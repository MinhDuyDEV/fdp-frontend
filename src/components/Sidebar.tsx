"use client";
import { useRouter } from "next/navigation";
import { useAllBookmarks, useAllComments, useProgress } from "@/hooks";
import { mangaData } from "@/lib/data";
import MangaCover from "./MangaCover";

function BookmarkItem({ mangaId }: { mangaId: string }) {
	const router = useRouter();
	const manga = mangaData.find((m) => m.id === mangaId);
	const { progress } = useProgress(mangaId);
	if (!manga) return null;

	const label = progress
		? `Ch.${progress.chapterIndex + 1} · trang ${progress.pageIndex + 1}/${progress.totalPages}`
		: "Chưa bắt đầu";

	return (
		<div
			onClick={() => router.push(`/manga/${manga.id}`)}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "10px 16px",
				borderBottom: "1px solid var(--aged)",
				cursor: "pointer",
				transition: "background 0.15s",
			}}
			onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
			onMouseLeave={(e) => (e.currentTarget.style.background = "")}
			onFocus={(e) => (e.currentTarget.style.background = "var(--cream)")}
			onBlur={(e) => (e.currentTarget.style.background = "")}
			tabIndex={0}
			role="link"
			aria-label={`Đọc ${manga.title}`}
		>
			<div
				style={{
					width: 40,
					height: 54,
					flexShrink: 0,
					border: "1px solid var(--aged)",
					overflow: "hidden",
					position: "relative",
				}}
			>
				<MangaCover manga={manga} />
			</div>
			<div style={{ minWidth: 0, flex: 1 }}>
				<div
					style={{
						fontFamily: "'Playfair Display', serif",
						fontSize: "0.82rem",
						fontWeight: 700,
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					{manga.title}
				</div>
				<div
					style={{
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.6rem",
						color: "var(--smoke)",
						marginTop: 2,
					}}
				>
					{label}
				</div>
			</div>
			<span
				style={{
					fontFamily: "'IBM Plex Mono', monospace",
					fontSize: "0.6rem",
					fontWeight: 700,
					color: "var(--rust)",
					flexShrink: 0,
				}}
			>
				→
			</span>
		</div>
	);
}

export default function Sidebar({ className }: { className?: string }) {
	const bookmarks = useAllBookmarks();
	const comments = useAllComments();
	const router = useRouter();

	return (
		<aside className={className} style={{ borderLeft: "2px solid var(--ink)" }}>
			{/* Bookmarks */}
			<section style={{ borderBottom: "2px solid var(--ink)" }}>
				<div className="section-rule">Đang đọc dở ({bookmarks.length})</div>
				{bookmarks.length === 0 ? (
					<div
						style={{
							padding: "16px",
							fontFamily: "'IBM Plex Mono', monospace",
							fontSize: "0.68rem",
							color: "var(--smoke)",
						}}
					>
						Chưa lưu truyện nào
					</div>
				) : (
					bookmarks.map((id) => <BookmarkItem key={id} mangaId={id} />)
				)}
			</section>

			{/* Recent comments */}
			<section>
				<div className="section-rule">Bình luận gần đây</div>
				{comments.length === 0 ? (
					<div
						style={{
							padding: "16px",
							fontFamily: "'IBM Plex Mono', monospace",
							fontSize: "0.68rem",
							color: "var(--smoke)",
						}}
					>
						Chưa có bình luận
					</div>
				) : (
					comments.slice(0, 5).map((c) => {
						const manga = mangaData.find((m) => m.id === c.mangaId);
						return (
							<div
								key={c.id}
								onClick={() => router.push(`/manga/${c.mangaId}`)}
								style={{
									padding: "10px 16px",
									borderBottom: "1px solid var(--aged)",
									cursor: "pointer",
									transition: "background 0.15s",
									fontSize: "0.75rem",
									lineHeight: 1.5,
								}}
								onMouseEnter={(e) =>
									(e.currentTarget.style.background = "var(--cream)")
								}
								onMouseLeave={(e) => (e.currentTarget.style.background = "")}
							>
								<div
									style={{
										fontFamily: "'IBM Plex Mono', monospace",
										fontWeight: 600,
										fontSize: "0.67rem",
									}}
								>
									{c.user}
								</div>
								<div style={{ color: "var(--smoke)", marginTop: 2 }}>
									{c.text}
								</div>
								{manga && (
									<div
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "0.6rem",
											color: "var(--rust)",
											marginTop: 3,
											fontStyle: "italic",
										}}
									>
										— {manga.title}
									</div>
								)}
							</div>
						);
					})
				)}
			</section>
		</aside>
	);
}
