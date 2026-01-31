import { useState, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import { buildFolderTree, flattenFolderTreeForSelect, getMaxFolderDepth, getFolderIdAndDescendantIds } from '../utils/folderTree';

const MAX_DEPTH = getMaxFolderDepth();

const FolderIcon = () => (
  <span className="folder-icon" aria-hidden>
    <svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 2a1 1 0 0 1 1-1h3.586a1 1 0 0 1 .707.293L7.414 2H14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2z" />
    </svg>
  </span>
);

function FolderRow({
  id,
  label,
  isSelected,
  onToggle,
  readOnly,
  editMode,
  editName,
  onEditNameChange,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onDelete,
  depth = 0,
  children,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  showFolderIcon = true,
}) {
  const handleRowClick = () => {
    if (!editMode) onToggle(id);
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (!editMode) onToggle(id);
  };

  const handleChevronClick = (e) => {
    e.stopPropagation();
    onToggleExpand?.(id);
  };

  const rowContent = editMode ? (
    <>
      {hasChildren ? <span className="folder-chevron folder-chevron-placeholder" /> : null}
      <input type="checkbox" disabled aria-hidden="true" style={{ visibility: 'hidden' }} />
      {showFolderIcon ? <FolderIcon /> : null}
      <span className="folder-list-label folder-edit-row">
        <input
          type="text"
          className="form-control form-control-sm folder-edit-input"
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSaveRename()}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          placeholder="Folder name"
        />
        <div className="folder-edit-actions">
          <button type="button" className="btn btn-sm btn-success" onClick={(e) => { e.stopPropagation(); onSaveRename(); }}>Save</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); onCancelRename(); }}>Cancel</button>
        </div>
      </span>
    </>
  ) : (
    <>
      {hasChildren ? (
        <button
          type="button"
          className={`folder-chevron ${isExpanded ? 'folder-chevron-down' : 'folder-chevron-right'}`}
          onClick={handleChevronClick}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
          title={isExpanded ? 'Collapse subfolders' : 'Expand subfolders'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      ) : (
        <span className="folder-chevron folder-chevron-placeholder" />
      )}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        aria-label={label}
        tabIndex={0}
      />
      {showFolderIcon ? <FolderIcon /> : null}
      <span className="folder-list-label">{label}</span>
      {!readOnly && onDelete != null && (
        <span className="folder-list-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onStartRename} title="Rename">✎</button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete} title="Delete">×</button>
        </span>
      )}
    </>
  );

  const depthClass = depth >= 0 && depth < MAX_DEPTH ? `folder-depth-${depth}` : 'folder-depth-root';
  return (
    <li
      className={`folder-list-item ${depth >= 0 ? 'folder-list-item-nested' : ''} ${depthClass} ${isSelected ? 'selected' : ''}`}
      onClick={handleRowClick}
    >
      <div className="folder-list-item-row">
        {rowContent}
      </div>
      {hasChildren && isExpanded ? children : null}
    </li>
  );
}

export default function FolderList({
  folders,
  selectedFolderIds,
  onSelectionChange,
  onFoldersChange,
  readOnly = false,
}) {
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const selectedSet = selectedFolderIds instanceof Set ? selectedFolderIds : new Set(selectedFolderIds || []);

  const folderTree = useMemo(() => buildFolderTree(folders || []), [folders]);
  const parentOptions = useMemo(() => flattenFolderTreeForSelect(folderTree), [folderTree]);

  const handleToggleExpand = useCallback((folderId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const isSelected = useCallback(
    (id) => {
      if (id === null) return selectedSet.size === 0;
      return selectedSet.has(id);
    },
    [selectedSet]
  );

  const handleToggle = useCallback(
    (id) => {
      if (id === null) {
        onSelectionChange(new Set());
        return;
      }
      const idsToToggle = getFolderIdAndDescendantIds(folderTree, id);
      const next = new Set(selectedSet);
      const isCurrentlySelected = idsToToggle.some((fid) => next.has(fid));
      if (isCurrentlySelected) {
        idsToToggle.forEach((fid) => next.delete(fid));
      } else {
        idsToToggle.forEach((fid) => next.add(fid));
      }
      onSelectionChange(next);
    },
    [selectedSet, onSelectionChange, folderTree]
  );

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const body = { name: newName.trim() };
      if (newParentId) body.parentId = newParentId;
      await api('/folders', { method: 'POST', body: JSON.stringify(body) });
      setNewName('');
      setNewParentId('');
      onFoldersChange();
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (id) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api(`/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName.trim() }) });
      setEditingId(null);
      setEditName('');
      onFoldersChange();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this folder? Notes inside will move to Uncategorized. Subfolders will move up.')) return;
    try {
      await api(`/folders/${id}`, { method: 'DELETE' });
      const next = new Set(selectedSet);
      next.delete(id);
      onSelectionChange(next);
      onFoldersChange();
    } catch {
      // ignore
    }
  };

  function renderTree(nodes, depth = 0) {
    return nodes.map((node) => {
      const f = node.folder;
      const hasChildren = node.children && node.children.length > 0 && depth + 1 < MAX_DEPTH;
      const isExpanded = expandedIds.has(f._id);
      return (
        <FolderRow
          key={f._id}
          id={f._id}
          label={f.name}
          isSelected={isSelected(f._id)}
          onToggle={handleToggle}
          readOnly={readOnly}
          editMode={editingId === f._id}
          editName={editName}
          onEditNameChange={setEditName}
          onSaveRename={() => handleRename(f._id)}
          onCancelRename={() => { setEditingId(null); setEditName(''); }}
          onStartRename={(e) => { e?.stopPropagation(); setEditingId(f._id); setEditName(f.name); }}
          onDelete={() => handleDelete(f._id)}
          depth={depth}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
          showFolderIcon={true}
          children={
            hasChildren ? (
              <ul className="folder-list folder-list-nested">
                {renderTree(node.children, depth + 1)}
              </ul>
            ) : null
          }
        />
      );
    });
  }

  return (
    <div className="folders-categories">
      <h3 className="folders-categories-title">Categories</h3>
      <div className="folders-categories-underline" />
      <p className="small text-muted mb-2">Select one or more to filter notes. Up to 2 levels (root → subfolder).</p>
      <ul className="folder-list">
        <FolderRow
          id={null}
          label="All Notes"
          isSelected={isSelected(null)}
          onToggle={handleToggle}
          readOnly={readOnly}
          depth={-1}
          showFolderIcon={true}
        />
        <FolderRow
          id="uncategorized"
          label="Uncategorized"
          isSelected={isSelected('uncategorized')}
          onToggle={handleToggle}
          readOnly={readOnly}
          depth={-1}
          showFolderIcon={true}
        />
        {renderTree(folderTree)}
      </ul>
      {!readOnly && (
        <form className="d-flex flex-column gap-2 mt-3" onSubmit={handleAddFolder}>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="New folder name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <label htmlFor="new-folder-parent" className="small text-muted mb-0">Parent folder (max 2 levels)</label>
          <select
            id="new-folder-parent"
            className="form-select form-select-sm"
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            aria-label="Parent folder (optional)"
          >
            <option value="">None (root level)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {'\u00A0'.repeat(opt.depth * 2) + opt.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-sm btn-edura" disabled={adding || !newName.trim()}>
            {adding ? 'Adding...' : 'Add Folder'}
          </button>
        </form>
      )}
    </div>
  );
}
