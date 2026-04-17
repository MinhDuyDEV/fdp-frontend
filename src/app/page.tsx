"use client";
import { useState } from "react";
import FeaturedManga from "@/components/FeaturedManga";
import Header from "@/components/Header";
import MangaCard from "@/components/MangaCard";
import Sidebar from "@/components/Sidebar";
import { mangaData } from "@/lib/data";
import type { Genre } from "@/types";

export default function HomePage() {
	const [activeGenre, setActiveGenre] = useState<Genre | "all">("all");

	const filtered =
		activeGenre === "all"
			? mangaData
			: mangaData.filter((m) => m.genre === activeGenre);

	const featured = filtered[0];
	const rest = filtered.slice(1);

	return (
		<>
			<Header
				activeGenre={activeGenre}
				onGenreChange={setActiveGenre}
				showGenreNav
			/>

			<main
				className="home-grid"
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 300px",
					minHeight: "calc(100vh - 73px)",
				}}
			>
				{/* Left — manga list */}
				<div style={{ borderRight: "2px solid var(--ink)" }}>
					{/* Featured */}
					{featured && (
						<>
							<div className="section-rule">Nổi bật hôm nay</div>
							<FeaturedManga manga={featured} />
						</>
					)}

					{/* Grid */}
					<div className="section-rule">Danh sách truyện</div>
					{rest.length === 0 && (
						<div
							style={{
								padding: "40px 20px",
								textAlign: "center",
								fontFamily: "'IBM Plex Mono', monospace",
								fontSize: "0.75rem",
								color: "var(--smoke)",
								textTransform: "uppercase",
								letterSpacing: "0.08em",
							}}
						>
							Không có truyện nào
						</div>
					)}
					<div
						className="manga-grid"
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(2, 1fr)",
						}}
					>
						{rest.map((m, i) => (
							<div
								key={m.id}
								style={{
									borderRight: i % 2 === 0 ? "1px solid var(--aged)" : "none",
								}}
							>
								<MangaCard manga={m} index={i} />
							</div>
						))}
					</div>
				</div>

				{/* Right — sidebar */}
				<Sidebar className="home-sidebar" />
			</main>
		</>
	);
}
