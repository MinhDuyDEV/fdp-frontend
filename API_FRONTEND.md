# API Backend Spec cho Frontend Team

Tài liệu này tổng hợp **toàn bộ API hiện tại** từ source code backend (NestJS), gồm đầy đủ:

- Endpoint
- Auth requirement
- Request (`params`, `query`, `body`)
- Response thành công
- Response lỗi thường gặp

> Base URL local mặc định: `http://localhost:3000` (hoặc `http://localhost:{PORT}`)

---

## 1) Quy ước chung

### 1.1 Authentication

- Backend dùng JWT guard global.
- Mặc định **tất cả endpoint đều cần token** trừ endpoint có `@Public()`.
- Header:

```http
Authorization: Bearer <access_token>
```

### 1.2 Public endpoints

Chỉ các endpoint sau là public:

- `GET /`
- `POST /auth/register`
- `POST /auth/login`

### 1.3 Format lỗi chuẩn (NestJS)

Lỗi validation (400) thường có dạng:

```json
{
  "statusCode": 400,
  "message": ["field must be ..."],
  "error": "Bad Request"
}
```

Lỗi nghiệp vụ (401/403/404/409):

```json
{
  "statusCode": 404,
  "message": "Story with id 99999 not found",
  "error": "Not Found"
}
```

### 1.4 Pagination đang có 2 kiểu response

#### Kiểu A (stories, chapters list)

```json
{
  "data": [...],
  "meta": {
    "totalItems": 100,
    "itemsPerPage": 10,
    "totalPages": 10,
    "currentPage": 1
  }
}
```

Hoặc trả về mảng thẳng `[]` nếu không truyền phân trang ở một số endpoint.

#### Kiểu B (comments, ratings, notifications)

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

## 2) Schema chính (tham chiếu cho response)

### 2.1 User

