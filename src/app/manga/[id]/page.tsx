"use client";
import { notFound, useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import MangaCover from "@/components/MangaCover";
import { useBookmark, useComments, useProgress, useRating } from "@/hooks";
import { MangaFactory, mangaData } from "@/lib/data";

export default function MangaDetailPage({
	params,
}: {
	params: { id: string };
}) {
	const manga = mangaData.find((m) => m.id === params.id);
	if (!manga) notFound();

	const router = useRouter();
	const { progress } = useProgress(manga.id);
	const { saved, toggle } = useBookmark(manga.id);
	const { comments, post } = useComments(manga.id);
	const { rating, setRating } = useRating(manga.id);
	const [hoverStar, setHoverStar] = useState(0);
	const [commentText, setCommentText] = useState("");
	const accent = MangaFactory.getAccent(manga.genre);
	const genreIcon = MangaFactory.getGenreIcon(manga.genre);
	const contentWarning = MangaFactory.getContentWarning(manga.genre);

	const fakeUsers = [
		"bạnđọc",
		"reader_vn",
		"otaku2024",
		"mangafan",
		"anime.lover",
	];
	const handleComment = () => {
		const text = commentText.trim();
		if (!text) return;
		const user = fakeUsers[Math.floor(Math.random() * fakeUsers.length)];
		post(text, user);
		setCommentText("");
	};

	return (
		<>
			<Header showGenreNav={false} />

			<main className="animate-in">
				{/* Hero */}
				<div
					className="detail-hero"
					style={{
						display: "grid",
						gridTemplateColumns: "220px 1fr",
						borderBottom: "2px solid var(--ink)",
					}}
				>
					<div
						className="detail-hero-cover"
						style={{
							borderRight: "2px solid var(--ink)",
							height: 320,
							position: "relative",
						}}
					>
						<MangaCover manga={manga} />
					</div>

					<div
						style={{
							padding: "26px 32px",
							display: "flex",
							flexDirection: "column",
							gap: 10,
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
							{genreIcon} {MangaFactory.getLabelEN(manga.genre)} ·{" "}
							{manga.status}
						</span>

						<h1
							style={{
								fontFamily: "'Playfair Display', serif",
								fontSize: "3.2rem",
								fontWeight: 900,
								letterSpacing: "-1px",
								lineHeight: 1.05,
							}}
						>
							{manga.title}
						</h1>

						<div
							style={{
								fontFamily: "'Noto Sans JP', sans-serif",
								fontSize: "1rem",
								color: "var(--smoke)",
							}}
						>
							{manga.titleJP} · {manga.author} · {manga.year}
						</div>

						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							{manga.tags.map((t) => (
								<span
									key={t}
									className="genre-chip"
									style={{
										color: "var(--smoke)",
										borderColor: "var(--aged)",
										fontSize: "0.6rem",
									}}
								>
									{t}
								</span>
							))}
						</div>

						<p
							style={{
								fontSize: "0.85rem",
								lineHeight: 1.7,
								color: "var(--smoke)",
								maxWidth: 560,
							}}
						>
							{manga.synopsis}
						</p>

						{/* ── FACTORY PATTERN: genre-specific content warning ── */}
						{contentWarning && (
							<div
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.68rem",
									color: accent,
									background: `${accent}12`,
									border: `1px solid ${accent}40`,
									padding: "6px 12px",
									maxWidth: 560,
								}}
							>
								⚠ {contentWarning}
							</div>
						)}

						{/* Stats */}
						<div
							style={{
								display: "flex",
								gap: 28,
								fontFamily: "'IBM Plex Mono', monospace",
								fontSize: "0.7rem",
								color: "var(--smoke)",
							}}
						>
							{[
								{ label: "Điểm", value: manga.rating },
								{ label: "Chương", value: manga.chapters.length },
								{ label: "Lượt đọc", value: manga.views },
								...(progress
									? [
											{
												label: "Đang đọc",
												value: `Ch.${progress.chapterIndex + 1}`,
											},
										]
									: []),
							].map((s) => (
								<div key={s.label}>
									<div
										style={{
											fontFamily: "'Playfair Display', serif",
											fontSize: "1.5rem",
											fontWeight: 700,
											color: "var(--ink)",
											lineHeight: 1,
										}}
									>
										{s.value}
									</div>
									<div style={{ marginTop: 2 }}>{s.label}</div>
								</div>
							))}
						</div>

						{/* Actions */}
						<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
							<button
								className="btn btn-primary"
								onClick={() => {
									const idx = progress?.chapterIndex ?? 0;
									router.push(`/manga/${manga.id}/read?chapter=${idx}`);
								}}
							>
								{progress
									? `Đọc tiếp Ch.${progress.chapterIndex + 1}`
									: "Đọc từ đầu"}{" "}
								→
							</button>
							<button
								className={`btn ${saved ? "btn-danger" : ""}`}
								onClick={toggle}
							>
								{saved ? "Đã lưu ✓" : "Lưu truyện"}
							</button>
							<button className="btn btn-ghost" onClick={() => router.back()}>
								← Quay lại
							</button>
						</div>
					</div>
				</div>

				{/* Body: chapters + rating/comments */}
				<div
					className="detail-body"
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 320px",
						alignItems: "start",
					}}
				>
					{/* Chapter list */}
					<div style={{ borderRight: "2px solid var(--ink)" }}>
						<div className="section-rule">{manga.chapters.length} chương</div>
						{manga.chapters.map((ch, i) => {
							const isRead = progress && i < progress.chapterIndex;
							return (
								<div
									key={ch.id}
									onClick={() =>
										router.push(`/manga/${manga.id}/read?chapter=${i}`)
									}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 14,
										padding: "11px 20px",
										borderBottom: "1px solid var(--aged)",
										cursor: "pointer",
										transition: "background 0.15s",
										opacity: isRead ? 0.5 : 1,
									}}
									onMouseEnter={(e) =>
										(e.currentTarget.style.background = "var(--cream)")
									}
									onMouseLeave={(e) => (e.currentTarget.style.background = "")}
									onFocus={(e) =>
										(e.currentTarget.style.background = "var(--cream)")
									}
									onBlur={(e) => (e.currentTarget.style.background = "")}
									tabIndex={0}
									role="link"
									aria-label={`Đọc chương ${ch.title}`}
								>
									<div
										style={{
											fontFamily: "'Playfair Display', serif",
											fontSize: "1.5rem",
											fontWeight: 700,
											color: accent,
											minWidth: 48,
											lineHeight: 1,
										}}
									>
										{String(ch.number).padStart(2, "0")}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ fontSize: "0.87rem", fontWeight: 700 }}>
											{ch.title}
										</div>
										<div
											style={{
												fontFamily: "'IBM Plex Mono', monospace",
												fontSize: "0.62rem",
												color: "var(--smoke)",
												marginTop: 2,
											}}
										>
											{ch.pages} trang
										</div>
									</div>
									<div
										style={{
											fontFamily: "'IBM Plex Mono', monospace",
											fontSize: "0.62rem",
											color: "var(--smoke)",
										}}
									>
										{ch.date}
									</div>
									{/* read dot */}
									<div
										style={{
											width: 6,
											height: 6,
											borderRadius: "50%",
											background: isRead ? "var(--aged)" : accent,
											flexShrink: 0,
										}}
									/>
								</div>
							);
						})}
					</div>

					{/* Rating + Comments */}
					<div>
						{/* Rating */}
						<div
							style={{ padding: "20px", borderBottom: "2px solid var(--ink)" }}
						>
							<div
								className="section-rule"
								style={{ margin: "-20px -20px 16px", padding: "8px 20px" }}
							>
								Đánh giá
							</div>
							<div
								style={{
									fontFamily: "'Playfair Display', serif",
									fontSize: "4rem",
									fontWeight: 900,
									color: accent,
									lineHeight: 1,
								}}
							>
								{manga.rating}
							</div>
							<div
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.65rem",
									color: "var(--smoke)",
									textTransform: "uppercase",
									letterSpacing: "0.08em",
									marginTop: 2,
								}}
							>
								Điểm cộng đồng
							</div>

							<div style={{ display: "flex", gap: 4, marginTop: 14 }}>
								{[1, 2, 3, 4, 5].map((s) => (
									<button
										key={s}
										onClick={() => setRating(s)}
										onMouseEnter={() => setHoverStar(s)}
										onMouseLeave={() => setHoverStar(0)}
										onFocus={() => setHoverStar(s)}
										onBlur={() => setHoverStar(0)}
										aria-label={`Đánh giá ${s} sao`}
										aria-pressed={rating === s}
										style={{
											fontSize: "1.5rem",
											background: "none",
											border: "none",
											cursor: "pointer",
											lineHeight: 1,
											color:
												(hoverStar || rating) >= s ? accent : "var(--aged)",
											transform:
												(hoverStar || rating) >= s ? "scale(1.15)" : "scale(1)",
											transition: "all 0.1s",
										}}
									>
										★
									</button>
								))}
							</div>
							<div
								style={{
									fontFamily: "'IBM Plex Mono', monospace",
									fontSize: "0.65rem",
									color: "var(--smoke)",
									marginTop: 6,
									textTransform: "uppercase",
								}}
							>
								{rating
									? `Bạn đánh giá: ${rating} sao`
									: "Nhấn sao để đánh giá"}
							</div>
						</div>

						{/* Comments */}
						<div style={{ padding: "20px" }}>
							<div
								className="section-rule"
								style={{ margin: "-20px -20px 14px", padding: "8px 20px" }}
							>
								Bình luận ({comments.length})
							</div>
							<textarea
								value={commentText}
								onChange={(e) => setCommentText(e.target.value)}
								placeholder={`Viết bình luận về ${manga.title}...`}
								rows={3}
								style={{
									width: "100%",
									background: "var(--cream)",
									border: "1px solid var(--aged)",
									color: "var(--ink)",
									fontFamily: "'Noto Serif', serif",
									fontSize: "0.8rem",
									padding: "8px",
									resize: "none",
									outline: "none",
									transition: "border-color 0.15s",
								}}
								onFocus={(e) => (e.target.style.borderColor = "var(--ink)")}
								onBlur={(e) => (e.target.style.borderColor = "var(--aged)")}
							/>
							<button
								className="btn btn-primary"
								onClick={handleComment}
								style={{
									marginTop: 8,
									fontSize: "0.65rem",
									padding: "6px 14px",
								}}
							>
								Gửi bình luận
							</button>

							<div style={{ marginTop: 14 }}>
								{comments.map((c) => (
									<div
										key={c.id}
										style={{
											padding: "9px 0",
											borderBottom: "1px solid var(--aged)",
											fontSize: "0.75rem",
											lineHeight: 1.5,
										}}
									>
										<div
											style={{
												fontFamily: "'IBM Plex Mono', monospace",
												fontWeight: 600,
												fontSize: "0.67rem",
												color: accent,
											}}
										>
											{c.user}
										</div>
										<div style={{ color: "var(--smoke)", marginTop: 2 }}>
											{c.text}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</main>
		</>
	);
}
