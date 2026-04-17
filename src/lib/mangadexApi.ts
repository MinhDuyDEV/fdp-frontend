// MangaDex API client (calls our /api/mangadex proxy to avoid CORS)

const proxy = (path: string) => `/api/mangadex?path=${encodeURIComponent(path)}`

export interface MdxChapterInfo {
  id: string
  chapter: string
  title: string | null
  pages: number
  translatedLanguage: string
}

export interface MdxPageUrls {
  baseUrl: string
  pages: string[]
}

// Fetch first N english chapters for a manga
export async function fetchChapters(mangaId: string, limit = 10): Promise<MdxChapterInfo[]> {
  const path = `/manga/${mangaId}/feed?limit=${limit}&translatedLanguage[]=en&order[chapter]=asc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`
  const res = await fetch(proxy(path))
  const data = await res.json()
  if (!data.data) return []
  return data.data.map((c: any) => ({
    id: c.id,
    chapter: c.attributes.chapter ?? '?',
    title: c.attributes.title,
    pages: c.attributes.pages,
    translatedLanguage: c.attributes.translatedLanguage,
  }))
}

// Fetch real page image URLs for a chapter
export async function fetchChapterPages(chapterId: string): Promise<MdxPageUrls> {
  const path = `/at-home/server/${chapterId}`
  const res = await fetch(proxy(path))
  const data = await res.json()
  if (!data.chapter) return { baseUrl: '', pages: [] }

  const { baseUrl, chapter } = data
  const pages: string[] = chapter.data.map(
    (filename: string) => `${baseUrl}/data/${chapter.hash}/${filename}`
  )
  return { baseUrl, pages }
}

// Fallback: data-saver (smaller, faster) version
export async function fetchChapterPagesSaver(chapterId: string): Promise<string[]> {
  const path = `/at-home/server/${chapterId}`
  const res = await fetch(proxy(path))
  const data = await res.json()
  if (!data.chapter) return []

  const { baseUrl, chapter } = data
  return chapter.dataSaver.map(
    (filename: string) => `${baseUrl}/data-saver/${chapter.hash}/${filename}`
  )
}
