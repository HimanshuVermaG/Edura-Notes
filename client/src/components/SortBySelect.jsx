export const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'time', label: 'Time' },
];

export default function SortBySelect({ sortBy, onSortByChange }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <label htmlFor="sort-by-select" className="form-label mb-0 small text-muted">
        Sort by
      </label>
      <select
        id="sort-by-select"
        className="form-select form-select-sm"
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        aria-label="Sort notes by"
        style={{ width: 'auto', minWidth: 100 }}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
