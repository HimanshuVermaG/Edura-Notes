// A bare "25+ word/hyphen characters somewhere in the string" check accepts
// any non-URL string — this actually requires a drive.google.com URL.
export function isValidDriveLink(link) {
  if (!link) return false;
  try {
    const url = new URL(link);
    return /(^|\.)drive\.google\.com$/i.test(url.hostname) && /[-\w]{25,}/.test(link);
  } catch {
    return false;
  }
}