```json
{
  "id": 1,
  "name": "reader-01",
  "email": "reader01@example.com",
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### 2.2 Story

```json
{
  "id": 1,
  "title": "Action Hero",
  "description": "An action story",
  "author": "Author A",
  "genre": "Action",
  "coverImage": "https://.../cover.jpg",
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

`genre` enum: `Action | Horror | Romance | Detective`

### 2.3 Chapter

```json
{
  "id": 10,
  "title": "Chapter 1",
  "content": "The beginning...",
  "chapterNumber": 1,
  "storyId": 1,
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### 2.4 Comment

```json
{
  "id": 100,
  "content": "Great story!",
  "userId": 1,
  "storyId": 1,
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### 2.5 Rating

```json
{
  "id": 200,
  "score": 5,
  "userId": 1,
  "storyId": 1,
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### 2.6 ReadingProgress

```json
{
  "id": 300,
  "userId": 1,
  "storyId": 1,
  "chapterId": 10,
  "scrollPosition": 150,
  "readingMode": "night",
  "lastReadAt": "2026-04-16T12:00:00.000Z",
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

### 2.7 Notification

```json
{
  "id": 400,
  "userId": 2,
  "storyId": 1,
  "chapterId": 10,
  "message": "New chapter \"Chapter 1\" (Ch.10) added to story 1",
  "isRead": false,
  "createdAt": "2026-04-16T12:00:00.000Z"
}
```

---

## 3) API chi tiết theo module

## A. Health

### A1) `GET /`

- Auth: **No**
- Request: không có
- Response `200`:

```json
"Hello World!"
```

---

## B. Auth

### B1) `POST /auth/register`

- Auth: **No**
- Body:

```json
{
  "name": "reader-01",
  "password": "securePassword123"
}
```

Validation:

- `name`: string, required, not empty
- `password`: string, required, min length 6

- Response `201`:

```json
{
  "id": 1,
  "name": "reader-01",
  "email": null,
  "createdAt": "2026-04-16T12:00:00.000Z",
  "updatedAt": "2026-04-16T12:00:00.000Z"
}
```

- Error:
  - `400`: body invalid
  - `409`: username đã tồn tại

### B2) `POST /auth/login`

- Auth: **No**
- Body:

```json
{
  "name": "reader-01",
  "password": "securePassword123"
}
```

Validation:

- `name`: string, required
- `password`: string, required

- Response `200`:

```json
{
  "access_token": "<jwt_token>"
}
```

- Error:
  - `400`: body invalid
  - `401`: sai credentials

### B3) `POST /auth/logout`

- Auth: **Yes**
- Body: không có
- Response `200`:

```json
{
  "message": "Logged out successfully"
}
```

- Error:
  - `401`: thiếu/invalid token

---

## C. Users

### C1) `POST /users`

- Auth: **Yes**
- Body:

```json
{
  "name": "user-a",
  "email": "usera@example.com",
  "password": "optional-password"
}
```

Validation:

- `name`: string, required
- `email`: string, optional
- `password`: string, optional

- Response `201`: User object
- Error:
  - `400`: body invalid

### C2) `GET /users`

- Auth: **Yes**
- Request: không có
- Response `200`:

```json
[
  {
    "id": 1,
    "name": "reader-01",
    "email": null,
    "createdAt": "2026-04-16T12:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
]
```

### C3) `GET /users/:id`

- Auth: **Yes**
- Params:
  - `id` (number)
- Response `200`:
  - User object nếu tồn tại
  - `null` nếu không tồn tại
- Error:
  - `400`: `id` không phải number

---

## D. Stories

### D1) `POST /stories`

- Auth: **Yes**
- Body:

```json
{
  "title": "Action Hero",
  "description": "An action story",
  "author": "Author A",
  "genre": "Action",
  "coverImage": "https://.../cover.jpg"
}
```

Validation:

- `title`: string, required
- `description`: string, required
- `author`: string, required
- `genre`: enum `Action|Horror|Romance|Detective`, required
- `coverImage`: string, optional

- Response `201`: Story object
- Error:
  - `400`: body invalid

### D2) `GET /stories`

- Auth: **Yes**
- Query (optional):
  - `genre`: `Action|Horror|Romance|Detective`
  - `page`: int >= 1
  - `limit`: int >= 1

#### Case 1: không truyền `page` và `limit` → trả mảng (legacy)

Response `200`:

```json
[
  {
    "id": 1,
    "title": "Action Hero",
    "description": "...",
    "author": "Author A",
    "genre": "Action",
    "coverImage": null,
    "createdAt": "2026-04-16T12:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
]
```

> Backend mặc định `take: 20` ở case này.

#### Case 2: có `page` hoặc `limit` → trả object phân trang

Response `200`:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Action Hero",
      "description": "...",
      "author": "Author A",
      "genre": "Action",
      "coverImage": null,
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 35,
    "itemsPerPage": 10,
    "totalPages": 4,
    "currentPage": 1
  }
}
```

- Error:
  - `400`: query invalid

### D3) `GET /stories/:id`

- Auth: **Yes**
- Params:
  - `id` (number)
- Response `200`: Story object
- Error:
  - `400`: `id` invalid
  - `404`: story không tồn tại

### D4) `GET /stories/:storyId/chapters`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Query (optional): `page`, `limit`

#### Không truyền `page/limit`

Response `200`: `Chapter[]` (mặc định tối đa 20 bản ghi)

#### Có truyền `page` hoặc `limit`

Response `200`:

```json
{
  "data": [
    {
      "id": 10,
      "title": "Chapter 1",
      "content": "...",
      "chapterNumber": 1,
      "storyId": 1,
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "meta": {
    "totalItems": 20,
    "itemsPerPage": 10,
    "totalPages": 2,
    "currentPage": 1
  }
}
```

- Error:
  - `400`: param/query invalid
  - `404`: story không tồn tại

### D5) `GET /stories/:storyId/comments`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Query (optional):
  - `page`: int >= 1 (default: 1)
  - `limit`: int >= 1, <= 100 (default: 20)

- Response `200`:

```json
{
  "data": [
    {
      "id": 100,
      "content": "Great story!",
      "userId": 1,
      "storyId": 1,
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

- Error:
  - `400`: param/query invalid

### D6) `GET /stories/:storyId/ratings`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Query (optional): `page`, `limit` giống comments

- Response `200`:

```json
{
  "data": [
    {
      "id": 200,
      "score": 5,
      "userId": 1,
      "storyId": 1,
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "total": 17,
  "page": 1,
  "limit": 20
}
```

### D7) `GET /stories/:storyId/ratings/summary`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Response `200`:

```json
{
  "storyId": 1,
  "averageScore": 4.67,
  "totalRatings": 3
}
```

### D8) `GET /stories/:storyId/chapters/:chapterId/next`

- Auth: **Yes**
- Params:
  - `storyId` (number)
  - `chapterId` (number)
- Response `200`:

```json
{
  "next": {
    "id": 11,
    "title": "Chapter 2",
    "content": "...",
    "chapterNumber": 2,
    "storyId": 1,
    "createdAt": "2026-04-16T12:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

Hoặc nếu đã là chapter cuối:

```json
{
  "next": null
}
```

- Error:
  - `400`: param invalid
  - `404`: chapter không tồn tại trong story

### D9) `GET /stories/:storyId/chapters/:chapterId/previous`

- Auth: **Yes**
- Params:
  - `storyId` (number)
  - `chapterId` (number)
- Response `200`:

```json
{
  "previous": {
    "id": 10,
    "title": "Chapter 1",
    "content": "...",
    "chapterNumber": 1,
    "storyId": 1,
    "createdAt": "2026-04-16T12:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

Hoặc nếu đã là chapter đầu:

```json
{
  "previous": null
}
```

---

## E. Chapters

### E1) `POST /chapters`

- Auth: **Yes**
- Body:

```json
{
  "title": "Chapter 1",
  "content": "The beginning...",
  "chapterNumber": 1,
  "storyId": 1
}
```

Validation:

- `title`: string, required
- `content`: string, required
- `chapterNumber`: int >= 1
- `storyId`: int >= 1

- Response `201`: Chapter object
- Error:
  - `400`: body invalid
  - `404`: story không tồn tại

### E2) `GET /chapters/story/:storyId`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Query (optional): `page`, `limit`
- Response:
  - kiểu mảng `Chapter[]` nếu không truyền phân trang
  - hoặc kiểu `{ data, meta }` nếu có truyền phân trang
- Error:
  - `400`: param/query invalid
  - `404`: story không tồn tại

### E3) `GET /chapters/:id`

- Auth: **Yes**
- Params:
  - `id` (number)
- Response `200`: Chapter object
- Error:
  - `400`: `id` invalid
  - `404`: chapter không tồn tại

---

## F. Reading Progress

### F1) `POST /reading-progress`

- Auth: **Yes**
- Body:

```json
{
  "userId": 1,
  "storyId": 1,
  "chapterId": 10,
  "scrollPosition": 150,
  "readingMode": "day"
}
```

Validation:

- `userId`: int
- `storyId`: int
- `chapterId`: int
- `scrollPosition`: int >= 0
- `readingMode`: `day|night|scroll|page-flip`

- Response `201`: ReadingProgress object
- Error:
  - `400`: body invalid
  - `404`: user/story/chapter không tồn tại, hoặc chapter không thuộc story

### F2) `GET /reading-progress`

- Auth: **Yes**
- Query:
  - `userId` (required)
  - `storyId` (required)
- Response `200`: ReadingProgress object
- Error:
  - `404`: chưa có progress cho user+story đó

---

## G. Reading Mode

### G1) `GET /reading-mode/modes`

- Auth: **Yes**
- Request: không có
- Response `200`:

```json
{
  "modes": ["day", "night", "scroll", "page-flip"]
}
```

### G2) `GET /reading-mode/current`

- Auth: **Yes**
- Query (optional):
  - `userId`: int
  - `storyId`: int

- Response `200`:

```json
{
  "mode": "night"
}
```

Gợi ý dùng FE:

- Có cả `userId + storyId` để lấy mode theo story
- Có `userId` để lấy user override

- Error:
  - `400`: query invalid

### G3) `POST /reading-mode/set`

- Auth: **Yes**
- Body:

```json
{
  "userId": 1,
  "storyId": 1,
  "mode": "night"
}
```

`storyId` optional.

- Response `201`:

```json
{
  "mode": "night"
}
```

- Error:
  - `400`: body invalid hoặc mode không hợp lệ

### G4) `POST /reading-mode/render`

- Auth: **Yes**
- Body:

```json
{
  "content": "Long chapter text...",
  "mode": "scroll",
  "userId": 1,
  "storyId": 1
}
```

`mode`, `userId`, `storyId` đều optional.

- Response `201`:

```json
{
  "content": "Long chapter text...",
  "mode": "scroll",
  "styles": {
    "backgroundColor": "#f5f5f5",
    "color": "#333333",
    "fontFamily": "Verdana, sans-serif",
    "lineHeight": "1.6",
    "padding": "1.5rem",
    "overflowY": "auto"
  },
  "metadata": {
    "scrollable": true,
    "layout": "continuous"
  }
}
```

`metadata` có thể khác theo mode (ví dụ `page-flip` có `totalPages`, `pages`, ...).

- Error:
  - `400`: body invalid

---

## H. Comments

### H1) `POST /comments`

- Auth: **Yes**
- Body:

```json
{
  "content": "Great story!",
  "userId": 1,
  "storyId": 1
}
```

Validation:

- `content`: string, required
- `userId`: int >= 1
- `storyId`: int >= 1

- Response `201`: Comment object
- Error:
  - `400`: body invalid
  - `404`: story hoặc user không tồn tại

### H2) `GET /comments/story/:storyId`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Query (optional):
  - `page`: int >= 1 (default 1)
  - `limit`: int >= 1, <= 100 (default 20)

- Response `200`:

```json
{
  "data": [
    {
      "id": 100,
      "content": "Great story!",
      "userId": 1,
      "storyId": 1,
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### H3) `PATCH /comments/:id`

- Auth: **Yes**
- Params:
  - `id` (number)
- Body:

```json
{
  "content": "Updated comment content"
}
```

Validation:

- `content`: string, required, not empty

- Response `200`: Comment object sau update
- Error:
  - `400`: body/param invalid
  - `403`: không phải owner comment
  - `404`: comment không tồn tại

### H4) `DELETE /comments/:id`

- Auth: **Yes**
- Params:
  - `id` (number)
- Response `200`:

```json
{
  "message": "Comment deleted"
}
```

- Error:
  - `400`: param invalid
  - `403`: không phải owner comment
  - `404`: comment không tồn tại

---

## I. Ratings

### I1) `POST /ratings`

- Auth: **Yes**
- Body:

```json
{
  "score": 5,
  "userId": 1,
  "storyId": 1
}
```

Validation:

- `score`: int, từ 1 đến 5
- `userId`: int >= 1
- `storyId`: int >= 1

- Response `201`: Rating object

> Endpoint này là **upsert** theo cặp `(userId, storyId)`.

- Error:
  - `400`: body invalid
  - `404`: user hoặc story không tồn tại

### I2) `GET /ratings/story/:storyId`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Query (optional):
  - `page`: int >= 1 (default 1)
  - `limit`: int >= 1, <= 100 (default 20)

- Response `200` (PaginatedResult):

```json
{
  "data": [
    {
      "id": 200,
      "score": 5,
      "userId": 1,
      "storyId": 1,
      "createdAt": "2026-04-16T12:00:00.000Z",
      "updatedAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### I3) `GET /ratings/story/:storyId/summary`

- Auth: **Yes**
- Params:
  - `storyId` (number)
- Response `200`:

```json
{
  "storyId": 1,
  "averageScore": 4.67,
  "totalRatings": 3
}
```

### I4) `DELETE /ratings/:id`

- Auth: **Yes**
- Params:
  - `id` (number)
- Response `200`:

```json
{
  "message": "Rating deleted"
}
```

- Error:
  - `400`: param invalid
  - `403`: không phải owner rating
  - `404`: rating không tồn tại

---

## J. Notifications

### J1) `POST /notifications/subscribe`

- Auth: **Yes**
- Body:

```json
{
  "userId": 2,
  "storyId": 1
}
```

- Response `201`:

```json
{
  "message": "User 2 subscribed to story 1 updates"
}
```

> Nếu đã subscribe trước đó:

```json
{
  "message": "User 2 is already subscribed to story 1"
}
```

### J2) `POST /notifications/unsubscribe`

- Auth: **Yes**
- Body:

```json
{
  "userId": 2,
  "storyId": 1
}
```

- Response `201`:

```json
{
  "message": "User 2 unsubscribed from story 1 updates"
}
```

> Nếu chưa subscribe:

```json
{
  "message": "User 2 is not subscribed to story 1"
}
```

### J3) `GET /notifications`

- Auth: **Yes**
- Request: không có
- Response `200`:

```json
{
  "notifications": [
    "[2026-04-16T12:00:00.000Z] User 2 notified: New chapter \"Chapter 1\" (Ch.10) added to story 1"
  ]
}
```

### J4) `GET /notifications/subscribers`

- Auth: **Yes**
- Request: không có
- Response `200`:

```json
{
  "count": 5
}
```

### J5) `GET /notifications/user/:userId`

- Auth: **Yes**
- Params:
  - `userId` (number)
- Query (optional):
  - `page`: int >= 1 (default 1)
  - `limit`: int >= 1, <= 100 (default 20)
  - `unreadOnly`: boolean (`true`/`false`, default `false`)

- Response `200` (PaginatedResult):

```json
{
  "data": [
    {
      "id": 400,
      "userId": 2,
      "storyId": 1,
      "chapterId": 10,
      "message": "New chapter \"Chapter 1\" (Ch.10) added to story 1",
      "isRead": false,
      "createdAt": "2026-04-16T12:00:00.000Z"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20
}
```

- Error:
  - `400`: param/query invalid
  - `403`: token user khác `:userId`

### J6) `PATCH /notifications/:id/read`

- Auth: **Yes**
- Params:
  - `id` (number)
- Response `200` (Notification sau update):

```json
{
  "id": 400,
  "userId": 2,
  "storyId": 1,
  "chapterId": 10,
  "message": "New chapter \"Chapter 1\" (Ch.10) added to story 1",
  "isRead": true,
  "createdAt": "2026-04-16T12:00:00.000Z"
}
```

- Error:
  - `400`: param invalid
  - `403`: không phải owner notification
  - `404`: notification không tồn tại

---

## 4) Luồng FE khuyến nghị (ngắn gọn)

1. Register/Login lấy `access_token`.
2. Lưu token và attach vào mọi request protected.
3. Khi gọi list API:
   - Kiểm tra endpoint đó thuộc pagination kiểu A hay B.
4. Với stories/chapters list:
   - Nếu muốn response ổn định, luôn truyền `page` + `limit` để nhận dạng `{ data, meta }`.
5. Với notifications:
   - Dùng `unreadOnly=true` để badge unread.
   - Gọi `PATCH /notifications/:id/read` sau khi user mở chi tiết.

---

## 5) Checklist nhanh cho FE integration

- [ ] Gắn `Authorization: Bearer <token>` cho toàn bộ endpoint protected
- [ ] Handle 401 (token hết hạn/invalid)
- [ ] Handle 403 (không đúng quyền owner)
- [ ] Handle 404 (resource không tồn tại)
- [ ] Handle 400 validation (`message` có thể là array)
- [ ] Normalize 2 kiểu pagination (A và B)
