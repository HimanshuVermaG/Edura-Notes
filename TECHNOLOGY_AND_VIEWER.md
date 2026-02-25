# Technology Stack & File Viewer Documentation

This document describes the technologies used in the Edura Notes project, how images and PDFs are displayed, the security measures applied when viewing files, and the libraries used to open or view files.

---

## 1. Technologies and Languages

The project is a full-stack web application with the following stack:

| Layer | Technologies |
|-------|--------------|
| **Frontend** | **React 18**, **Vite 5**, **React Router 6**, **Bootstrap 5**, **react-pdf** (PDF.js) |
| **Backend** | **Node.js**, **Express** |
| **Database** | **MongoDB** (with **Mongoose** ODM) |
| **Authentication** | **Google OAuth 2.0** (google-auth-library), **JWT** (jsonwebtoken) |
| **File storage** | **Cloudinary** (new uploads), local `server/uploads/` (legacy) |
| **File upload** | **Multer** (multipart/form-data, 10 MB limit) |

**Languages:** JavaScript (ES modules) across the codebase; JSX for React components.

---

## 2. How Images and PDFs Are Displayed

### Flow

1. **File fetch**  
   The app does **not** use direct file URLs (e.g. Cloudinary links) in the viewer. Instead, it requests the file through the API and receives it as a **blob**:
   - Authenticated user’s note: `GET /api/notes/:id/file` (with JWT)
   - Public note: `GET /api/public/notes/:id/file` (no auth)
   - Admin viewing any note: `GET /api/admin/notes/:id/file` (admin JWT)

2. **Blob URL**  
   The client uses `apiGetBlob()` to fetch the response as `res.blob()`, then creates a temporary in-memory URL with `URL.createObjectURL(blob)`. This URL is used only inside the app and is revoked when the component unmounts.

3. **Rendering**
   - **Images (JPEG, PNG, GIF, WebP):**  
     Rendered with a native `<img>` element whose `src` is the blob URL. The image is wrapped in the secure viewer container, with zoom applied via CSS `transform: scale()` and `draggable={false}`.
   - **PDFs:**  
     Rendered with the **react-pdf** library: `<Document file={url}>` and one `<Page>` per page. The PDF.js worker is loaded from the app origin (`/pdf.worker.min.mjs`), so no external CDN is used. Pages are rendered as canvases with optional annotation layer; the text layer is disabled for the secure viewer.

### Components

- **SecureNoteViewer** – Main viewer: decides image vs PDF from `mimeType` (or inferred from `fileName`), fetches the blob, creates the blob URL, and renders either the image or the react-pdf `Document`/`Page`.
- **SecureNoteViewerLazy** – Lazy-loaded wrapper used on full-screen and admin note view pages.
- **FullScreenPdfView** / **AdminNoteView** – Full-screen layout (toolbar, zoom) that embeds the secure viewer.

---

## 3. Security Features Applied While Viewing Files

Security is applied in the **SecureNoteViewer** component and in **CSS** so that viewing is in-app only and copying/printing/dragging are restricted.

| Feature | Implementation |
|--------|----------------|
| **No copy / no selection** | CSS `user-select: none` (and vendor prefixes) on `.secure-note-viewer` and `.secure-note-viewer *` so text and content cannot be selected. |
| **No drag** | `onDragStart={preventDrag}` (calls `e.preventDefault()`), `draggable={false}` on the image, and CSS `.no-drag { -webkit-user-drag: none; user-drag: none; }` to prevent dragging content out. |
| **No right-click / context menu** | `onContextMenu={preventContextMenu}` (calls `e.preventDefault()`) on the viewer wrapper so the browser context menu cannot be used to save or copy. |
| **No print** | `@media print` rules hide the viewer content (visibility hidden) and show a short message: “This content is not available for printing.” |
| **Deterrent watermark** | CSS pseudo-element on `.secure-note-watermark::before` with the text “Do not capture or share this content” (bottom-right, low opacity). |
| **Access control** | File endpoints enforce ownership or visibility: authenticated route for own notes, public route only for notes with `isPublic` or `listedOnExplore`, admin route for admins only. Files are served as blob via API, so the viewer never exposes a direct external file URL. |
| **Screenshot** | Cannot be fully prevented by the app; the watermark and no-copy/no-print measures act as deterrents. |

These apply to both **images** and **PDFs** when shown inside the secure viewer.

---

## 4. Libraries Used to Open or View Files

| Content type | Library / mechanism |
|-------------|----------------------|
| **PDF** | **react-pdf** (npm: `react-pdf`), which uses **PDF.js** under the hood. The PDF.js worker is provided by the **pdfjs-dist** package and is copied at build/install time to `client/public/pdf.worker.min.mjs` so it is loaded from the same origin. |
| **Images** | No dedicated library; the browser’s native **`<img>`** element is used with the blob URL. Supported types: JPEG, PNG, GIF, WebP. |

**Relevant dependencies (client):**

- `react-pdf` (e.g. ^10.3.0) – React components for PDF rendering (`Document`, `Page`).
- `pdfjs-dist` – Supplied as a dependency of `react-pdf`; its worker file `pdf.worker.min.mjs` is copied to `public/` by the client’s `postinstall` script so that `pdfjs.GlobalWorkerOptions.workerSrc` can point to `/pdf.worker.min.mjs` and avoid loading from a CDN.

**Summary:** PDFs are opened and viewed with **react-pdf (PDF.js)**; images are viewed with the native **`<img>`** element inside the same secure viewer wrapper and security rules.
