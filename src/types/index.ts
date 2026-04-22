export type Genre = "Hành động" | "Kinh dị" | "Lãng mạn" | "Trinh thám";

export interface Chapter {
	id: string;
	number: number;
	title: string;
	date: string;
	pages: number;
	mangadexId?: string;
}

export interface Manga {
	id: string;
	title: string;
	titleJP: string;
	genre: Genre;
	author: string;
	coverUrl: string;
	coverFallback: string;
	rating: number;
	views: string;
	synopsis: string;
	tags: string[];
	chapters: Chapter[];
	status: "Đang tiến hành" | "Hoàn thành";
	year: number;
	mangadexId?: string;
}

export interface ReadProgress {
	mangaId: string;
	chapterIndex: number;
	pageIndex: number;
	totalPages: number;
	updatedAt: number;
}

export interface UserComment {
	id: string;
	mangaId: string;
	user: string;
	text: string;
	createdAt: number;
	userId?: number;
}
