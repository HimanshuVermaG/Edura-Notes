# Edura Notes

A full-stack notes app where users sign in with Google (or email/password), organize notes in folders, upload PDFs and images (or link a Google Drive file) up to 10 MB, and view them in a secure viewer (no copy/print). Users can join subject-based **Community** spaces to share and discover notes, use a built-in **UGC NET Score Calculator**, and browse public profiles. Admins manage users, storage, community spaces/categories, pending community contributions, and what appears on public profiles.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Main features](#main-features)
- [Site structure and routes](#site-structure-and-routes)
- [Page and feature index](#page-and-feature-index)
- [Linking and navigation](#linking-and-navigation)
- [Prerequisites](#prerequisites)
- [Install & run](#install--run)
- [Environment variables](#environment-variables)
- [Main functions & implementation](#main-functions--implementation)
- [External services & setup](#external-services--setup)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [API reference](#api-reference)
- [Data models](#data-models)
- [Security (note viewer)](#security-note-viewer)
- [Important points](#important-points)

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Frontend | React 18, Vite 5, React Router 6, Bootstrap 5, react-pdf (PDF.js), lucide-react (icons), recharts (admin charts) |
| Backend  | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth     | Google OAuth 2.0 (google-auth-library) or email/password (bcrypt), JWT |
| File storage | Cloudinary (uploads), Google Drive link (proxy-streamed), local `server/uploads/` (legacy) |

---

## Main features

- **Google or email sign-in** – JWT-based session; `ADMIN_EMAIL` auto-promotes a matching account to admin on any sign-in method.
- **Dashboard (signed-in home)** – Browse notes by folder, search, notes grouped by folder/uncategorized.
- **Manage** – Upload PDF/images (max 10 MB) or attach a **Google Drive link** instead of a file; create/edit folders (2 levels); set public/private; bulk move/delete/visibility actions; **Trash** (soft-delete with 30-day auto-purge, restore, or purge immediately).
- **Folders** – Two-level (root + subfolder); filter notes by folder; sidebar on Dashboard and Manage.
- **Secure note viewer** – PDF/images in-app; no copy, no print, no drag; lazy-loaded PDF pages; PDF.js worker served from app origin.
- **Community** – Subject-based spaces (e.g. by topic/category) that users can join/leave; browse notes grouped by topic; **contribute** an existing personal note to a space (goes to `pending` review) or **remove** it back to personal-only; upvote/downvote and comment on community notes; Top Contributors leaderboard.
- **UGC NET Score Calculator** (`/score-calculator`) – Upload a saved NTA Response Sheet + Answer Key (`.html`/`.htm` or `.mht`/`.mhtml` — both "Webpage, HTML only" and "Webpage, Single File" browser save options work), get an instant score with configurable marking scheme, section-wise breakdown, and a searchable/filterable question-wise table with CSV export and print. Runs entirely client-side — nothing is uploaded to the server.
- **Public profiles & files** – Users can mark notes public; a profile is visible if the owner has any public/community-approved note or an admin set "List profile on Explore". Profiles show contributor badges (Contributor/Bronze/Silver/Gold by note count).
- **Admin panel** – Separate login at `/admin/login`; user management (search, storage limit, delete, "List profile on Explore"); note moderation ("List on Explore", bulk delete); **Community admin console** on the dashboard: create/edit/delete community spaces, manage community categories, review pending community-note contributions (approve/reject, single or bulk).
- **Storage** – Per-user limit (default 50 MB); enforced on upload; admin can change limit per user; `GET /api/notes/storage` reports usage.
- **Profile editing** – Signed-in users can edit their name, bio, and social links (GitHub/LinkedIn/Twitter/website) from a profile modal in the navbar.
- **Sticky-note annotations** – Backend model + full CRUD API exist (`/api/annotations`, per-note and per-user scoped), but this is **not yet wired into any viewer UI** — worth knowing if you're picking up loose threads in this codebase.

---

## Site structure and routes

All routes are defined in `client/src/App.jsx`. Protected routes use `ProtectedRoute`; admin routes use `AdminRoute` (and `AdminLayout` except for the admin note viewer).

### Public / unauthenticated

| Path | Renders | Layout | Notes |
|------|--------|--------|--------|
| `/` | Redirect | — | → `/dashboard` if authenticated, else `/community` |
| `/community` | Community | Layout | Browse/join community spaces, view notes, vote, comment |
| `/explore` | Redirect → `/community` | — | Legacy path kept for old links |
| `/score-calculator` | ScoreCalculator | Layout | UGC NET score calculator; public, no sign-in required |
| `/signin` | SignIn | Layout | Google + email sign-in/sign-up tabs; `state.mode === 'signup'` |
| `/signup` | Redirect → `/signin` with `state.mode: 'signup'` | — | — |
| `/profile/:userId` | PublicProfile | Layout | Public profile: badges, folders, public/community-approved notes |
| `/view/note/:id` | PublicNoteView | **No** (full-screen viewer) | Secure viewer; zoom; Back to profile / Home |
| `/admin/login` | AdminLogin | **No** (standalone dark card) | Google + email/password sign-in; "Back to main site" |

### Protected (signed-in, non-admin)

| Path | Renders | Layout | Notes |
|------|--------|--------|--------|
| `/dashboard` | Dashboard | Layout | Sidebar FolderList (readOnly), search, notes by folder, NoteCard (view only) |
| `/home` | Redirect → `/dashboard` | — | Legacy path kept for old links |
| `/manage` | Manage | Layout | Upload (file or Drive link), storage bar, folders (editable), notes grid/list, bulk actions, Trash |
| `/notes/new` | Redirect → `/manage` | — | — |
| `/notes/:id/view` | FullScreenPdfView | **No** | Secure viewer; zoom; Close → `location.state.from` or `/dashboard` |
| `/notes/:id/edit` | EditNote | Layout | Title, description, folder, visibility, replace file / Drive link; Save/Cancel/Delete |

### Admin (requires `user.role === 'admin'`)

`AdminRoute`: loading → spinner; no user → redirect `/admin/login`; not admin → redirect `/dashboard`. For `/admin/view/note/:noteId` it renders only the page (no AdminLayout). All other admin paths render `AdminLayout` + page.

| Path | Renders | Layout | Notes |
|------|--------|--------|--------|
| `/admin` | Redirect → `/admin/dashboard` | — | — |
| `/admin/dashboard` | AdminDashboard | AdminLayout | Stats + daily-signup/upload charts; **Community admin console** (spaces, categories, pending contribution review) |
| `/admin/users` | AdminUsers | AdminLayout | Table: name, email, notes count, storage, created; search; pagination |
| `/admin/users/:userId` | AdminUserDetail | AdminLayout | User card, delete user (unless self), storage limit, paginated notes with "List on Explore" per note, delete selected notes |
| `/admin/view/note/:noteId` | AdminNoteView | **No** (full-screen) | Secure viewer; "List on Explore" checkbox; Back to user |

**AdminLayout:** Sidebar (Dashboard, Users), logout → `/admin/login`, topbar with user name.

### Catch-all

| Path | Behavior |
|------|----------|
| `*` | Redirect → `/` |

---

## Page and feature index

- **Community** (`client/src/pages/Community.jsx`) – Homepage grid of spaces (search, category filter, joined vs. discover, Top Contributors) or a space's detail view (topics sidebar, note feed, join/leave, contribute) depending on `?space=`/`?note=` query params. Notes open in a full-screen `SecureNoteModal` with comments. Voting and bookmarking (bookmarks are local-only, stored in `localStorage`) happen inline on each note card. Data from `GET /api/community-spaces` + `GET /api/community-spaces/top-contributors`.
- **ScoreCalculator** (`client/src/pages/ScoreCalculator.jsx`) – Upload panel (two dropzones + marking-scheme settings) → parses the saved NTA HTML client-side (`client/src/utils/scoreCalculatorEngine.js`) → renders Candidate Details, a Score Summary (stat tiles + status-colored breakdown bar), Section-wise Breakdown table, and a searchable/filterable Question-wise Detail table with CSV export and print. No backend calls.
- **Dashboard** (`client/src/pages/Dashboard.jsx`) – FolderList sidebar (readOnly), search (button + Enter), notes grouped by folder/uncategorized, NoteCard view-only.
- **Manage** (`client/src/pages/Manage.jsx`) – Storage card; upload form (dropzone or Drive-link mode); folder sidebar (editable); notes grid/list with sort, view mode, pagination; bulk-select mode (move/delete/visibility); Trash panel (restore, purge, empty).
- **EditNote** – Title, description, folder, visibility, and either replace the file or switch to/from a Drive link; Save/Cancel/Delete.
- **FullScreenPdfView / PublicNoteView / AdminNoteView** – Full-screen `SecureNoteViewer` with zoom, no context menu/drag; pages render lazily via `IntersectionObserver`.
- **PublicProfile** – Profile card with avatar/initials, bio, social links, contributor badge; notes by folder; search/sort/view mode.
- **AdminDashboard** – Total users/notes/storage stat cards; 30-day signup/upload line charts (recharts); Community admin console (create/edit/delete spaces, manage categories, approve/reject pending community-note contributions individually or in bulk, view/delete files per space).
- **AdminUsers / AdminUserDetail** – Standard user management: search, storage limit, "List profile on Explore", per-note "List on Explore", delete user/notes.

---

## Linking and navigation

- **Layout header (main site):** Brand → `/`; nav: Community, Score Calculator (both public); when signed in: user avatar/name, profile-edit button, dark-mode toggle, Sign Out; when guest: dark-mode toggle, Sign In, Sign Up.
- **Layout footer:** Quick links to Community, Score Calculator, My Files (signed in) / Sign In (guest), Public profile; placeholder links for Privacy Policy, Terms of Service, Help Center.
- **Cross-page flows:** Community → note card → `SecureNoteModal` (in place, no route change) or → author's `/profile/:userId`; Manage → NoteCard "View" → `/notes/:id/view`, "Edit" → `/notes/:id/edit`; EditNote Cancel/Save/Delete → `/manage`; Admin Dashboard → pending contribution review inline; Admin Users → user detail → note view → back to user.

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **MongoDB** (local or remote; e.g. `mongod` or Atlas)
- **Google Cloud Console** – OAuth 2.0 Web client ID for Sign-In
- **Cloudinary** (optional but recommended) – Cloud name, API key, API secret for file uploads

---

## Install & run

### 1. Clone and install dependencies

```bash
# From project root
cd server
npm install

cd ../client
npm install
```

The client `postinstall` script copies the PDF.js worker from `node_modules` to `client/public/pdf.worker.min.mjs` so the viewer works without loading from a CDN.

### 2. Environment files

**Server:** Copy `server/.env.example` to `server/.env` and set at least:

- `MONGODB_URI` – MongoDB connection string (e.g. `mongodb://localhost:27017/notes-app`)
- `JWT_SECRET` – Secret for signing JWTs
- `PORT` – Server port (default `5001`)
- `GOOGLE_CLIENT_ID` – Google OAuth 2.0 Web client ID
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` – For uploads (see [External services](#external-services--setup))
- `ADMIN_EMAIL` – Account email that gets admin role on sign-in (Google or email/password)

**Client:** Copy `client/.env.example` to `client/.env` and set:

- `VITE_GOOGLE_CLIENT_ID` – Same value as server `GOOGLE_CLIENT_ID`

### 3. Run MongoDB

Ensure MongoDB is running (e.g. start `mongod` or use a hosted URI in `MONGODB_URI`).

### 4. Start server and client

**Terminal 1 – server:**

```bash
cd server
npm run dev
```

Server runs at `http://localhost:5001` (or your `PORT`). It serves the API and connects to MongoDB.

**Terminal 2 – client:**

```bash
cd client
npm run dev
```

Client runs at `http://localhost:5173`. Vite proxies `/api` to the server.

### 5. Production build & Hosting

For detailed instructions on deploying the server (Vercel/Railway/Render) and client (Vercel/Netlify/Cloudflare), setting up external services, and linking the frontend and backend, please see the **[Hosting Guide (hosting.md)](hosting.md)**.

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens |
| `PORT` | No | Server port (default `5001`) |
| `CLIENT_ORIGIN` | No | Allowed CORS origin(s) for production, comma-separated |
| `GOOGLE_CLIENT_ID` | Yes* | Google OAuth 2.0 Web application client ID |
| `CLOUDINARY_CLOUD_NAME` | Yes* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes* | Cloudinary API secret (keep server-side only) |
| `ADMIN_EMAIL` | No | Email that gets promoted to admin on sign-in (Google or email/password); also used by `seed:admin` |

\*Required for full functionality (Sign-In and file uploads; Google Drive link uploads work without Cloudinary).

### Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Full URL of the hosted backend. Leave empty for local dev to use Vite proxy. |
| `VITE_GOOGLE_CLIENT_ID` | Yes* | Same as server `GOOGLE_CLIENT_ID` for Google Sign-In button |

---

## Main functions & implementation

### Authentication

- **Sign-in:** Either `POST /api/auth/google` (verifies Google ID token, finds-or-creates the user, links `googleId` to an existing email match) or `POST /api/auth/signup` / `POST /api/auth/signin` (bcrypt password). Both paths promote the account to `role: 'admin'` if its email matches `ADMIN_EMAIL`. All issue a 7-day JWT.
- **Protected routes:** `ProtectedRoute` checks `AuthContext`; if not authenticated, redirects with `state.from` so the user returns after login.
- **Admin:** `AdminRoute` checks JWT and `user.role === 'admin'`.
- **Profile editing:** `PUT /api/auth/profile` updates `name`, `bio`, and `socialLinks.*`. Profile picture is only ever set from the Google OAuth payload — there's no upload/edit path for it.

**Implementing auth elsewhere:** Use `AuthContext` (`useAuth()`) for `user`, `isAuthenticated`, `setToken`, `signOut`. Call `api()` from `client/src/api/client.js` which sends `Authorization: Bearer <token>`.

### Notes & folders

- **List notes:** `GET /api/notes?page=1&limit=10&folderIds=...&search=...` (auth). Only returns non-trashed notes.
- **Upload:** `POST /api/notes` (multipart: `file`, or `driveLink` instead of a file, + `title, description, folderId, isPublic`). Enforces the per-user storage quota on file uploads (not on Drive links).
- **Edit / replace file / switch to a Drive link:** `PUT /api/notes/:id`.
- **Soft-delete / Trash:** `DELETE /api/notes/:id` moves a note to trash (`deletedAt` set); `GET /api/notes/trash/list`, `PUT /api/notes/trash/restore/:id`, `DELETE /api/notes/trash/purge/:id`, `POST /api/notes/trash/empty`. Trash auto-purges anything older than 30 days on next `trash/list` fetch. **Note:** `POST /api/notes/bulk-delete` (used by Manage's bulk actions) hard-deletes directly and bypasses trash — this is an intentional shortcut in the current implementation, not a bug to "fix" without checking with whoever relies on that bulk behavior.
- **Bulk actions:** `POST /api/notes/bulk-delete`, `PUT /api/notes/bulk-move`, `PUT /api/notes/bulk-visibility`.
- **Folders:** `GET/POST/PUT/DELETE /api/folders` (auth). Two-level hierarchy.

### Community

- **Browse:** `GET /api/community-spaces` (no auth) returns every space with notes grouped by topic (plus an auto-generated "Other" bucket for unmatched topics).
- **Join/leave:** `POST /api/community-spaces/:id/toggle-join` (auth).
- **Contribute / remove a note:** `PUT /api/notes/:id/contribute` (sets `communitySpaceId`/`communityTopic`, `status: 'pending'`, `isPublic: true`) and `PUT /api/notes/:id/uncontribute` (unlinks, `status: 'approved'`).
- **Voting:** `POST /api/community-spaces/vote` (`{ noteId, value: 1|-1|0 }`), stored as a `votes` array on `Note`.
- **Comments:** `GET/POST /api/community-spaces/notes/:noteId/comments`, `DELETE /api/community-spaces/comments/:id` (own comment, or any comment if admin).
- **Admin curation:** space/category CRUD and pending-contribution review all live under `/api/admin/*` (see [API reference](#api-reference)) — the member-facing `communityRoutes.js` never creates/deletes spaces or approves contributions.

### Score Calculator

- **Route:** `/score-calculator`, public. Fully client-side — no API calls, no data persisted.
- **Engine:** `client/src/utils/scoreCalculatorEngine.js` — `parseResponseSheet(html)`, `parseAnswerKey(html)`, `computeScore(responseData, keyData, opts)`, all pure functions built on `DOMParser`.
- **UI:** `client/src/pages/ScoreCalculator.jsx` + `client/src/components/scoreCalculator/*` (`UploadPanel`, `CandidateDetails`, `ScoreSummary`, `SectionBreakdownTable`, `QuestionDetailTable`).

### Public & Explore

- **Explore notes/users:** `GET /api/public/explore/notes`, `GET /api/public/explore/users` — admin-curated only (`listedOnExplore` / `profileListedOnExplore`).
- **Public profile:** `GET /api/public/profile/:userId` — visible if the user has any public/listed/community-approved note, or an admin set `profileListedOnExplore`. Includes computed contributor badges.
- **Public note:** `GET /api/public/notes/:id` and `.../file` — visible if `isPublic`, `listedOnExplore`, or approved-community.

### Admin

See the full endpoint list in [API reference](#api-reference) — admin now covers users, note moderation, community space/category CRUD, and pending community-contribution review, all gated by `authMiddleware` + `adminMiddleware`.

### PDF viewer

- **Component:** `SecureNoteViewer` (lazy: `SecureNoteViewerLazy`) uses `react-pdf`; PDF pages render lazily via `IntersectionObserver` (loads/unloads as you scroll) and track the "active" page for a page-number indicator. Worker loaded from `public/pdf.worker.min.mjs` (same-origin).
- **File sources:** transparently supports Cloudinary URLs, local disk (legacy), or a Google Drive link (proxy-streamed server-side via `server/lib/driveHelper.js`, bypassing Drive's virus-scan interstitial page) — the client never knows which one it's getting.

### File upload limit (10 MB)

- **Server:** `server/middleware/uploadMiddleware.js` – Multer `limits.fileSize = 10 * 1024 * 1024`.
- **Client:** `client/src/pages/Manage.jsx` – `MAX_FILE_SIZE = 10 * 1024 * 1024`.
- Google Drive link uploads are not subject to this limit (the file lives on Drive, not Cloudinary).

---

## External services & setup

### MongoDB

Install locally or create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). Set `MONGODB_URI` in `server/.env`.

### Google Sign-In (OAuth 2.0)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create OAuth 2.0 Client ID ("Web application").
2. Add authorized JavaScript origins (e.g. `http://localhost:5173`, your production URL).
3. Set `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client).

### Cloudinary

1. Sign up at [Cloudinary](https://cloudinary.com) → Dashboard → Settings → Security (API Keys).
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `server/.env`.
3. Never expose the API secret to the client. Notes can also be added via a public Google Drive link with no Cloudinary dependency.

---

## Project structure

```
Notes Handling/
├── client/                 # React (Vite) frontend
│   ├── public/
│   │   └── pdf.worker.min.mjs   # PDF.js worker (same-origin)
│   ├── src/
│   │   ├── api/            # API client (fetch + auth header, blob fetch w/ progress)
│   │   ├── components/     # Layout, ProtectedRoute, AdminRoute, AdminLayout, ConfirmModal,
│   │   │                   # ErrorBoundary, FolderList, FolderTreeSelect, NoteCard,
│   │   │                   # SortBySelect, ViewModeToggle, SecureNoteViewer(Lazy)
│   │   │   ├── community/  # CommunityIcon, ContributeModal, GateHomepageGrid,
│   │   │   │               # GateHomepageSkeleton, GateCommunityDetail, GateNoteList (TSX),
│   │   │   │               # SecureNoteModal
│   │   │   ├── scoreCalculator/  # UploadPanel, CandidateDetails, ScoreSummary,
│   │   │   │               # SectionBreakdownTable, QuestionDetailTable
│   │   │   └── admin/      # AdminLayout
│   │   ├── context/        # AuthContext, ToastContext
│   │   ├── pages/          # Community, ScoreCalculator, Dashboard, Manage, EditNote,
│   │   │                   # FullScreenPdfView, PublicProfile, PublicNoteView, SignIn, AdminLogin
│   │   │   └── admin/       # AdminDashboard, AdminUsers, AdminUserDetail, AdminNoteView
│   │   ├── styles/         # edura.css (theme)
│   │   └── utils/          # folderTree, sortNotes, avatar, scoreCalculatorEngine
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── lib/                 # cloudinary, cloudinaryNotes, driveHelper, storageHelper
│   ├── middleware/          # authMiddleware, adminMiddleware, uploadMiddleware (Multer)
│   ├── models/               # User, Note, Folder, CommunitySpace, CommunityCategory, Comment, Annotation
│   ├── routes/                # authRoutes, adminRoutes, folderRoutes, noteRoutes,
│   │                          # publicRoutes, communityRoutes, annotationRoutes
│   ├── scripts/               # seedAdminUser, seedDemoUser
│   ├── .env.example
│   └── package.json
├── builds/                  # (generated, not committed) local deploy packages — see Scripts
└── README.md
```

---

## Scripts

### Server (`server/`)

| Script | Command | Description |
|--------|--------|-------------|
| dev | `npm run dev` | Start server with `--watch` |
| start | `npm start` | Start server (production) |
| seed:admin | `npm run seed:admin` | Create/update admin user (uses `ADMIN_EMAIL`) |
| seed:demo | `npm run seed:demo` | Create demo user (see script) |

### Client (`client/`)

| Script | Command | Description |
|--------|--------|-------------|
| dev | `npm run dev` | Start Vite dev server (proxy `/api` to server) |
| build | `npm run build` | Build for production into `dist/` |
| preview | `npm run preview` | Serve `dist/` locally |
| postinstall | (runs after `npm install`) | Copy PDF.js worker to `public/pdf.worker.min.mjs` |

### Packaging a local deploy bundle

There's no single repo-level build script; client and server are packaged separately:

```bash
cd client && npm run build          # → client/dist/
```

The server has no build step (plain ESM, no bundler) — its deployable package is simply its git-tracked files (everything except `node_modules/`, `.env`, `server/uploads/`), which is exactly what `git ls-files server/` returns. A `builds/` folder with `builds/client/` + `builds/server/` (and matching `client-build.zip` / `server-build.zip`) can be assembled locally from those two outputs when you need a zipped artifact to hand off; it isn't committed (add `builds/` to `.gitignore` if you start generating it regularly).

---

## API reference

Base URL: `/api`. Endpoints marked **auth** require `Authorization: Bearer <token>`; **admin** requires an admin JWT.

### Auth (`/api/auth`)

| Method & path | Auth | Body | Notes |
|---|---|---|---|
| `POST /google` | none | `{ credential }` | Google ID token; find-or-create user; auto-admin if email matches `ADMIN_EMAIL` |
| `POST /signup` | none | `{ name, email, password }` | Password min 6 chars |
| `POST /signin` | none | `{ email, password }` | bcrypt compare |
| `GET /me` | auth | — | Current user |
| `PUT /profile` | auth | `{ name?, bio?, socialLinks?{github,linkedin,twitter,website} }` | No `picture`/`email` editing here |

### Notes (`/api/notes`)

| Method & path | Auth | Notes |
|---|---|---|
| `GET /` | auth | `page, limit, folderIds, search` — non-trashed only |
| `GET /storage` | auth | `{ usedBytes, limitBytes }` |
| `GET /bookmarks` | auth | `?ids=` — not scoped to owner, used for cross-user bookmarks |
| `GET /:id` / `GET /:id/file` | auth | Owned note; file streams from Cloudinary, Drive link, or disk |
| `POST /` | auth | Multipart `file` **or** `driveLink`, + `title, description, folderId, isPublic, communitySpaceId?, communityTopic?` |
| `PUT /:id` | auth | Update fields; optional replacement `file` or `driveLink` |
| `PUT /:id/contribute` / `PUT /:id/uncontribute` | auth | Link/unlink note to a community space |
| `DELETE /:id` | auth | Soft-delete (trash) |
| `GET /trash/list` | auth | Auto-purges 30-day-old trash, returns the rest |
| `PUT /trash/restore/:id` / `DELETE /trash/purge/:id` / `POST /trash/empty` | auth | Trash management |
| `POST /bulk-delete` | auth | **Hard**-deletes, bypasses trash |
| `PUT /bulk-move` / `PUT /bulk-visibility` | auth | Bulk folder move / visibility change |

### Folders (`/api/folders`)

`GET /`, `POST /`, `PUT /:id`, `DELETE /:id` — all auth, all scoped to the current user.

### Public (`/api/public`) — no auth

`GET /explore/notes`, `GET /explore/users`, `GET /profile/:userId`, `GET /notes/:id`, `GET /notes/:id/file`.

### Community (`/api/community-spaces`)

| Method & path | Auth | Notes |
|---|---|---|
| `GET /` | none | All spaces, notes grouped by topic |
| `GET /top-contributors` | none | Top 4 by approved note count |
| `POST /:id/toggle-join` | auth | Join/leave |
| `POST /vote` | auth | `{ noteId, value: 1\|-1\|0 }` |
| `GET /notes/:noteId/comments` | none | — |
| `POST /notes/:noteId/comments` | auth | `{ text }` |
| `DELETE /comments/:id` | auth | Own comment, or any if admin |

### Annotations (`/api/annotations`) — backend only, not yet used by any UI

`GET /:noteId`, `POST /`, `PUT /:id`, `DELETE /:id` — all auth, scoped per-note **and** per-user (no shared annotations).

### Admin (`/api/admin`) — all require admin JWT

| Group | Endpoints |
|---|---|
| Stats | `GET /stats` |
| Users | `GET /users`, `GET /users/:userId`, `PUT /users/:userId`, `DELETE /users/:userId` |
| Notes | `GET /notes/:id`, `PATCH /notes/:id` (`listedOnExplore`), `GET /notes/:id/file`, `DELETE /notes` (bulk) |
| Community spaces | `GET /community-spaces`, `POST /community-spaces`, `PUT /community-spaces/:id`, `DELETE /community-spaces/:id`, `GET /community-spaces/:id/notes` |
| Community requests | `GET /community-requests`, `PUT /community-requests/:id`, `PUT /community-requests/bulk-review` |
| Community categories | `GET /community-categories`, `POST /community-categories`, `DELETE /community-categories/name/:name` |

---

## Data models

### User

| Field | Type | Notes |
|---|---|---|
| name, email | String | required |
| password | String | optional (Google-only accounts have none) |
| googleId | String | sparse unique, set by Google sign-in |
| picture | String | set only via Google OAuth payload |
| role | String | `'user'` \| `'admin'` |
| storageLimitBytes | Number | default 50 MB |
| bio | String | max 500 chars, user-editable |
| socialLinks | Object | `{github, linkedin, twitter, website}`, user-editable |
| profileListedOnExplore | Boolean | admin-only toggle |

### Folder

`name`, `userId`, `parentId` (null = root), `order`.

### Note

| Field | Notes |
|---|---|
| title, description | — |
| fileName, fileUrl | Cloudinary asset (public_id / delivery URL) |
| driveLink | Alternative to file upload; proxy-streamed server-side |
| originalName, mimeType, size | — |
| userId, folderId | owner, optional folder |
| isPublic, listedOnExplore | owner-set / admin-set visibility |
| communitySpaceId, communityTopic | set when contributed to Community |
| status | `'approved'` \| `'pending'` \| `'rejected'` |
| deletedAt | trash timestamp, null when active |
| votes | `[{userId, value: 1\|-1}]` |

### CommunitySpace

`name`, `code`, `icon` (Lucide icon name), `description`, `topics[]`, `adminId`, `category`, `color`, `tags[]`, `rules[]`, `members[]`, `membersCount`.

### CommunityCategory

`name` (unique) — flat list used to group spaces (e.g. "Technology", "Science"); admin-managed.

### Comment

`noteId`, `userId`, `text` (max 1000 chars) — comments on community notes.

### Annotation

`noteId`, `userId`, `pageNumber`, `x`, `y` (percentage coords), `text` (max 1000 chars), `color` — model + API exist; not currently rendered by any viewer component.

---

## Security (note viewer)

- **No copy/download:** Right-click and drag disabled on the viewer wrapper.
- **No print:** Print CSS hides content and shows a short message.
- **Screenshot:** Cannot be fully prevented; deterrent watermark shown instead.

---

## Important points

1. **PDF viewer:** The worker must be served from your app. The client copies it to `public/pdf.worker.min.mjs` on install; do not remove that file or the postinstall script.
2. **Admin:** Any account whose email matches `ADMIN_EMAIL` becomes admin automatically on sign-in (Google or email/password), not just Google.
3. **Community visibility:** Notes only appear in a Community space's topic feed once `status: 'approved'` — new contributions start `'pending'` and need an admin to approve them via the Community admin console on `/admin/dashboard`.
4. **Trash inconsistency:** `DELETE /api/notes/:id` soft-deletes (trash), but `POST /api/notes/bulk-delete` (used for Manage's bulk-delete) hard-deletes immediately, bypassing trash. This is current behavior, not a typo — confirm before "fixing" it.
5. **Upload limit:** 10 MB per file (client and server), enforced only for Cloudinary uploads — Google Drive link notes aren't subject to it.
6. **CORS:** For production, set `CLIENT_ORIGIN` in `server/.env` to your frontend URL so the API only accepts requests from that origin.
7. **Legacy docs:** [PROJECT.md](PROJECT.md) describes an older, simplified variant of this app (no Google OAuth, no Community/Score Calculator/admin, no pagination) — kept for historical rebuild reference only, not current behavior.
