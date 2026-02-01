import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

const PAGE_SIZES = [10, 20, 50, 100];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    api(`/admin/users?${params.toString()}`)
      .then((data) => {
        setUsers(data.users || []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, limit, appliedSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const BYTES_PER_MB = 1024 * 1024;
  const formatStorage = (used, limitBytes) =>
    `${((used ?? 0) / BYTES_PER_MB).toFixed(1)} MB / ${((limitBytes ?? 0) / BYTES_PER_MB).toFixed(1)} MB`;

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

  if (error) {
    return (
      <div className="admin-page p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page p-4">
      <h1 className="h4 mb-4">Users</h1>
      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
        <label htmlFor="admin-users-search" className="form-label visually-hidden">Search users</label>
        <div className="input-group" style={{ maxWidth: 400 }}>
          <input
            id="admin-users-search"
            type="search"
            className="form-control"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            aria-label="Search users"
          />
          <button type="button" className="btn btn-primary" onClick={handleSearch}>
            Search
          </button>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="admin-users-per-page" className="form-label small mb-0 text-nowrap">
            Users per page
          </label>
          <select
            id="admin-users-per-page"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={limit}
            onChange={handleLimitChange}
            aria-label="Users per page"
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
                <th>Name</th>
                <th>Email</th>
                <th>Notes</th>
                <th>Storage</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.noteCount ?? 0}</td>
                  <td>{formatStorage(u.usedBytes, u.storageLimitBytes)}</td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Link to={`/admin/users/${u._id}`} className="btn btn-sm btn-outline-primary">
                      View files
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && !loading && (
          <div className="card-body text-center text-muted">No users found.</div>
        )}
      </div>
      {total > 0 && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
          <p className="small text-muted mb-0">
            Showing {start}–{end} of {total} user{total !== 1 ? 's' : ''}
          </p>
          <nav aria-label="Users pagination" className="d-flex align-items-center gap-1">
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
    </div>
  );
}
