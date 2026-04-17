# MangaKo — Web đọc truyện tranh

Demo môn **Design Pattern** với 4 pattern: Factory, Singleton, Observer, Strategy.

## Cài đặt

```bash
npm install
npm run dev
```

Mở http://localhost:3000

## Build & Deploy

```bash
npm run build
npm start
```

Hoặc deploy lên **Vercel** (khuyến nghị):

```bash
npm i -g vercel
vercel
```

---

## Design Patterns

| Pattern | File | Mô tả |
|---------|------|-------|
| **Factory** | `src/lib/data.ts` | `MangaFactory.create(genre)` tạo object manga theo thể loại |
| **Singleton** | `src/lib/progressManager.ts` | `ReadProgressManager` — một instance duy nhất quản lý progress |
| **Observer** | `src/lib/progressManager.ts` | `EventBus` thông báo UI khi progress/bookmark/comment thay đổi |
| **Strategy** | `src/lib/readStrategy.ts` + `MangaReader.tsx` | 3 chế độ đọc: cuộn dọc, lật trang, cuộn ngang |

## Cấu trúc

```
src/
├── app/
│   ├── page.tsx                    # Trang chủ
│   ├── manga/[id]/page.tsx         # Chi tiết manga
│   └── manga/[id]/read/page.tsx    # Reader
├── components/
│   ├── Header.tsx
│   ├── MangaCover.tsx              # Ảnh cover + fallback CSS
│   ├── FeaturedManga.tsx
│   ├── MangaCard.tsx
│   ├── MangaReader.tsx             # Strategy Pattern applied
│   └── Sidebar.tsx
├── hooks/index.ts                  # useProgress, useBookmark, useComments, useTheme
├── lib/
│   ├── data.ts                     # Factory Pattern + mock data
│   ├── progressManager.ts          # Singleton + Observer Pattern
│   └── readStrategy.ts             # Strategy Pattern definitions
└── types/index.ts
```

## Theme

Hỗ trợ 3 chủ đề: Ban ngày / Sepia / Ban đêm — chuyển qua nút ở header.

## Lưu ý

- Ảnh trang truyện dùng placeholder (picsum.photos) — thay bằng ảnh thật từ MangaDex API
- Data lưu trong `localStorage`
- Ảnh cover từ MangaDex CDN (cần `next.config.js` đã cấu hình)
