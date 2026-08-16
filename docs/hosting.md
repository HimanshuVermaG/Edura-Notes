# Edura Notes — Hosting Guide

The project is split into two independent apps that can be deployed separately:

| App | Folder | Recommended Platform |
|-----|--------|---------------------|
| **Backend (API)** | `server/` | Vercel / Railway / Render |
| **Frontend (React)** | `client/` | Vercel / Netlify / Cloudflare Pages |

---

## Prerequisites

Before deploying you need:

1. **MongoDB Atlas** account → [cloud.mongodb.com](https://cloud.mongodb.com) *(free M0 tier works)*
2. **Cloudinary** account → [cloudinary.com](https://cloudinary.com) *(free plan works)*
3. **Google Cloud Console** project with an OAuth 2.0 Web Client ID *(optional — only for Google Sign-In)*
4. **GitHub** repo with the project pushed

---

## Step 1 — Set Up MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user: **Database Access → Add New Database User**
3. Whitelist all IPs: **Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`)
4. Get your connection string: **Clusters → Connect → Drivers** → copy the `mongodb+srv://...` URI
5. Replace `<password>` in the URI with your database user's password

---

## Step 2 — Set Up Cloudinary

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to **Dashboard** → copy:
   - Cloud Name
   - API Key
   - API Secret
3. Keep these for the server environment variables

---

## Step 3 — Push to GitHub

Push the project to a GitHub repository. Make sure `.env` files are **not** committed (they are in `.gitignore`).

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

> The `client/` and `server/` folders can be in **one repo** (monorepo) — hosting platforms let you specify the root directory per project.

---

## Step 4 — Deploy the Server (Backend)

### Option A: Vercel *(recommended)*

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `server`
4. **Build & Output Settings** — leave defaults (Vercel detects Node.js automatically)
5. Add the following **Environment Variables**:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random secret (e.g. run `openssl rand -hex 32`) |
| `CLIENT_ORIGIN` | Your frontend URL (fill in after Step 5, e.g. `https://my-notes.vercel.app`) |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console *(optional)* |
| `ADMIN_EMAIL` | Email to seed as admin |

6. Click **Deploy**
7. Copy the deployed URL (e.g. `https://my-notes-server.vercel.app`) — you'll need it for the frontend

### Option B: Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub Repo**
2. Select your repo → set **Root Directory** to `server`
3. Railway auto-detects Node.js and runs `npm start`
4. Add all the same environment variables from the table above
5. Go to **Settings → Networking → Generate Domain** to get your server URL

### Option C: Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo → set **Root Directory** to `server`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add environment variables from the table above
6. Click **Create Web Service**

---

## Step 5 — Deploy the Frontend (Client)

### Option A: Vercel *(recommended)*

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import the **same GitHub repo**
3. Set **Root Directory** to `client`
4. **Framework Preset**: Vite (auto-detected)
5. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your server URL from Step 4 (e.g. `https://my-notes-server.vercel.app`) |
| `VITE_GOOGLE_CLIENT_ID` | Same as server's `GOOGLE_CLIENT_ID` *(optional)* |

6. Click **Deploy**
7. Copy your frontend URL (e.g. `https://my-notes.vercel.app`)

### Option B: Netlify

1. Go to [netlify.com](https://netlify.com) → **Add New Site → Import from Git**
2. Select your repo
3. Set **Base Directory** to `client`
4. Set **Build Command** to `npm run build`
5. Set **Publish Directory** to `client/dist`
6. Add the same environment variables as above
7. Add a `_redirects` file at `client/public/_redirects` with content:
   ```
   /* /index.html 200
   ```
   *(This makes React Router work — already handled automatically by `client/vercel.json` on Vercel)*

### Option C: Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a Project**
2. Connect GitHub → select your repo
3. Set **Root Directory** to `client`
4. Set **Build Command**: `npm run build`
5. Set **Output Directory**: `dist`
6. Add environment variables
7. Deploy

---

## Step 6 — Link Frontend to Backend

After both are deployed:

1. **Update SERVER** — Set `CLIENT_ORIGIN` to your frontend URL and redeploy:
   ```
   CLIENT_ORIGIN=https://my-notes.vercel.app
   ```

2. **Confirm CLIENT** — `VITE_API_URL` should already point to your server URL.

---

## Step 7 — Seed the Admin Account

The admin account must be created once after the server is deployed.

**Easiest way — run locally against the production database:**

```bash
cd server
# Temporarily point .env at your production MongoDB Atlas URI
npm run seed:admin
```

This creates a user with the email in `ADMIN_EMAIL`. Log in at `/admin/login` using email + password.

> The seeded admin password is set in `server/scripts/seedAdminUser.js`. Change it before running in production.

---

## Step 8 — Set Up Google OAuth *(optional)*

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Add **Authorized JavaScript Origins**:
   - `https://my-notes.vercel.app` (your frontend URL)
   - `http://localhost:5173` (for local dev)
4. Copy the **Client ID** and set it as:
   - `GOOGLE_CLIENT_ID` in the **server** env vars
   - `VITE_GOOGLE_CLIENT_ID` in the **client** env vars
5. Redeploy both apps

---

## Local Development

```bash
# 1. Start MongoDB locally
mongod --dbpath ~/mongodb-data

# 2. Start the server
cd server
cp .env.example .env    # fill in your values
npm install
npm run dev             # http://localhost:5001

# 3. Start the client (new terminal tab)
cd client
cp .env.example .env    # leave VITE_API_URL empty
npm install
npm run dev             # http://localhost:5173
```

> Leave `VITE_API_URL` **empty** in local dev — Vite's built-in proxy forwards `/api/*` to `localhost:5001` automatically.

---

## Environment Variables Reference

### `server/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens — use a long random string |
| `CLIENT_ORIGIN` | Yes (prod) | Comma-separated list of allowed frontend URLs |
| `PORT` | No | Server port — defaults to 5001 |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID |
| `ADMIN_EMAIL` | Optional | Email for the seeded admin user |

### `client/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Full URL of the deployed server — empty = use Vite proxy |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Same value as server's `GOOGLE_CLIENT_ID` |

---

## Common Issues

| Problem | Fix |
|---------|-----|
| **CORS error** in browser console | Set `CLIENT_ORIGIN` on the server to your exact frontend URL (no trailing slash) and redeploy |
| **File uploads fail** | Make sure all three Cloudinary env vars are set on the server |
| **Google Sign-In button doesn't appear** | Set `VITE_GOOGLE_CLIENT_ID` on the client and add your deployed domain to Google OAuth authorized origins |
| **Admin login fails** | Run `npm run seed:admin` with `ADMIN_EMAIL` set; then use email + password at `/admin/login` |
| **React page 404 on refresh** | Make sure `client/vercel.json` is committed (Vercel) or `public/_redirects` exists (Netlify) |
| **MongoDB connection error** | Whitelist `0.0.0.0/0` in Atlas Network Access, and confirm the URI has the correct password |
| **Vercel function timeout** | Upgrade Vercel plan or migrate to Railway/Render for long-running uploads |
