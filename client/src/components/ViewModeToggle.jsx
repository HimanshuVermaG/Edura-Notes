export default function ViewModeToggle({ viewMode, onViewModeChange }) {
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
      <button
        type="button"
        className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onViewModeChange('grid')}
        title="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        Grid
      </button>
      <button
        type="button"
        className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onViewModeChange('list')}
        title="List view"
        aria-pressed={viewMode === 'list'}
      >
        List
      </button>
    </div>
  );
}
