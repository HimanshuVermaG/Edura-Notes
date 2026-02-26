/**
 * Returns 2 characters for avatar initials when no profile picture is available.
 * - Two or more words: first letter of first two words (e.g. "John Doe" -> "JD").
 * - One word: first two letters of the name (e.g. "Alice" -> "AL").
 */
export function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).slice(0, 2).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}
