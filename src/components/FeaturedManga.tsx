"use client";
import { useRouter } from "next/navigation";
import { useProgress } from "@/hooks";
import { MangaFactory } from "@/lib/data";
import type { Manga } from "@/types";
import MangaCover from "./MangaCover";

export default function FeaturedManga({ manga }: { manga: Manga }) {
	const router = useRouter();
	const { progress } = useProgress(manga.id);
	const accent = MangaFactory.getAccent(manga.genre);

	return (
		<article
			className="animate-in featured-grid"
			onClick={() => router.push(`/manga/${manga.id}`)}
			style={{
				display: "grid",
				gridTemplateColumns: "200px 1fr",
				borderBottom: "2px solid var(--ink)",
				cursor: "pointer",
				transition: "background 0.15s",
			}}
			onMouseEnter={(e) => (e.currentTarget.style.background = "var(--aged)")}
			onMouseLeave={(e) => (e.currentTarget.style.background = "")}
			onFocus={(e) => (e.currentTarget.style.background = "var(--aged)")}
			onBlur={(e) => (e.currentTarget.style.background = "")}
			tabIndex={0}
			role="link"
			aria-label={`Đọc ${manga.title}`}
		>
			{/* Cover */}
			<div
				className="featured-cover"
				style={{
					borderRight: "2px solid var(--ink)",
					height: 280,
					position: "relative",
					overflow: "hidden",
				}}
			>
				<MangaCover manga={manga} />
				{/* Volume number stamp */}
				<div
					style={{
						position: "absolute",
						top: 8,
						left: 8,
						fontFamily: "'Playfair Display', serif",
						fontSize: "3.2rem",
						fontWeight: 900,
						lineHeight: 1,
						color: "white",
						textShadow: "2px 2px 0 rgba(0,0,0,0.75)",
						pointerEvents: "none",
					}}
				>
					01
				</div>
			</div>

			{/* Info */}
			<div
				style={{
					padding: "22px 26px",
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				<span
					className="genre-chip"
					style={{
						color: accent,
						borderColor: accent,
						alignSelf: "flex-start",
					}}
				>
					{MangaFactory.getLabelEN(manga.genre)} · Nổi bật
				</span>

				<h2
					style={{
						fontFamily: "'Playfair Display', serif",
						fontSize: "2.6rem",
						fontWeight: 900,
						letterSpacing: "-0.5px",
						lineHeight: 1.05,
					}}
				>
					{manga.title}
				</h2>

				<div
					style={{
						fontFamily: "'Noto Sans JP', sans-serif",
						fontSize: "0.88rem",
						color: "var(--smoke)",
						fontWeight: 400,
					}}
				>
					{manga.titleJP} · {manga.author}
				</div>

				<p
					style={{
						fontSize: "0.82rem",
						lineHeight: 1.65,
						color: "var(--smoke)",
						flex: 1,
						display: "-webkit-box",
						WebkitLineClamp: 3,
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
					}}
				>
					{manga.synopsis}
				</p>

				{/* Footer row */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.68rem",
						color: "var(--smoke)",
						borderTop: "1px solid var(--aged)",
						paddingTop: 10,
						flexWrap: "wrap",
					}}
				>
					<span style={{ color: accent, letterSpacing: -1 }}>
						{"★".repeat(Math.round(manga.rating))}
						{"☆".repeat(5 - Math.round(manga.rating))}
					</span>
					<span>{manga.rating}</span>
					<span style={{ color: "var(--aged)" }}>|</span>
					<span>{manga.views} lượt đọc</span>
					<span style={{ color: "var(--aged)" }}>|</span>
					<span>{manga.chapters.length} chương</span>
					{progress && (
						<>
							<span style={{ color: "var(--aged)" }}>|</span>
							<span style={{ color: "var(--rust)" }}>
								Đang đọc Ch.{progress.chapterIndex + 1}
							</span>
						</>
					)}
					<button
						className="btn btn-primary"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/manga/${manga.id}`);
						}}
						style={{
							marginLeft: "auto",
							padding: "5px 14px",
							fontSize: "0.65rem",
						}}
					>
						{progress ? "Đọc tiếp" : "Đọc ngay"} →
					</button>
				</div>
			</div>
		</article>
	);
}
