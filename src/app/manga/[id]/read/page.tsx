'use client'
import { notFound, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { mangaData } from '@/lib/data'
import Header from '@/components/Header'
import MangaReader from '@/components/MangaReader'

export default function ReadPage({ params }: { params: { id: string } }) {
  const manga = mangaData.find(m => m.id === params.id)
  if (!manga) notFound()

  const searchParams = useSearchParams()
  const chapterParam = Number(searchParams.get('chapter') ?? '0')
  const initialChapterIndex = Math.max(0, Math.min(chapterParam, manga.chapters.length - 1))

  return (
    <>
      {/* Slim reader header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--paper)',
        borderBottom: '3px solid var(--ink)',
        display: 'flex', alignItems: 'stretch', height: 40,
      }}>
        <Link
          href={`/manga/${manga.id}`}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--ink)', textDecoration: 'none',
            borderRight: '1px solid var(--aged)',
            padding: '0 16px',
            display: 'flex', alignItems: 'center',
            transition: 'background 0.15s',
          }}
        >
          ← {manga.title}
        </Link>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          padding: '0 16px',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.68rem', color: 'var(--smoke)',
        }}>
          {manga.title} — chọn chương bên dưới
        </div>
      </header>

      <MangaReader manga={manga} initialChapterIndex={initialChapterIndex} />
    </>
  )
}
