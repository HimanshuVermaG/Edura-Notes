# Notes Website

A multi-user notes app with sign-up/sign-in, dashboard, folders, and secure note viewing (no copy, no print). UI follows the Edura education theme.

## Tech stack

- **Frontend:** React (Vite), React Router, Bootstrap 5, HTML/CSS/JS
- **Backend:** Node.js, Express
- **Database:** MongoDB

## Setup

### 1. MongoDB

Ensure MongoDB is running locally (e.g. `mongod`) or set `MONGODB_URI` in the server `.env`.

### 2. Server

```bash
cd server
# Create server/.env with MONGODB_URI, JWT_SECRET, PORT, and Cloudinary credentials (see PROJECT.md)
npm install
npm run dev
```

**Cloudinary (file storage):** New uploads are stored on [Cloudinary](https://cloudinary.com). Get credentials from [Dashboard](https://console.cloudinary.com/) → Settings → Security → API Keys. Add to `.env`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Never expose the API secret to the client. Existing notes without Cloudinary URLs are still served from `server/uploads/` (legacy).

Server runs at `http://localhost:5001` (5001 avoids conflict with macOS AirPlay on 5000).

**Demo user (optional):** From the `server` folder run `npm run seed:demo` to create a demo account. Sign in with:

- **Email:** `demo@example.com`
- **Password:** `demo123456`

**Admin panel:** Create an admin user by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`, then from the `server` folder run `npm run seed:admin`. Sign in at `/admin/login` with that email and password to access the admin panel. The admin can view all users, see each user's files, delete users (and their files), and delete specific or multiple files.

### 3. Client

```bash
cd client
npm install
npm run dev
```

Client runs at `http://localhost:5173` and proxies `/api` to the server.

## Notes (PDF and images)

- Notes are **PDF and image files** (JPEG, PNG, GIF, WebP). Upload via “Upload PDF”; view in a secure in-page viewer.
- **New uploads** are stored on Cloudinary; metadata is in MongoDB. File delivery redirects to the Cloudinary CDN. **Legacy notes** are still served from `server/uploads/`. All note data is served only to the note owner (auth required).

## Security (note viewer)

- **No copy/download:** Right-click and drag are disabled on the viewer wrapper.
- **No print:** Print styles hide the viewer and show a short message.
- **Screenshot:** Cannot be prevented in the browser (OS-level). A deterrent message is shown.

## Levels

- **Level 1:** Sign-up, sign-in, simple dashboard (Edura theme).
- **Level 2:** Upload/view notes, folders, secure viewer, drag-and-drop notes into folders.
