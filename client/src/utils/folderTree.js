/** Case-insensitive name comparator for folder nodes. */
function compareFolderByName(a, b) {
  const nameA = (a.folder?.name ?? '').toString().toLowerCase();
  const nameB = (b.folder?.name ?? '').toString().toLowerCase();
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
}

/**
 * Sort a level of nodes by name and recurse into children so every level is sorted.
 */
function sortTreeByName(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) return;
  nodes.sort(compareFolderByName);
  nodes.forEach((n) => {
    if (Array.isArray(n.children) && n.children.length > 0) sortTreeByName(n.children);
  });
}

/**
 * Build a tree from flat folders (with parentId).
 * Returns array of { folder, children } where children are nested. Sorted by name at every level (root and all subfolders).
 */
export function buildFolderTree(folders) {
  const list = Array.isArray(folders) ? [...folders] : [];
  const byId = new Map(list.map((f) => [f._id, { folder: f, children: [] }]));
  const roots = [];
  list.forEach((f) => {
    const node = byId.get(f._id);
    const parentId = f.parentId && (typeof f.parentId === 'object' ? f.parentId._id : f.parentId);
    if (!parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });
  sortTreeByName(roots);
  return roots;
}

const MAX_FOLDER_DEPTH = 2;

/**
 * Flatten tree for parent dropdown: [{ id, name, depth }].
 * Only includes folders up to depth maxDepth - 2 so new folder can be at most depth maxDepth - 1 (0-indexed).
 * For 2-level hierarchy: maxDepth 2 → include depth 0 only (new folder can be at 0 or 1).
 */
export function flattenFolderTreeForSelect(tree, depth = 0, maxDepth = MAX_FOLDER_DEPTH) {
  const result = [];
  const maxParentDepth = maxDepth - 2;
  tree.forEach((node) => {
    if (depth <= maxParentDepth) result.push({ id: node.folder._id, name: node.folder.name, depth });
    if (node.children && node.children.length > 0 && depth + 1 < maxDepth) {
      result.push(...flattenFolderTreeForSelect(node.children, depth + 1, maxDepth));
    }
  });
  return result;
}

/**
 * Max folder depth for display (2 levels: root, subfolder).
 */
export function getMaxFolderDepth() {
  return MAX_FOLDER_DEPTH;
}

/**
 * Flatten tree to folder array in tree order (for display).
 */
export function getFoldersInTreeOrder(folders) {
  const tree = buildFolderTree(folders);
  const result = [];
  function walk(nodes) {
    nodes.forEach((node) => {
      result.push(node.folder);
      if (node.children?.length) walk(node.children);
    });
  }
  walk(tree);
  return result;
}

/**
 * Find a node in the tree by folder id (searches all levels).
 */
function findNodeInTree(nodes, folderId) {
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.folder?._id === folderId) return node;
    const found = findNodeInTree(node.children, folderId);
    if (found) return found;
  }
  return null;
}

/**
 * Collect folder id and all descendant folder ids for cascading selection.
 * Returns [folderId, ...descendantIds].
 */
export function getFolderIdAndDescendantIds(tree, folderId) {
  const node = findNodeInTree(tree, folderId);
  if (!node) return [folderId];
  const ids = [folderId];
  function collect(nodes) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach((n) => {
      if (n.folder?._id) ids.push(n.folder._id);
      collect(n.children);
    });
  }
  collect(node.children);
  return ids;
}
