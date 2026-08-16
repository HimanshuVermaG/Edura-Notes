// Extracts a Drive file id only from an actual drive.google.com URL — the
// previous check (`/[-\w]{25,}/` matched anywhere) accepted any 25+ char
// token, letting a non-Drive URL be stored and later rendered to other users
// as a trustworthy "Drive link". Not server-side exploitable (fetchDriveStream
// always hits the hardcoded drive.google.com endpoint regardless), but there's
// no reason to accept and store a link that isn't actually one.
export function extractDriveFileId(link) {
  if (!link) return null;
  let url;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  if (!/(^|\.)drive\.google\.com$/i.test(url.hostname)) return null;
  const match = link.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

export async function fetchDriveStream(fileId) {
  const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let response = await fetch(initialUrl);

  // Google Drive returns 200 OK with HTML for the virus scan warning page
  const contentType = response.headers.get('content-type') || '';
  if (response.ok && contentType.includes('text/html')) {
    const text = await response.text();
    
    // Check if there is a download form (new Google Drive structure)
    const formMatch = text.match(/<form[^>]*id="download-form"[^>]*action="([^"]+)"/i);
    if (formMatch) {
      const actionUrl = formMatch[1];
      const url = new URL(actionUrl.startsWith('http') ? actionUrl : `https://drive.google.com${actionUrl}`);
      
      const inputRegex = /<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi;
      let match;
      while ((match = inputRegex.exec(text)) !== null) {
        url.searchParams.append(match[1], match[2]);
      }
      
      response = await fetch(url.toString());
    } else {
      // Fallback for older structure: look for confirm token
      const match = text.match(/confirm=([a-zA-Z0-9-_]+)/);
      if (match) {
        const confirmToken = match[1];
        const confirmUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
        response = await fetch(confirmUrl);
      } else {
        throw new Error('Could not bypass Google Drive warning page. Ensure the file is public.');
      }
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch from Google Drive: ${response.status} ${response.statusText}`);
  }

  // Ensure we didn't get HTML again
  const finalContentType = response.headers.get('content-type') || '';
  if (finalContentType.includes('text/html')) {
    throw new Error('Google Drive returned an HTML page instead of the file. Check permissions.');
  }

  return response;
}
