import { useState, useMemo, useRef, useEffect } from 'react';
import { buildFolderTree, getMaxFolderDepth } from '../utils/folderTree';

const MAX_DEPTH = getMaxFolderDepth();

const FolderIcon = () => (
  <span className="folder-icon" aria-hidden>
    <svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 2a1 1 0 0 1 1-1h3.586a1 1 0 0 1 .707.293L7.414 2H14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2z" />
    </svg>
  </span>
);

function getFolderNameById(folders, folderId) {
  if (!folderId) return null;
  const f = Array.isArray(folders) ? folders.find((x) => x._id === folderId) : null;
  return f ? f.name : null;
}

function FolderTreeSelect({
  folders = [],
  value = '',
  onChange,
  id,
  className = '',
  size = '',
  labelId,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const containerRef = useRef(null);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const displayLabel = value ? (getFolderNameById(folders, value) || 'Folder') : 'Uncategorized';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggleExpand = (folderId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleSelect = (folderId) => {
    onChange(folderId || '');
    setOpen(false);
  };

  function renderTree(nodes, depth = 0) {
    return nodes.map((node) => {
      const f = node.folder;
      const hasChildren = node.children && node.children.length > 0 && depth + 1 < MAX_DEPTH;
      const isExpanded = expandedIds.has(f._id);
      return (
        <li
          key={f._id}
          className={`folder-tree-select-item folder-depth-${depth >= MAX_DEPTH ? MAX_DEPTH - 1 : depth} ${value === f._id ? 'selected' : ''}`}
        >
          <div className="folder-tree-select-row">
            {hasChildren ? (
              <button
                type="button"
                className={`folder-chevron ${isExpanded ? 'folder-chevron-down' : 'folder-chevron-right'}`}
                onClick={(e) => { e.stopPropagation(); handleToggleExpand(f._id); }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span className="folder-chevron folder-chevron-placeholder" />
            )}
            <FolderIcon />
            <button
              type="button"
              className="folder-tree-select-label"
              onClick={() => handleSelect(f._id)}
            >
              {f.name}
            </button>
          </div>
          {hasChildren && isExpanded && (
            <ul className="folder-list folder-list-nested">
              {renderTree(node.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  }

  return (
    <div className={`folder-tree-select ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        className={`form-select form-select-sm folder-tree-select-trigger ${size}`.trim()}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-label="Select folder"
      >
        <span className="folder-tree-select-trigger-text">{displayLabel}</span>
        <span className="folder-tree-select-chevron" aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="folder-tree-select-dropdown" role="listbox">
          <button
            type="button"
            className={`folder-tree-select-option ${!value ? 'selected' : ''}`}
            onClick={() => handleSelect('')}
          >
            <FolderIcon />
            <span>Uncategorized</span>
          </button>
          <ul className="folder-list folder-tree-select-list">
            {renderTree(folderTree)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FolderTreeSelect;
