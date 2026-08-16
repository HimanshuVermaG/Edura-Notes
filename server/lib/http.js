// Strips CR/LF/quotes/control characters from a user-supplied filename before
// it goes into a Content-Disposition header, so an uploaded file's original
// name can't break out of the quoted value and inject extra header directives.
export function sanitizeFilenameForHeader(name) {
  const cleaned = String(name || 'file')
    .replace(/[\r\n"]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  return cleaned || 'file';
}
