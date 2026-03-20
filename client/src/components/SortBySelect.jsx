export const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'time', label: 'Time' },
];

// ArrowUpDown icon
function ArrowUpDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 11 12 6 7 11" />
      <polyline points="17 18 12 13 7 18" />
    </svg>
  );
}

export default function SortBySelect({ sortBy, onSortByChange }) {
  return (
    <div className="sort-by-pill-wrap">
      <span className="sort-by-icon" aria-hidden>
        <ArrowUpDownIcon />
      </span>
      <label htmlFor="sort-by-select" className="form-label mb-0 small text-muted visually-hidden">
        Sort by
      </label>
      <select
        id="sort-by-select"
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        aria-label="Sort notes by"
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
