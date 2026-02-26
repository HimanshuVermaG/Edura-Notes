# Project Audit – Logic, Abandoned Code, and Checklist

This document summarizes how the Edura Notes project is wired, lists abandoned or unused code and docs, and provides a checklist for cleanup and alignment.

---

## 1. Project logic (high-level)

The app is a full-stack notes platform with **Google OAuth + email/password** auth, **folders** (2-level), **notes** (PDF/images in Cloudinary or legacy disk), **Explore** (public profiles/notes), and **Admin** (users, storage, curation).

### Entry and routing

- **`client/src/main.jsx`** – `BrowserRouter` → `AuthProvider` → `App`; imports `edura.css`.
- **`client/src/App.jsx`** – All routes. Root `/` redirects to `/explore`. Protected routes (`/home`, `/manage`, `/notes/:id/*`) use `ProtectedRoute`; admin routes use `AdminRoute`.

### Auth flow

- **`client/src/context/AuthContext.jsx`** – Holds `user`, `token`, `setToken`, `signOut`, `loading`, `isAuthenticated`. Token in `localStorage`; when token exists, `GET /api/auth/me` refreshes user.
- **`server/routes/authRoutes.js`** – `POST /auth/google`, `POST /auth/email` (sign-in/sign-up), `GET /auth/me`. Admin role when `user.email === ADMIN_EMAIL`.
- **`client/src/components/ProtectedRoute.jsx`** – Redirects unauthenticated users to `/` (then `/explore`).
- **`client/src/components/AdminRoute.jsx`** – Requires `user.role === 'admin'`; wraps admin routes with `AdminLayout` + `Outlet`.

### Data flow (main pages)

- **Home** (`client/src/pages/Homepage.jsx`) and **Manage** (`client/src/pages/Manage.jsx`) – Both call `GET /folders` and `GET /notes?page=&limit=&folderIds=&search=`. Notes API returns `{ notes, total, page, limit }`; both handle that and pagination. Folder multi-select uses `client/src/utils/folderTree.js` (`getFolderIdAndDescendantIds`). Notes sorted client-side via `client/src/utils/sortNotes.js`.
- **Manage** – Upload via `apiForm('/notes', formData)`; folder picker via `client/src/components/FolderTreeSelect.jsx`; storage from `GET /notes/storage`.
- **Explore** (`client/src/pages/Explore.jsx`) – `GET /api/public/explore/users` and `GET /api/public/explore/notes` (paginated, no auth).
- **Public profile/note** – `client/src/pages/PublicProfile.jsx` and `client/src/pages/PublicNoteView.jsx` use `GET /api/public/profile/:userId` and `/api/public/notes/:id` (and file).
- **Viewer** – `client/src/components/SecureNoteViewerLazy.jsx` lazy-loads `SecureNoteViewer.jsx`; used by FullScreenPdfView, PublicNoteView, AdminNoteView. Fetches file via `apiGetBlob` (or public/admin endpoints); displays PDF (react-pdf) or image.

### Server

- **`server/index.js`** – Mounts `/api/auth`, `/api/admin`, `/api/folders`, `/api/notes`, `/api/public`; CORS; MongoDB connect.
- **Notes** – `server/routes/noteRoutes.js` uses `server/lib/cloudinary.js`, `server/lib/cloudinaryNotes.js`, `server/lib/storageHelper.js`, `server/middleware/uploadMiddleware.js` (uploadPdf, getUploadPath for legacy disk). Supports `folderIds` (comma-separated) and legacy `folderId`; pagination `page`/`limit`.
- Admin and public routes use the same libs for file serving (getUploadPath, Cloudinary destroy where applicable).

---

## 2. Abandoned or unused items

| Item | Location | Reason |
|------|----------|--------|
| **Landing page** | `client/src/pages/Landing.jsx` | Not referenced in `client/src/App.jsx`. Root route `/` is `<Navigate to="/explore" />`, so Landing is never rendered. README and FRONTEND_DESIGN.md still describe a landing at `/`. |
| **User Dashboard page** | `client/src/pages/Dashboard.jsx` | Not rendered by any route. `/dashboard` uses `DashboardRedirect` (→ `/home` or `/explore`), not this component. Dashboard.jsx also uses old API shape (`folderId` singular, no pagination). |
| **NewNote page** | `client/src/pages/NewNote.jsx` | Route `/notes/new` is `<Navigate to="/manage" replace />`, so NewNote is never shown. Upload is on Manage only. |
| **SignUp page** | (none) | PROJECT.md mentions `SignUp.jsx`; the app has no SignUp.jsx. Sign-up is handled inside `client/src/pages/SignIn.jsx` via `state.mode === 'signup'` and email/password form. |
| **PROJECT.md** | `PROJECT.md` | Describes an older variant: email/password only, no Google OAuth, no Explore/Admin/public, no pagination. README and the codebase match the richer feature set; PROJECT.md is outdated. |
| **FRONTEND_DESIGN.md** | `FRONTEND_DESIGN.md` | Route table says `/` is Landing (guest) and "redirects to /home if authenticated". Actual behavior: `/` always redirects to `/explore`. Landing is unused. |
| **edura.css** | `client/src/styles/edura.css` | Contains comment blocks "Landing page – hero + explore" and "Dashboard welcome". Those sections are only relevant to the unused Landing/Dashboard pages; classes may still be used elsewhere (e.g. hero on Explore). |

**Server:** All server files under `server/` are used (e.g. storageHelper, cloudinaryNotes, getUploadPath in noteRoutes, adminRoutes, publicRoutes). No abandoned server modules found.

---

## 3. Checklist (cleanup and doc alignment)

Use this list to clean up abandoned code and align documentation with the current app.

- [ ] **Landing.jsx** – Remove or repurpose. Either delete the file or wire `/` to it and adjust redirects (e.g. authenticated → `/home`, guest → Landing).
- [ ] **Dashboard.jsx** – Remove or repurpose. Either delete or use it for `/dashboard` and update it to use `folderIds` + pagination to match the current notes API.
- [ ] **NewNote.jsx** – Remove or repurpose. Either delete or expose under a route (e.g. `/notes/new` rendering NewNote) if a standalone upload page is desired.
- [ ] **PROJECT.md** – Update or archive so it matches the current app (Google OAuth, Explore, Admin, public routes, pagination) or mark it as "legacy/simplified spec".
- [ ] **FRONTEND_DESIGN.md** – Update the route table so `/` → Explore and remove or note Landing as unused.
- [ ] **edura.css** – Optionally tidy comments: rename or remove "Landing page" / "Dashboard welcome" blocks if those pages are removed.
- [ ] **README.md** – Ensure it mentions AUDIT.md (e.g. under Important points: "See AUDIT.md for project logic and abandoned-code checklist.").
