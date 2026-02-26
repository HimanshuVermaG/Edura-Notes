import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import ConfirmModal from '../../components/ConfirmModal';

const PAGE_SIZES = [10, 20, 50, 100];

export default function AdminCommunities() {
  const [communities, setCommunities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCommunities = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    api(`/admin/communities?${params.toString()}`)
      .then((data) => {
        setCommunities(data.communities || []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message || 'Failed to load communities'))
      .finally(() => setLoading(false));
  }, [page, limit, appliedSearch]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const handleSearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
  };

  const handleLimitChange = (e) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setPage(1);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    api(`/admin/communities/${deleteTarget._id}`, { method: 'DELETE' })
      .then(() => {
        setDeleteTarget(null);
        fetchCommunities();
      })
      .catch((err) => {
        setError(err.message || 'Failed to delete community');
        setDeleteTarget(null);
      })
      .finally(() => setDeleting(false));
  };

  if (loading) {
    return (
      <div className="admin-page p-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !deleteTarget) {
    return (
      <div className="admin-page p-4">
        <div className="alert alert-danger d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page p-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb small mb-0">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Communities</li>
        </ol>
      </nav>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h1 className="h4 mb-0">Communities</h1>
        <Link to="/admin/communities/new" className="btn btn-primary">
          Setup New Community
        </Link>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <label htmlFor="admin-communities-search" className="form-label visually-hidden">Search communities</label>
        <div className="input-group" style={{ maxWidth: 400 }}>
          <input
            id="admin-communities-search"
            type="search"
            className="form-control"
            placeholder="Search by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            aria-label="Search communities"
          />
          <button type="button" className="btn btn-primary" onClick={handleSearch}>
            Search
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="admin-communities-per-page" className="form-label small mb-0 text-nowrap">
            Per page
          </label>
          <select
            id="admin-communities-per-page"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={limit}
            onChange={handleLimitChange}
            aria-label="Communities per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="admin-card card">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Cover</th>
                <th>Name</th>
                <th>Description</th>
                <th>Tags</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((c) => (
                <tr key={c._id}>
                  <td>
                    {c.coverUrl ? (
                      <img
                        src={c.coverUrl}
                        alt=""
                        className="rounded"
                        style={{ width: 56, height: 32, objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="text-muted small">—</span>
                    )}
                  </td>
                  <td>{c.name || '—'}</td>
                  <td className="text-break" style={{ maxWidth: 240 }}>
                    {c.description ? (c.description.length > 80 ? `${c.description.slice(0, 80)}…` : c.description) : '—'}
                  </td>
                  <td>
                    {Array.isArray(c.tags) && c.tags.length > 0 ? (
                      <span className="small">{c.tags.slice(0, 3).join(', ')}{c.tags.length > 3 ? '…' : ''}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Link to={`/admin/communities/${c._id}/edit`} className="btn btn-sm btn-outline-primary me-1">
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setDeleteTarget(c)}
                      aria-label={`Delete ${c.name}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {communities.length === 0 && !loading && (
          <div className="card-body text-center text-muted">
            <p className="mb-2">{appliedSearch.trim() ? 'No communities match your search.' : 'No communities yet.'}</p>
            {!appliedSearch.trim() && (
              <Link to="/admin/communities/new" className="btn btn-sm btn-primary">
                Setup New Community
              </Link>
            )}
            {appliedSearch.trim() && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setSearchInput('');
                  setAppliedSearch('');
                  setPage(1);
                }}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
          <p className="small text-muted mb-0">
            Showing {start}–{end} of {total} communit{total !== 1 ? 'ies' : 'y'}
          </p>
          <nav aria-label="Communities pagination" className="d-flex align-items-center gap-1">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="px-2 small">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        </div>
      )}
      <ConfirmModal
        show={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete community?"
        body={
          deleteTarget ? (
            <p className="mb-0">
              This will permanently delete &quot;{deleteTarget.name}&quot; and all its folders and files. This action cannot be undone.
            </p>
          ) : null
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
