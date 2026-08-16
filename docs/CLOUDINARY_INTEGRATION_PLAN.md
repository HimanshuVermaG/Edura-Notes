# Cloudinary Integration Plan

Plan for implementing and integrating [Cloudinary](https://cloudinary.com/documentation) into the File Uploader website for saving and fetching PDFs and images.

---

## 1. Overview

| Goal | Approach |
|------|----------|
| **Save files** | Upload images and PDFs to Cloudinary via server-side API (Node SDK). |
| **Fetch files** | List assets from Cloudinary via Admin API; deliver via CDN URLs on the site. |
| **Security** | Keep API secret server-side only; validate file type and size on upload. |

**Stack:** Next.js (App Router), TypeScript, Cloudinary Node SDK.

---

## 2. Prerequisites

1. **Cloudinary account**  
   Sign up at [cloudinary.com](https://cloudinary.com) and get credentials from [Dashboard](https://console.cloudinary.com/) → Settings → Security → API Keys.

2. **Credentials**
   - `CLOUDINARY_CLOUD_NAME` — Cloud name (e.g. `dftdlyrrl`)
   - `CLOUDINARY_API_KEY` — Numeric API key
   - `CLOUDINARY_API_SECRET` — API secret (never expose to the client)

3. **Environment**  
   Add the above to `.env.local` in the project root. Restart the dev server after changes.

---

## 3. Architecture

```
┌─────────────┐     POST /api/upload      ┌─────────────┐     Node SDK      ┌─────────────┐
│  Upload     │  ──────────────────────►  │  Next.js    │  ─────────────►  │ Cloudinary  │
│  Page       │  (multipart file)         │  API Routes │   upload()        │  Storage    │
└─────────────┘                           └─────────────┘                   └─────────────┘
                                                 │                                  │
                                                 │  GET /api/files                  │
┌─────────────┐     GET /api/files        │  api.resources()                       │
│  Gallery    │  ◄──────────────────────  │  (list images + raw)                   │
│  Page       │  (JSON: secure_url, etc.) └─────────────┘                           │
└─────────────┘                                                                     │
       │                                                                             │
       │  img src / a href = secure_url  ◄───────────────────────────────────────────┘
       └──────────────────────────────────►  CDN delivery
```

---

## 4. Implementation Steps

### Step 1: Install and configure Cloudinary

- **Install:** `npm install cloudinary`
- **Config module:** Create `lib/cloudinary.ts` (server-only).
  - Call `v2.config({ cloud_name, api_key, api_secret })` from `process.env`.
  - Export the configured `v2` instance for use in API routes.

### Step 2: Upload API (save files)

- **Route:** `POST /api/upload`
- **Input:** `multipart/form-data` with a single field `file`.
- **Validation:**
  - Allowed types: images (JPEG, PNG, GIF, WebP, SVG) and PDF.
  - Max size: e.g. 20 MB.
  - Reject with 400 and a clear error message if invalid.
- **Logic:**
  - For PDF: `resource_type: 'raw'`.
  - For images: `resource_type: 'image'`.
  - Optional: `folder: 'file-uploader'` for organization.
  - Use `cloudinary.uploader.upload()` (e.g. with base64 data URI from the file buffer).
- **Response:** JSON with `success`, `secure_url`, `public_id`, `resource_type` (or error and 4xx/5xx).

### Step 3: List API (fetch files)

- **Route:** `GET /api/files`
- **Logic:**
  - Call `cloudinary.api.resources()` twice: once with `resource_type: 'image'`, once with `resource_type: 'raw'`.
  - Use the same `type: 'upload'` and optional `prefix: 'file-uploader'`.
  - Merge and sort by `created_at` (newest first).
- **Response:** JSON array of `{ secure_url, public_id, resource_type, format, created_at }`.

### Step 4: Upload page UI

- **Route:** `/upload`
- **Features:**
  - File input (and optional drag-and-drop) with `accept` for images and PDF.
  - Optional image preview before upload.
  - “Upload” button that POSTs the file to `/api/upload`.
  - Loading, success, and error states; optional redirect to gallery after success.

### Step 5: Gallery page (display files)

- **Route:** `/` or `/files`
- **Features:**
  - On load, `fetch('/api/files')`.
  - **Images:** Render with `<img src={secure_url} />`.
  - **PDFs:** Render as links `<a href={secure_url} target="_blank">` or embed with `<iframe>`.
  - Handle loading, error, and empty states; show name/format/date if desired.

### Step 6: Security and robustness

- Enforce file type and size limits in the upload API only (server-side).
- Never expose `CLOUDINARY_API_SECRET` to the client (use only in API routes and `lib/cloudinary.ts`).
- Return clear error messages for auth failures (e.g. 401 “api_secret mismatch”) and document credential setup in README.

---

## 5. Key Files

| Path | Purpose |
|------|--------|
| `.env.local` | Cloudinary env vars (gitignored) |
| `lib/cloudinary.ts` | Cloudinary v2 config (server-only) |
| `app/api/upload/route.ts` | POST upload → Cloudinary |
| `app/api/files/route.ts` | GET list of assets from Cloudinary |
| `app/upload/page.tsx` | Upload form and submit |
| `app/page.tsx` | Gallery: fetch and show images + PDF links |

---

## 6. Cloudinary API Reference (summary)

- **Upload:** [Upload images](https://cloudinary.com/documentation/upload_images), [Node image and video upload](https://cloudinary.com/documentation/node_image_and_video_upload)  
  - `cloudinary.uploader.upload(source, { folder, resource_type: 'image' | 'raw' })`
- **List:** [List assets](https://cloudinary.com/documentation/list_assets)  
  - `cloudinary.api.resources({ type: 'upload', prefix, resource_type: 'image' | 'raw' })`
- **Delivery:** Use `secure_url` from the upload/list response for `<img>` and `<a href>`; supports [image transformations](https://cloudinary.com/documentation/image_transformations) in the URL if needed.

---

## 7. Troubleshooting

- **`api_secret mismatch` (401):** Re-copy API Secret from Dashboard (Reveal → Copy), paste into `.env.local` with no spaces or quotes, restart the dev server.
- **Upload/list fails:** Check that all three env vars are set and that the dev server was restarted after editing `.env.local`.
- **Wrong credentials:** If using Cloudinary Environments, use that environment’s API Key and API Secret.
