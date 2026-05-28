const getToken = () => localStorage.getItem('notes_token');

/** Base URL for API (empty = same origin / Vite proxy). Set VITE_API_URL when backend is on another host (e.g. Vercel). */
const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Full URL for an API path (e.g. '/notes' -> 'https://api.example.com/api/notes' or '/api/notes' when apiBase is empty). */
export function getApiUrl(path) {
  if (typeof path !== 'string' || path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase}/api${p}`;
}

export async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(getApiUrl(url), { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Request failed');
  return data;
}

export async function apiForm(url, formData, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(getApiUrl(url), {
    ...options,
    method: options.method || 'POST',
    body: formData,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Request failed');
  return data;
}

// ─── IndexedDB Blob Cache ─────────────────────────────────────────────────────
// Persists downloaded file blobs across page reloads and browser sessions.
// Uses a TTL of 1 hour so stale files don't linger forever.

const IDB_NAME = 'edura-blob-cache';
const IDB_STORE = 'blobs';
const IDB_VERSION = 1;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: 'url' });
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(url) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(url);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) return resolve(null);
        // Expire stale entries
        if (Date.now() - record.cachedAt > CACHE_TTL_MS) {
          idbDelete(url);
          return resolve(null);
        }
        resolve(record.blob);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(url, blob) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ url, blob, cachedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = resolve; // fail silently
    });
  } catch {
    // IndexedDB unavailable (private browsing, etc.) — no-op
  }
}

async function idbDelete(url) {
  try {
    const db = await openDB(); 
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(url);
  } catch {
    // no-op
  }
}

// In-memory cache as a fast first-layer (avoids IndexedDB round-trip in the
// same tab session — still useful when navigating between notes quickly)
const memCache = new Map();

async function cacheGet(url) {
  if (memCache.has(url)) return memCache.get(url);
  const blob = await idbGet(url);
  if (blob) memCache.set(url, blob);
  return blob || null;
}

async function cacheSet(url, blob) {
  memCache.set(url, blob);
  await idbSet(url, blob);
}

// Export so other modules can explicitly invalidate an entry (e.g. after edit)
export async function invalidateBlobCache(url) {
  memCache.delete(url);
  await idbDelete(url);
}
// ─────────────────────────────────────────────────────────────────────────────

export async function apiGetBlob(url) {
  const cached = await cacheGet(url);
  if (cached) return cached;

  const token = getToken();
  const res = await fetch(getApiUrl(url), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const contentType = res.headers.get('Content-Type') || '';
    const isJson = contentType.includes('application/json');
    const message = isJson
      ? (await res.json().catch(() => ({}))).message
      : null;
    throw new Error(message || res.statusText || 'Failed to load file');
  }
  const blob = await res.blob();
  await cacheSet(url, blob);
  return blob;
}

export async function apiGetBlobWithProgress(url, onProgress) {
  const cached = await cacheGet(url);
  if (cached) {
    if (onProgress) onProgress(100);
    return cached;
  }

  const token = getToken();
  const res = await fetch(getApiUrl(url), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!res.ok) {
    const contentType = res.headers.get('Content-Type') || '';
    const isJson = contentType.includes('application/json');
    const message = isJson
      ? (await res.json().catch(() => ({}))).message
      : null;
    throw new Error(message || res.statusText || 'Failed to load file');
  }

  const contentLength = res.headers.get('content-length');
  const total = parseInt(contentLength, 10);
  


  const reader = res.body.getReader();
  let loaded = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    if (onProgress) {
      if (!contentLength || isNaN(total)) {
        onProgress(-loaded); // Send negative value to indicate raw bytes instead of percentage
      } else {
        onProgress(Math.round((loaded / total) * 100));
      }
    }
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const blob = new Blob(chunks, { type: contentType });
  await cacheSet(url, blob);
  return blob;
}
