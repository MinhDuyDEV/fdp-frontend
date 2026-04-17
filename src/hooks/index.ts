'use client'
import { useState, useEffect, useCallback } from 'react'
import { progressManager, eventBus } from '@/lib/progressManager'
import { ReadProgress, UserComment } from '@/types'

// ── Read Progress ─────────────────────────────────────────────────────────────
export function useProgress(mangaId: string) {
  const mgr = progressManager.get()
  const [progress, setProgress] = useState<ReadProgress | null>(null)

  useEffect(() => {
    setProgress(mgr.getProgress(mangaId))
    const unsub = eventBus.subscribe(e => {
      if (e.type === 'progress') setProgress(mgr.getProgress(mangaId))
    })
    return unsub
  }, [mangaId])

  const save = useCallback(
    (chapterIndex: number, pageIndex: number, totalPages: number) => {
      mgr.saveProgress(mangaId, chapterIndex, pageIndex, totalPages)
    },
    [mangaId]
  )

  return { progress, save }
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────
export function useBookmark(mangaId: string) {
  const mgr = progressManager.get()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(mgr.isBookmarked(mangaId))
    const unsub = eventBus.subscribe(e => {
      if (e.type === 'bookmark') setSaved(mgr.isBookmarked(mangaId))
    })
    return unsub
  }, [mangaId])

  const toggle = useCallback(() => mgr.toggleBookmark(mangaId), [mangaId])
  return { saved, toggle }
}

export function useAllBookmarks() {
  const mgr = progressManager.get()
  const [bookmarks, setBookmarks] = useState<string[]>([])

  useEffect(() => {
    setBookmarks(mgr.getBookmarks())
    const unsub = eventBus.subscribe(e => {
      if (e.type === 'bookmark') setBookmarks(mgr.getBookmarks())
    })
    return unsub
  }, [])

  return bookmarks
}

// ── Comments ──────────────────────────────────────────────────────────────────
export function useComments(mangaId: string) {
  const mgr = progressManager.get()
  const [comments, setComments] = useState<UserComment[]>([])

  useEffect(() => {
    setComments(mgr.getComments(mangaId))
    const unsub = eventBus.subscribe(e => {
      if (e.type === 'comment') setComments(mgr.getComments(mangaId))
    })
    return unsub
  }, [mangaId])

  const post = useCallback(
    (text: string, user: string) => mgr.addComment(mangaId, text, user),
    [mangaId]
  )

  return { comments, post }
}

export function useAllComments() {
  const mgr = progressManager.get()
  const [comments, setComments] = useState<UserComment[]>([])

  useEffect(() => {
    setComments(mgr.getAllComments())
    const unsub = eventBus.subscribe(e => {
      if (e.type === 'comment') setComments(mgr.getAllComments())
    })
    return unsub
  }, [])

  return comments
}

// ── Theme ─────────────────────────────────────────────────────────────────────
export type Theme = 'day' | 'sepia' | 'night'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('day')

  useEffect(() => {
    const stored = (localStorage.getItem('mk_theme') as Theme) ?? 'day'
    setThemeState(stored)
    document.documentElement.setAttribute('data-theme', stored)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('mk_theme', t)
  }, [])

  return { theme, setTheme }
}

// ── User rating ───────────────────────────────────────────────────────────────
export function useRating(mangaId: string) {
  const [rating, setRatingState] = useState(0)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('mk_ratings') || '{}')
    setRatingState(stored[mangaId] ?? 0)
  }, [mangaId])

  const setRating = useCallback((stars: number) => {
    const stored = JSON.parse(localStorage.getItem('mk_ratings') || '{}')
    stored[mangaId] = stars
    localStorage.setItem('mk_ratings', JSON.stringify(stored))
    setRatingState(stars)
  }, [mangaId])

  return { rating, setRating }
}
