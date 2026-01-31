import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  useEffect(() => {
    api('/admin/users')
      .then(setUsers)
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const BYTES_PER_MB = 1024 * 1024;
  const formatStorage = (used, limit) =>
    `${((used ?? 0) / BYTES_PER_MB).toFixed(1)} MB / ${((limit ?? 0) / BYTES_PER_MB).toFixed(1)} MB`;

  const filtered = appliedSearch.trim()
    ? users.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(appliedSearch.trim().toLowerCase()) ||
          (u.email || '').toLowerCase().includes(appliedSearch.trim().toLowerCase())
      )
    : users;

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
      <div className="mb-3">
        <label htmlFor="admin-users-search" className="form-label visually-hidden">Search users</label>
        <div className="input-group" style={{ maxWidth: 400 }}>
          <input
            id="admin-users-search"
            type="search"
            className="form-control"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => {
              const v = e.target.value;
              setSearchInput(v);
              if (v.trim() === '') setAppliedSearch('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setAppliedSearch(searchInput))}
            aria-label="Search users"
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAppliedSearch(searchInput)}
          >
            Search
          </button>
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
              {filtered.map((u) => (
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
        {filtered.length === 0 && (
          <div className="card-body text-center text-muted">No users found.</div>
        )}
      </div>
    </div>
  );
}
