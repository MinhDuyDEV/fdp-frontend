// API types matching NestJS backend contract

export type Genre = "Action" | "Horror" | "Romance" | "Detective";
export type BackendGenre = Genre;

export type ReadingMode = "day" | "night" | "scroll" | "page-flip";
export type BackendReadMode = ReadingMode;

export interface User {
	id: number;
	name: string;
	email: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Story {
	id: number;
	title: string;
	description: string;
	author: string;
	genre: Genre;
	coverImage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Chapter {
	id: number;
	title: string;
	content: string;
	chapterNumber: number;
	storyId: number;
	createdAt: string;
	updatedAt: string;
}

export interface Comment {
	id: number;
	content: string;
	userId: number;
	storyId: number;
	createdAt: string;
	updatedAt: string;
}

export interface Rating {
	id: number;
	score: number;
	userId: number;
	storyId: number;
	createdAt: string;
	updatedAt: string;
}

export interface ReadingProgress {
	id: number;
	userId: number;
	storyId: number;
	chapterId: number;
	scrollPosition: number;
	readingMode: ReadingMode;
	lastReadAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface Notification {
	id: number;
	userId: number;
	storyId: number;
	chapterId: number;
	message: string;
	isRead: boolean;
	createdAt: string;
}

export interface CommentPayload {
	content: string;
	userId: number;
	storyId: number;
}

export interface UpdateCommentPayload {
	content: string;
}

export interface RatingPayload {
	score: number;
	userId: number;
	storyId: number;
}

export interface SubscriptionPayload {
	userId: number;
	storyId: number;
}

export interface NotificationQueryParams {
	page?: number;
	limit?: number;
	unreadOnly?: boolean;
}

export interface ApiError {
	statusCode: number;
	message: string | string[];
	error: string;
}

// Type A pagination — stories, chapters
export interface PaginatedResponseA<T> {
	data: T[];
	meta: {
		totalItems: number;
		itemsPerPage: number;
		totalPages: number;
		currentPage: number;
	};
}

// Type B pagination — comments, ratings, notifications
export interface PaginatedResponseB<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

export interface RatingSummary {
	storyId: number;
	averageScore: number;
	totalRatings: number;
}

export interface LoginResponse {
	access_token: string;
}

export interface LogoutResponse {
	message: string;
}

export interface MessageResponse {
	message: string;
}
