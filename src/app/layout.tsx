import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
	title: "MangaKo — Đọc Truyện Tranh",
	description: "Web đọc manga online — Design Pattern Demo",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="vi">
			<body>
				<AuthProvider>{children}</AuthProvider>
			</body>
		</html>
	);
}
