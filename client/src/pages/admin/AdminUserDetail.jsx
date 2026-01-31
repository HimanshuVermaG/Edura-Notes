import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState({ user: null, notes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showDeleteNotesModal, setShowDeleteNotesModal] = useState(false);

  const isSelf = currentUser?._id === userId;

  useEffect(() => {
    if (!userId) return;
    api(`/admin/users/${userId}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === data.notes.length) setSelected(new Set());
    else setSelected(new Set(data.notes.map((n) => n._id)));
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    setError('');
    try {
      await api('/admin/notes', {
        method: 'DELETE',
        body: JSON.stringify({ noteIds: [...selected] }),
      });
      setSelected(new Set());
      setShowDeleteNotesModal(false);
      const next = await api(`/admin/users/${userId}`);
      setData(next);
    } catch (err) {
      setError(err.message || 'Failed to delete notes');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    setError('');
    try {
      await api(`/admin/users/${userId}`, { method: 'DELETE' });
      setShowDeleteUserModal(false);
      navigate('/admin/users');
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (noteId) => {
    setError('');
    try {
      await api('/admin/notes', {
        method: 'DELETE',
        body: JSON.stringify({ noteIds: [noteId] }),
      });
      const next = await api(`/admin/users/${userId}`);
      setData(next);
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    }
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

  if (error && !data.user) {
    return (
      <div className="admin-page p-4">
        <div className="alert alert-danger">{error}</div>
        <Link to="/admin/users" className="btn btn-outline-primary">Back to users</Link>
      </div>
    );
  }

  const { user, notes } = data;

  return (
    <div className="admin-page p-4">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link to="/admin/users" className="btn btn-sm btn-outline-secondary">← Users</Link>
      </div>
      <div className="admin-card card mb-4">
        <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h1 className="h5 mb-1">{user?.name || '—'}</h1>
            <p className="text-muted small mb-0">{user?.email || '—'}</p>
            <p className="small text-muted mb-0 mt-1">{notes?.length ?? 0} file(s)</p>
          </div>
          {!isSelf && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowDeleteUserModal(true)}
            >
              Delete user
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex align-items-center gap-2 mb-3">
        <h2 className="h6 mb-0">Files</h2>
        {notes?.length > 0 && selected.size > 0 && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setShowDeleteNotesModal(true)}
          >
            Delete selected ({selected.size})
          </button>
        )}
      </div>

      <div className="admin-card card">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  {notes?.length > 0 && (
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selected.size === notes.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  )}
                </th>
                <th>Title</th>
                <th>Original filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Public</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(notes || []).map((note) => (
                <tr key={note._id}>
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selected.has(note._id)}
                      onChange={() => toggleSelect(note._id)}
                      aria-label={`Select ${note.title}`}
                    />
                  </td>
                  <td>{note.title || '—'}</td>
                  <td>{note.originalName || '—'}</td>
                  <td>{note.mimeType || '—'}</td>
                  <td>{note.size != null ? `${(note.size / 1024).toFixed(1)} KB` : '—'}</td>
                  <td>{note.isPublic ? 'Yes' : 'No'}</td>
                  <td>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        if (window.confirm('Delete this file?')) handleDeleteOne(note._id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!notes || notes.length === 0) && (
          <div className="card-body text-center text-muted">No files.</div>
        )}
      </div>

      {showDeleteUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete user</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteUserModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                This will delete the user and all their files. This cannot be undone. Continue?
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteUserModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteUser} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete user'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteNotesModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete selected files</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteNotesModal(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                Delete {selected.size} file(s)? This cannot be undone.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteNotesModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteSelected} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
