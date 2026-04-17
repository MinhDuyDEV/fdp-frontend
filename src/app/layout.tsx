import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MangaKo — Đọc Truyện Tranh',
  description: 'Web đọc manga online — Design Pattern Demo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
