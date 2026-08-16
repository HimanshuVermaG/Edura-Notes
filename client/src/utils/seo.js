import { useEffect } from 'react';

export const SITE_NAME = 'Notes Handling';
// Kept in sync with index.html and client/api/prerender.js.
export const SITE_ORIGIN = 'https://noteshandling.zya.me';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

function upsertMeta(attr, key, content) {
  if (content == null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (href == null) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Imperatively syncs document.title and the SEO-relevant <head> tags to the
 * given page's content. Deliberately not a library like react-helmet — the
 * need here (title, description, canonical, OG/Twitter tags, robots) is small
 * enough that upserting a handful of tags on mount covers it without adding
 * a dependency, and every route in this app is mutually exclusive (no two
 * pages ever mount at once), so there's nothing to reconcile between siblings.
 */
export function setSeo({ title, description, canonicalPath, image, noindex = false } = {}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  document.title = fullTitle;

  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

  const url = canonicalPath ? `${SITE_ORIGIN}${canonicalPath}` : undefined;
  upsertLink('canonical', url);

  upsertMeta('property', 'og:title', fullTitle);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', image || DEFAULT_OG_IMAGE);
  upsertMeta('property', 'og:url', url);

  upsertMeta('name', 'twitter:title', fullTitle);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image || DEFAULT_OG_IMAGE);
}

/**
 * React hook wrapper — call once per page with plain string/boolean values
 * (not a freshly-constructed object each render, so the dependency array
 * only fires when the actual content changes, e.g. once async data loads).
 */
export function useSeo({ title, description, canonicalPath, image, noindex = false } = {}) {
  useEffect(() => {
    setSeo({ title, description, canonicalPath, image, noindex });
  }, [title, description, canonicalPath, image, noindex]);
}
