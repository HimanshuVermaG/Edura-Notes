# Notes Handling – Project Documentation

This document describes the **Notes Handling** (Edura Notes) project in full so it can be understood and rebuilt from scratch. It covers folder/file structure, tech stack, every major file and its role, API contracts, data models, and features.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Environment & Setup](#4-environment--setup)
5. [Server Implementation](#5-server-implementation)
6. [Client Implementation](#6-client-implementation)
7. [API Reference](#7-api-reference)
8. [Data Models](#8-data-models)
9. [Features Summary](#9-features-summary)
10. [Rebuild Checklist](#10-rebuild-checklist)

---

## 1. Overview

**Notes Handling** is a full-stack web app for storing and organizing notes (PDFs and images) in folders. Users sign up/sign in, create folders (up to 2 levels: root and subfolder), upload files with title and optional description, and view them in a secure viewer (no copy/print/drag). Notes can be filtered by folder, searched (case-insensitive), and sorted by name, size, or time. Moving a note to another folder is done only via the Edit note form (no drag-and-drop onto folders).

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth, Multer for file uploads.
- **Frontend:** React 18, Vite, React Router, react-pdf for PDFs. Bootstrap 5 + custom Edura theme (CSS variables).
- **Auth:** JWT stored in `localStorage`; `Authorization: Bearer <token>` on API requests.

---

## 2. Tech Stack & Dependencies

### Server (`server/package.json`)

| Package     | Purpose                |
|------------|------------------------|
| express    | Web server             |
| mongoose   | MongoDB ODM            |
| dotenv     | Load `.env`            |
| cors       | CORS middleware        |
| jsonwebtoken | JWT sign/verify      |
| bcryptjs   | Password hashing       |
| multer     | Multipart file upload  |
| cloudinary | Cloudinary Node SDK (file storage) |

### Client (`client/package.json`)

| Package         | Purpose                    |
|-----------------|----------------------------|
| react           | UI library                 |
| react-dom       | React DOM renderer         |
| react-router-dom| Routing                    |
| react-pdf       | PDF rendering (pdf.js)     |
| vite            | Build tool & dev server    |
| @vitejs/plugin-react | Vite React plugin   |

### External (CDN in `client/index.html`)

- Bootstrap 5.3.2 (CSS + JS)
- Google Fonts: Inter

---

## 3. Project Structure

```
Notes Handling/
├── .gitignore
├── README.md
├── PROJECT.md                 # This file
├── client/
│   ├── index.html             # Entry HTML; Bootstrap & Inter
│   ├── package.json
│   ├── vite.config.js         # Vite config; proxy /api -> server
│   └── src/
│       ├── main.jsx           # React root; BrowserRouter, AuthProvider, App
│       ├── App.jsx             # Routes only
│       ├── api/
│       │   └── client.js       # api(), apiForm(), apiGetBlob(); token in headers
│       ├── context/
│       │   └── AuthContext.jsx # Auth state, setToken, signOut, /api/auth/me
│       ├── components/
│       │   ├── Layout.jsx           # Header (nav), main, footer
│       │   ├── ProtectedRoute.jsx   # Redirect to /signin if not authenticated
│       │   ├── FolderList.jsx       # Categories sidebar; tree, multi-select, CRUD folders
│       │   ├── NoteCard.jsx         # Single note card (grid/list); View/Edit/Delete
│       │   ├── SortBySelect.jsx     # Sort by Name/Size/Time
│       │   ├── ViewModeToggle.jsx   # Grid/List
│       │   ├── SecureNoteViewer.jsx # PDF (react-pdf) / image viewer; no copy/drag
│       │   └── SecureNoteViewerLazy.jsx # Lazy load SecureNoteViewer
│       ├── pages/
│       │   ├── SignUp.jsx      # POST /auth/signup
│       │   ├── SignIn.jsx      # POST /auth/signin
│       │   ├── Homepage.jsx    # /home; view-only notes + folders; search; no file name
│       │   ├── Manage.jsx      # /manage; upload, folders sidebar, notes grid/list, search
│       │   ├── EditNote.jsx    # /notes/:id/edit; title, folder, replace file
│       │   ├── ViewNote.jsx    # /notes/:id -> redirect to /notes/:id/view
│       │   ├── FullScreenPdfView.jsx # /notes/:id/view; SecureNoteViewer + zoom bar
│       │   ├── NewNote.jsx     # Standalone upload form; /notes/new -> /manage
│       │   └── Dashboard.jsx   # Optional; not in App routes (redirect /dashboard -> /home)
│       ├── styles/
│       │   └── edura.css       # Theme variables, layout, components, upload, sidebar
│       └── utils/
│           ├── folderTree.js   # buildFolderTree, flattenFolderTreeForSelect, getFolderIdAndDescendantIds, etc.
│           └── sortNotes.js   # sortNotes(notes, folders, sortBy)
├── server/
│   ├── .env                    # MONGODB_URI, JWT_SECRET, PORT, CLOUDINARY_*
│   ├── package.json
│   ├── index.js                # Express app; CORS; /api/auth, /api/folders, /api/notes; MongoDB connect
│   ├── lib/
│   │   └── cloudinary.js       # Cloudinary v2 config (cloud_name, api_key, api_secret)
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verify; set req.user
│   │   └── uploadMiddleware.js # Multer memoryStorage; PDF + images; 20MB; getUploadPath() for legacy
│   ├── models/
│   │   ├── User.js             # name, email, password (bcrypt); comparePassword
│   │   ├── Note.js             # title, description, fileName, fileUrl, originalName, mimeType, size, userId, folderId
│   │   └── Folder.js            # name, userId, parentId, order
│   ├── routes/
│   │   ├── authRoutes.js       # POST /signup, POST /signin, GET /me
│   │   ├── folderRoutes.js     # GET/, POST/, PUT/:id, DELETE/:id; search; cycle check
│   │   └── noteRoutes.js       # GET/, GET/:id, GET/:id/file, POST/, PUT/:id, DELETE/:id
│   └── scripts/
│       └── seedDemoUser.js     # Create demo@example.com / demo123456
```

---

## 4. Environment & Setup

### Server environment (`server/.env`)

Set in `server/.env`:

- `MONGODB_URI` – e.g. `mongodb://localhost:27017/notes-app`
- `JWT_SECRET` – secret for signing JWTs (change in production)
- `PORT` – e.g. `5001`
- **Cloudinary** (for file storage): get from [Dashboard](https://console.cloudinary.com/) → Settings → Security → API Keys. Never expose the API secret to the client.
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Optional: `CLIENT_ORIGIN` – CORS origin (defaults include localhost:5173, 3000)

### Run

- **Server:** `cd server && npm install && npm run dev` (or `npm start`)
- **Client:** `cd client && npm install && npm run dev` (Vite proxies `/api` to `http://localhost:5001`)
- **Demo user:** `cd server && npm run seed:demo` (creates demo@example.com / demo123456)

### Build for production

- Client: `cd client && npm run build` → `dist/`
- Serve `dist` as static files and keep API on same origin or set CORS and `CLIENT_ORIGIN`.

---

## 5. Server Implementation

### 5.1 `server/index.js`

- Loads `dotenv/config`.
- Creates Express app; `cors({ origin, credentials: true })`; `express.json()`.
- Mounts: `/api/auth` → authRoutes, `/api/folders` → folderRoutes, `/api/notes` → noteRoutes.
- `GET /api/health` → `{ ok: true }`.
- Connects to MongoDB with `MONGODB_URI`; on success, listens on `PORT`.

### 5.2 Middleware

**authMiddleware.js**

- Reads `Authorization: Bearer <token>`.
- Verifies JWT with `JWT_SECRET`; loads user by `decoded.userId`, excludes password; sets `req.user`.
- On missing/invalid token or user not found: `401` with message.

**uploadMiddleware.js**

- Multer **memoryStorage** so file is in `req.file.buffer` for Cloudinary upload.
- Allowed: PDF, JPEG, PNG, GIF, WebP (by extension and mimetype); max 20MB.
- Exports: `uploadPdf` (multer instance), `getUploadPath(fileName)` (absolute path for legacy disk files).

### 5.3 Models

**User.js**

- Schema: `name` (String, required), `email` (String, required, unique, lowercase), `password` (String, required, minLength 6).
- Pre-save: hash password with bcrypt (10 rounds) if modified.
- Method: `comparePassword(candidate)` → bcrypt.compare.

**Note.js**

- Schema: `title` (String, required), `description` (String, default ''), `fileName` (String, required; for Cloudinary notes = public_id, for legacy = disk filename), `fileUrl` (String, optional; Cloudinary secure_url for delivery), `originalName` (String), `mimeType` (String), `size` (Number), `userId` (ObjectId, ref User), `folderId` (ObjectId, ref Folder, default null). Timestamps.

**Folder.js**

- Schema: `name` (String, required), `userId` (ObjectId, ref User), `parentId` (ObjectId, ref Folder, default null), `order` (Number). Timestamps.

### 5.4 Routes (high level)

**authRoutes.js**

- `POST /signup`: body `{ name, email, password }`; validate; create user; JWT 7d; return `{ token, user }`.
- `POST /signin`: body `{ email, password }`; comparePassword; JWT 7d; return `{ token, user }`.
- `GET /me`: authMiddleware; return `{ user: req.user }`.

**folderRoutes.js** (all use authMiddleware)

- `GET /`: filter by `userId`; optional `?search=` (case-insensitive regex on name); sort order, createdAt.
- `POST /`: body `{ name, parentId? }`; create folder.
- `PUT /:id`: update name and/or parentId; prevent self-parent and cycle (isDescendantOf).
- `DELETE /:id`: reparent children to deleted folder’s parent; set notes’ folderId to null; delete folder.

**noteRoutes.js** (all use authMiddleware)

- `GET /`: filter by userId; optional `folderIds=id1,null,id2`; optional `search=` (case-insensitive on title, description, originalName); populate `userId` with `name`; sort updatedAt desc.
- `GET /:id`: populate `userId` with `name`; return note.
- `GET /:id/file`: if note has `fileUrl`, 302 redirect to Cloudinary CDN URL; else stream file from disk (legacy).
- `POST /`: uploadPdf.single('file'); upload buffer to Cloudinary (resource_type raw/image); create Note with fileUrl, fileName=public_id, metadata; no disk write.
- `PUT /:id`: optional file upload; if new file: upload to Cloudinary; delete old asset (Cloudinary destroy or disk unlink); update note with new fileUrl/fileName. Else update title/description/folderId only.
- `DELETE /:id`: if note has fileUrl, Cloudinary destroy(public_id); else delete disk file; delete note document.

---

## 6. Client Implementation

### 6.1 Entry and routing

- **main.jsx:** Renders `<BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>`, imports `edura.css`.
- **App.jsx:** Declares all routes; protected routes wrap content in `<ProtectedRoute>`.

**Routes:**

| Path              | Component        | Protected | Notes                          |
|-------------------|------------------|-----------|--------------------------------|
| /signup           | SignUp           | No        |                                |
| /signin           | SignIn           | No        |                                |
| /home             | Homepage         | Yes       |                                |
| /manage           | Manage           | Yes       |                                |
| /notes/new        | Navigate → /manage | -       |                                |
| /notes/:id/view   | FullScreenPdfView| Yes       |                                |
| /notes/:id/edit   | EditNote         | Yes       |                                |
| /notes/:id        | ViewNote         | Yes       | Redirect to /notes/:id/view    |
| /                 | Navigate → /home | -         |                                |
| /dashboard        | Navigate → /home | -         |                                |
| *                 | Navigate → /home | -         |                                |

### 6.2 API client (`api/client.js`)

- **getToken():** `localStorage.getItem('notes_token')`.
- **api(url, options):** JSON requests; prepends `/api` if url not absolute; adds `Authorization: Bearer` if token; throws on !res.ok with body message.
- **apiForm(url, formData, options):** Same but no Content-Type (FormData); for file upload.
- **apiGetBlob(url):** GET with token; returns `res.blob()`; throws on !res.ok.

### 6.3 Auth context (`context/AuthContext.jsx`)

- State: `user`, `token`, `loading`.
- **setToken(newToken, newUser):** Store token and user in localStorage; update state; if no token, clear storage and state.
- **signOut():** setToken(null).
- Effect: when token exists, call `GET /api/auth/me`; on success set user and store; on failure setToken(null). Sets loading false.
- **useAuth():** Returns `{ user, token, setToken, signOut, loading, isAuthenticated }`.

### 6.4 Components (summary)

- **ProtectedRoute:** Uses useAuth(); while loading shows spinner; if !isAuthenticated redirects to /signin with state.from; else renders children.
- **Layout:** Header (brand, Home, Manage, user name, Sign Out / Sign In, Sign Up), main slot, footer. Uses useAuth() for auth UI.
- **FolderList:** Builds tree from folders (folderTree.js); “All Notes”, “Uncategorized”, then root folders (sorted by name); expand/collapse for subfolders (2 levels); multi-select with cascading (selecting root selects subfolders); readOnly hides add/rename/delete; add folder form with parent dropdown; rename inline (row with input + Save/Cancel).
- **NoteCard:** Props: note, onDeleted, viewMode, showActions, folderName, showFileName. Renders title; optionally file name (label); folder badge; description (if any); “Uploaded by {name}”; View / Edit / Delete. List vs grid layout. showFileName=false used on Homepage.
- **SortBySelect:** Dropdown: Name, Size, Time; controlled by sortBy / onSortByChange.
- **ViewModeToggle:** Two buttons: Grid, List; controlled by viewMode / onViewModeChange.
- **SecureNoteViewer:** Fetches file via apiGetBlob(`/notes/${noteId}/file`), creates object URL. PDF: react-pdf Document/Page, no text layer (no copy). Image: img with same URL. Prevents context menu and drag. Watermark/no-drag classes. Zoom prop for scale. fullScreen layout for FullScreenPdfView.
- **SecureNoteViewerLazy:** React.lazy(SecureNoteViewer) with Suspense and spinner fallback.

### 6.5 Pages (summary)

- **SignUp:** Form name, email, password; POST /auth/signup; setToken; navigate to /signin.
- **SignIn:** Form email, password; POST /auth/signin; setToken; navigate to location.state.from or /home.
- **Homepage:** Layout + sidebar (FolderList readOnly) + main. Fetches notes/folders with notesUrl (search + folderIds). Search bar: input + Search button; search only on button click or Enter; clearing input sets searchQuery '' and shows all. Sort, view mode. Renders notes by folder (foldersInOrder); empty state when no notes. NoteCard with showActions=false, showFileName=false.
- **Manage:** Same layout as Homepage but FolderList readOnly=false. Upload section: dropzone (drag/drop or choose file), title, folder select, description textarea, Upload/Clear. notesUrl same as Homepage. Sort, view mode. NoteCard with showActions=true, showFileName=true. Empty state with link to upload section.
- **EditNote:** Load note and folders; form: title, folder select, optional file replace; Save updates via PUT (JSON if no file, FormData if file); Delete note; Cancel/Back to /manage.
- **ViewNote:** Redirect to `/notes/:id/view`.
- **FullScreenPdfView:** Load note by id; top bar with title, zoom controls (0.5–3), Close link; SecureNoteViewerLazy with noteId, fullScreen, zoom. Prevents context menu and drag on wrapper.
- **NewNote:** Simple upload form (title, file, folder); POST /notes; navigate to /dashboard (which redirects to /home). Route /notes/new in App redirects to /manage so primary upload is on Manage.

### 6.6 Utils

- **folderTree.js:** buildFolderTree(folders) → roots with nested children, sorted by name at each level. flattenFolderTreeForSelect(tree) for parent dropdown (max 2 levels). getMaxFolderDepth() → 2. getFoldersInTreeOrder(folders). findNodeInTree, getFolderIdAndDescendantIds(tree, folderId) for cascading folder selection.
- **sortNotes.js:** sortNotes(notes, folders, sortBy) where sortBy is 'name'|'size'|'time'; returns new sorted array.

### 6.7 Styles (`edura.css`)

- CSS variables: --edura-primary, --edura-primary-dark, --edura-text, --edura-text-muted, --edura-border, --edura-card-bg, --edura-radius.
- Header/footer (edura-header, edura-footer), auth page, cards, buttons (btn-edura).
- Categories sidebar: .categories-sidebar, .folder-list-item, .folder-chevron, .folder-edit-row, .folder-edit-input, .folder-edit-actions, depth classes, nested list.
- Upload: .upload-file-section, .upload-file-dropzone, .upload-file-meta, .upload-file-description, .upload-file-actions.
- Search bar: .search-bar, .search-bar-btn (theme primary).
- Secure viewer: .secure-note-viewer, .no-drag, fullscreen, watermark.
- Fullscreen PDF bar and zoom.
- App layout: .app-with-sidebar, .categories-main.

---

## 7. API Reference

Base URL: `/api` (e.g. `http://localhost:5001/api`). All routes except auth signup/signin require `Authorization: Bearer <token>`.

### Auth

- `POST /auth/signup` — Body: `{ name, email, password }`. Returns `{ token, user: { _id, name, email } }`.
- `POST /auth/signin` — Body: `{ email, password }`. Returns `{ token, user }`.
- `GET /auth/me` — Returns `{ user }` (no password).

### Folders

- `GET /folders?search=` — List user’s folders; optional case-insensitive search on name.
- `POST /folders` — Body: `{ name, parentId? }`. Returns created folder.
- `PUT /folders/:id` — Body: `{ name?, parentId? }`. Returns updated folder.
- `DELETE /folders/:id` — Reparent children; unlink notes; delete folder. Returns `{}`.

### Notes

- `GET /notes?folderIds=id1,null,id2&search=` — List user’s notes; filter by folderIds (null = uncategorized); optional case-insensitive search on title, description, originalName. Returns array with userId populated (name).
- `GET /notes/:id` — Single note; userId populated.
- `GET /notes/:id/file` — Binary file stream; set Content-Type, Content-Disposition.
- `POST /notes` — Multipart: file (required), title, description?, folderId?. Returns created note.
- `PUT /notes/:id` — Multipart optional: file; body: title?, description?, folderId?. Returns updated note.
- `DELETE /notes/:id` — Delete file and note. Returns `{}`.

---

## 8. Data Models

### User

| Field     | Type     | Notes           |
|----------|----------|-----------------|
| name     | String   | required        |
| email    | String   | required, unique, lowercase |
| password | String   | required, min 6; hashed in pre-save |
| createdAt, updatedAt | Date | timestamps |

### Folder

| Field     | Type     | Notes           |
|----------|----------|-----------------|
| name     | String   | required        |
| userId   | ObjectId | ref User        |
| parentId | ObjectId | ref Folder, null = root |
| order    | Number   | default 0       |
| createdAt, updatedAt | Date | timestamps |

### Note

| Field       | Type     | Notes           |
|------------|----------|-----------------|
| title      | String   | required        |
| description| String   | default ''      |
| fileName   | String   | stored name in uploads/ |
| originalName | String | user’s filename |
| mimeType   | String   | default application/pdf |
| size       | Number   | optional        |
| userId     | ObjectId | ref User        |
| folderId   | ObjectId | ref Folder, null |
| createdAt, updatedAt | Date | timestamps |

---

## 9. Features Summary

- **Auth:** Sign up, sign in, JWT 7d, /me; protected routes redirect to signin.
- **Folders:** CRUD; 2-level hierarchy (root, subfolder); sorted by name; expand/collapse in sidebar; multi-select with cascading; search folders by name.
- **Notes:** Upload PDF/images (JPEG, PNG, GIF, WebP), max 20MB; title, optional description, optional folder; list/get with folder filter and search (title, description, originalName); edit title, folder, description, optional file replace; delete; author (userId) populated and shown on cards.
- **Search:** Case-insensitive; runs on Search button click or Enter; clearing search input shows all; applies to notes and folders.
- **Sort:** Name, Size, Time (newest first).
- **View:** Grid / List; Homepage hides file name on cards; Manage shows file name.
- **Viewer:** Full-screen view at /notes/:id/view; PDF (react-pdf, no text layer), images; zoom; no right-click, no drag; move note only via Edit (folder dropdown).
- **Upload UI:** Dashed dropzone, choose file, title, folder, description, Upload/Clear.

---

## 10. Rebuild Checklist

1. **Repo:** Create root folder; init git; add .gitignore (node_modules, .env, dist, server/uploads, etc.).
2. **Server:** npm init; install express, mongoose, dotenv, cors, jsonwebtoken, bcryptjs, multer; create index.js, server/.env with required variables; middleware (auth, upload); models (User, Note, Folder); routes (auth, folders, notes); seed script.
3. **Client:** Vite + React; install react-router-dom, react-pdf; index.html with Bootstrap and Inter; main.jsx (Router, AuthProvider, App); App.jsx routes; api client (api, apiForm, apiGetBlob); AuthContext; ProtectedRoute; Layout; pages (SignUp, SignIn, Homepage, Manage, EditNote, ViewNote, FullScreenPdfView, NewNote); components (FolderList, NoteCard, SortBySelect, ViewModeToggle, SecureNoteViewer, SecureNoteViewerLazy); utils (folderTree, sortNotes); edura.css. Vite proxy /api to server.
4. **Verify:** Sign up, sign in, create folders, upload notes, search, sort, view, edit (change folder), delete note/folder, full-screen viewer and zoom.

---

*End of PROJECT.md*
