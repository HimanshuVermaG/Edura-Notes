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

// Simple in-memory cache for downloaded blobs to avoid re-downloading during the same session
const blobCache = new Map();

export async function apiGetBlob(url) {
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
  blobCache.set(url, blob);
  return blob;
}

export async function apiGetBlobWithProgress(url, onProgress) {
  if (blobCache.has(url)) {
    if (onProgress) onProgress(100);
    return blobCache.get(url);
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
  
  if (!contentLength || isNaN(total)) {
    // If no content-length, we can't show percentage, just return the blob
    return res.blob();
  }

  const reader = res.body.getReader();
  let loaded = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    if (onProgress) {
      onProgress(Math.round((loaded / total) * 100));
    }
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const blob = new Blob(chunks, { type: contentType });
  blobCache.set(url, blob);
  return blob;
}
