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

export async function apiGetBlob(url) {
  const token = getToken();
  const res = await fetch(getApiUrl(url), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load file');
  return res.blob();
}
