'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Manga } from '@/types'
import { MangaFactory } from '@/lib/data'

interface Props {
  manga: Manga
  width?: number
  height?: number
  style?: React.CSSProperties
}

export default function MangaCover({ manga, width = 200, height = 280, style }: Props) {
  const [failed, setFailed] = useState(false)
  const accent = MangaFactory.getAccent(manga.genre)
  const labelEN = MangaFactory.getLabelEN(manga.genre)

  if (failed) {
    // CSS-only cover when image fails
    return (
      <div style={{
        width: '100%', height: '100%',
        background: manga.coverFallback,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        ...style,
      }}>
        {/* halftone stripes */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.04) 3px,
            rgba(255,255,255,0.04) 6px
          )`,
        }} />
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '0.6rem', fontWeight: 700,
          letterSpacing: '0.3em', textTransform: 'uppercase',
          color: accent, marginBottom: 12,
        }}>
          {labelEN}
        </div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: Math.min(1.5, 14 / manga.title.length * 1.5) + 'rem',
          fontWeight: 900, color: '#fff',
          textAlign: 'center', padding: '0 12px',
          lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}>
          {manga.title}
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: "'Noto Sans JP', sans-serif",
          fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)',
        }}>
          {manga.titleJP}
        </div>
        {/* bottom bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 4, background: accent,
        }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <Image
        src={manga.coverUrl}
        alt={manga.title}
        fill
        sizes="(max-width: 768px) 50vw, 300px"
        style={{ objectFit: 'cover', filter: 'var(--page-filter)' }}
        onError={() => setFailed(true)}
        priority={false}
      />
    </div>
  )
}
