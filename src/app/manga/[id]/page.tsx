"use client";
import { notFound, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Header from "@/components/Header";
import MangaCover from "@/components/MangaCover";
import { useAuth } from "@/contexts/AuthContext";
import {
	useBackendBookmark,
	useBackendChapters,
	useBackendComments,
	useBackendProgress,
	useBackendRatings,
	useBackendStory,
	useBackendSubscription,
} from "@/hooks";
import {
	addChaptersToManga,
	chapterToMangaChapter,
	commentToUserComment,
	MangaFactory,
	storyToManga,
} from "@/lib/data";
import type { Chapter, Manga, UserComment } from "@/types";

export default function MangaDetailPage({
	params,
}: {
	params: { id: string };
}) {
	const storyId = Number(params.id);
	if (Number.isNaN(storyId)) notFound();

	const router = useRouter();
	const { user } = useAuth();
	const {
		story,
		isLoading: storyLoading,
		error: storyError,
	} = useBackendStory(storyId);
	const { chapters } = useBackendChapters(storyId);

	// Build Manga with chapters merged from backend
	const manga: Manga | null = useMemo(() => {
		if (!story) return null;
		const base = storyToManga(story);
		if (!chapters.length) return base;
		return addChaptersToManga(base, chapters);
	}, [story, chapters]);

	const { progress } = useBackendProgress(storyId);

	const readingChapter = useMemo(() => {
		if (!progress) return null;
		return (
			chapters.find((chapter) => chapter.id === progress.chapterId) ?? null
		);
	}, [chapters, progress]);

	const readingChapterIndex = useMemo(() => {
		if (!progress) return -1;
		return chapters.findIndex((chapter) => chapter.id === progress.chapterId);
	}, [chapters, progress]);
	const { saved, toggle } = useBackendBookmark(storyId);
	const {
		comments,
		meta: commentsMeta,
		isLoading: commentsLoading,
		post: postComment,
		editComment,
		removeComment,
	} = useBackendComments(storyId);
	const {
		rating,
		isLoading: ratingLoading,
		setRating,
		average,
		clearRating,
		mutationLoading: ratingMutationLoading,
	} = useBackendRatings(storyId);
	const { subscribed, toggle: toggleSubscription } =
		useBackendSubscription(storyId);

	const [hoverStar, setHoverStar] = useState(0);
	const [commentText, setCommentText] = useState("");
	const [editingComment, setEditingComment] = useState<string | null>(null);
	const [editCommentText, setEditCommentText] = useState("");

	const accent = manga ? MangaFactory.getAccent(manga.genre) : "var(--ink)";
	const genreIcon = manga ? MangaFactory.getGenreIcon(manga.genre) : "";
	const contentWarning = manga
		? MangaFactory.getContentWarning(manga.genre)
		: null;

	const handleComment = () => {
		const text = commentText.trim();
		if (!text || !manga) return;
		postComment(text);
		setCommentText("");
	};

	if (storyLoading) {
		return (
			<>
				<Header showGenreNav={false} />
				<main
					className="animate-in"
					style={{
						padding: "40px",
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.75rem",
						color: "var(--smoke)",
					}}
				>
					Đang tải truyện…
				</main>
			</>
		);
	}

	if (storyError || !manga) {
		return (
			<>
				<Header showGenreNav={false} />
				<main
					className="animate-in"
					style={{
						padding: "40px",
						fontFamily: "'IBM Plex Mono', monospace",
						fontSize: "0.75rem",
						color: "var(--rust)",
					}}
				>
					Không tìm thấy truyện
				</main>
			</>
		);
	}

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
								{
									label: "Điểm",
									value: average > 0 ? average.toFixed(1) : manga.rating,
								},
								{ label: "Chương", value: manga.chapters.length },
								{ label: "Lượt đọc", value: manga.views },
								...(readingChapter
									? [
											{
												label: "Đang đọc",
												value: `Ch.${readingChapter.chapterNumber}`,
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
									const targetChapterId =
										progress?.chapterId ?? chapters[0]?.id;
									if (!targetChapterId) return;
									router.push(
										`/manga/${manga.id}/read?chapterId=${targetChapterId}`,
									);
								}}
							>
								{readingChapter
									? `Đọc tiếp Ch.${readingChapter.chapterNumber}`
									: "Đọc từ đầu"}{" "}
								→
							</button>
							<button
								className={`btn ${saved ? "btn-danger" : ""}`}
								onClick={toggle}
							>
								{saved ? "Đã lưu ✓" : "Lưu truyện"}
							</button>
							<button
								className={`btn ${subscribed ? "btn-danger" : ""}`}
								onClick={toggleSubscription}
								aria-pressed={subscribed}
								aria-label={
									subscribed ? "Hủy theo dõi truyện" : "Theo dõi truyện"
								}
							>
								{subscribed ? "Đã theo dõi ✓" : "Theo dõi"}
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
							const isRead =
								readingChapterIndex >= 0 && i < readingChapterIndex;
							const chapterId = chapters[i]?.id;
							return (
								<div
									key={ch.id}
									onClick={() => {
										if (!chapterId) return;
										router.push(
											`/manga/${manga.id}/read?chapterId=${chapterId}`,
										);
									}}
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
							{rating && (
								<button
									style={{
										fontSize: "0.6rem",
										background: "none",
										border: "none",
										cursor: "pointer",
										color: "var(--rust)",
										marginTop: 4,
									}}
									onClick={clearRating}
									aria-label="Xóa đánh giá"
									disabled={ratingMutationLoading}
								>
									Xóa đánh giá
								</button>
							)}
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
										{editingComment === c.id ? (
											<>
												<textarea
													value={editCommentText}
													onChange={(e) => setEditCommentText(e.target.value)}
													rows={2}
													style={{
														width: "100%",
														background: "var(--cream)",
														border: "1px solid var(--aged)",
														color: "var(--ink)",
														fontFamily: "'Noto Serif', serif",
														fontSize: "0.8rem",
														padding: "6px",
														resize: "none",
														outline: "none",
													}}
												/>
												<div style={{ display: "flex", gap: 6, marginTop: 6 }}>
													<button
														className="btn btn-primary"
														style={{ fontSize: "0.6rem", padding: "4px 10px" }}
														onClick={async () => {
															editComment(Number(c.id), editCommentText);
															setEditingComment(null);
														}}
													>
														Lưu
													</button>
													<button
														className="btn btn-ghost"
														style={{ fontSize: "0.6rem", padding: "4px 10px" }}
														onClick={() => {
															setEditingComment(null);
															setEditCommentText("");
														}}
													>
														Hủy
													</button>
												</div>
											</>
										) : (
											<>
												<div
													style={{
														fontFamily: "'IBM Plex Mono', monospace",
														fontWeight: 600,
														fontSize: "0.67rem",
														color: accent,
													}}
												>
													{c.user}
													<span
														style={{
															fontWeight: 400,
															color: "var(--smoke)",
															marginLeft: 6,
															fontSize: "0.6rem",
														}}
													>
														{new Date(c.createdAt).toLocaleDateString("vi-VN")}
													</span>

													{user && user.id === c.userId && (
														<>
															<button
																style={{
																	fontSize: "0.6rem",
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	color: "var(--smoke)",
																	marginLeft: 8,
																}}
																onClick={() => {
																	setEditingComment(c.id);
																	setEditCommentText(c.text);
																}}
															>
																Sửa
															</button>
															<button
																style={{
																	fontSize: "0.6rem",
																	background: "none",
																	border: "none",
																	cursor: "pointer",
																	color: "var(--rust)",
																	marginLeft: 4,
																}}
																onClick={() => {
																	if (confirm("Xóa bình luận này?")) {
																		removeComment(Number(c.id));
																	}
																}}
															>
																Xóa
															</button>
														</>
													)}
												</div>
												<div
													style={{
														color: "var(--smoke)",
														marginTop: 2,
													}}
												>
													{c.text}
												</div>
											</>
										)}
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
