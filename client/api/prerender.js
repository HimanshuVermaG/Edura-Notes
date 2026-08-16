// Vercel serverless function (Node runtime), deployed alongside the client's
// static build. Only reached for requests whose User-Agent matched a known
// bot/crawler pattern on /profile/:userId or /view/note/:id — see the
// conditional rewrites in client/vercel.json. Regular browser traffic never
// hits this file; it always gets the normal SPA (index.html).
//
// Social-preview bots (Twitter, Facebook, Slack, WhatsApp, LinkedIn, etc.)
// and non-JS crawlers don't execute the client bundle, so they'd otherwise
// only ever see the empty <div id="root"></div> shell — this hands them a
// minimal static HTML document with the real title/description/image for
// the specific profile or note instead.

const SITE_NAME = 'Notes Handling';
// Keep these two in sync with client/src/utils/seo.js and client/index.html
// — all three need to agree on the actual deployed domain.
const SITE_ORIGIN = 'https://noteshandling.zya.me';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const API_BASE = (process.env.VITE_API_URL || 'https://edura-notes-server.vercel.app').replace(/\/$/, '');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderShell({ title, description, url, image }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const u = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${u}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
</head>
<body>
<p><a href="${u}">${t}</a></p>
</body>
</html>
`;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function defaultShellFor(path) {
  return renderShell({
    title: SITE_NAME,
    description: 'Organize, share, and discover study notes.',
    url: `${SITE_ORIGIN}${path}`,
    image: DEFAULT_OG_IMAGE,
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const path = typeof req.query?.path === 'string' ? req.query.path : req.url || '/';
  const profileMatch = path.match(/^\/profile\/([^/?]+)/);
  const noteMatch = path.match(/^\/view\/note\/([^/?]+)/);

  try {
    if (profileMatch) {
      const userId = profileMatch[1];
      const data = await fetchJson(`${API_BASE}/api/public/profile/${userId}`);
      // Only render rich tags once we've confirmed the profile is real and
      // actually public — never fabricate content for a private/missing one.
      if (data?.user) {
        const noteCount = Array.isArray(data.notes) ? data.notes.length : 0;
        return res.status(200).send(renderShell({
          title: `${data.user.name}'s Profile — ${SITE_NAME}`,
          description: data.user.bio || `${data.user.name} shares notes on ${SITE_NAME} — browse ${noteCount} note${noteCount === 1 ? '' : 's'}.`,
          url: `${SITE_ORIGIN}/profile/${userId}`,
          image: data.user.picture || DEFAULT_OG_IMAGE,
        }));
      }
    } else if (noteMatch) {
      const noteId = noteMatch[1];
      const data = await fetchJson(`${API_BASE}/api/public/notes/${noteId}`);
      if (data?.title) {
        return res.status(200).send(renderShell({
          title: `${data.title} — ${SITE_NAME}`,
          description: data.description || `View "${data.title}" shared on ${SITE_NAME}.`,
          url: `${SITE_ORIGIN}/view/note/${noteId}`,
          image: DEFAULT_OG_IMAGE,
        }));
      }
    }
  } catch (err) {
    console.error('[prerender] error:', err);
  }

  // Not found, private, or an unrecognized path — fall back to the same
  // generic shell a plain visit would get, not a fabricated/empty page.
  return res.status(200).send(defaultShellFor(path));
}
