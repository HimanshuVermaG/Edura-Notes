const getToken = () => localStorage.getItem('notes_token');

export async function api(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url.startsWith('http') ? url : `/api${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText || 'Request failed');
  return data;
}

export async function apiForm(url, formData, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url.startsWith('http') ? url : `/api${url}`, {
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
  const res = await fetch(url.startsWith('http') ? url : `/api${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load file');
  return res.blob();
}
