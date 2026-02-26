// Grid icon (2x2 squares)
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

// List icon (three lines)
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export default function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="view-mode-segmented" role="group" aria-label="View mode">
      <button
        type="button"
        className={viewMode === 'grid' ? 'active' : ''}
        onClick={() => onViewModeChange('grid')}
        title="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        <GridIcon />
      </button>
      <button
        type="button"
        className={viewMode === 'list' ? 'active' : ''}
        onClick={() => onViewModeChange('list')}
        title="List view"
        aria-pressed={viewMode === 'list'}
      >
        <ListIcon />
      </button>
    </div>
  );
}
