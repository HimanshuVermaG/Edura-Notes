/**
 * Returns a new array of notes sorted by the given criteria.
 * @param {Array} notes - list of note objects
 * @param {Array} folders - list of folder objects { _id, name }
 * @param {string} sortBy - 'name' | 'size' | 'time'
 */
export function sortNotes(notes, folders, sortBy) {
  const list = [...notes];
  const getTitle = (note) => (note.title || note.originalName || '').toLowerCase();
  const getSize = (note) => note.size ?? 0;
  const getTime = (note) => new Date(note.updatedAt || note.createdAt || 0).getTime();

  if (sortBy === 'name') {
    list.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
  } else if (sortBy === 'size') {
    list.sort((a, b) => getSize(a) - getSize(b));
  } else if (sortBy === 'time') {
    list.sort((a, b) => getTime(b) - getTime(a)); // newest first
  }
  return list;
}
