import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

const FILES_PAGE_SIZES = [10, 20, 50, 100];

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [data, setData] = useState({ user: null, notes: [], notesTotal: 0, notesPage: 1, notesLimit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showDeleteNotesModal, setShowDeleteNotesModal] = useState(false);
  const [storageLimitMB, setStorageLimitMB] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [savingProfileListed, setSavingProfileListed] = useState(false);
  const [savingNoteListedId, setSavingNoteListedId] = useState(null);
  const [notesPage, setNotesPage] = useState(1);
  const [notesLimit, setNotesLimit] = useState(10);

  const isSelf = currentUser?._id === userId;
  const BYTES_PER_MB = 1024 * 1024;

  const fetchUser = useCallback(() => {
    if (!userId) return Promise.resolve();
    const params = new URLSearchParams();
    params.set('notesPage', String(notesPage));
    params.set('notesLimit', String(notesLimit));
    return api(`/admin/users/${userId}?${params.toString()}`)
      .then((res) => {
        setData(res);
        const limitBytes = res.user?.storageLimitBytes ?? 50 * 1024 * 1024;
        setStorageLimitMB(String(Math.round(limitBytes / BYTES_PER_MB)));
      })
      .catch((err) => setError(err.message || 'Failed to load user'));
  }, [userId, notesPage, notesLimit]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    fetchUser().finally(() => setLoading(false));
  }, [userId, fetchUser]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const notes = data.notes || [];
    if (selected.size === notes.length) setSelected(new Set());
    else setSelected(new Set(notes.map((n) => n._id)));
  };

  const refetchWithParams = () => {
    const params = new URLSearchParams();
    params.set('notesPage', String(notesPage));
    params.set('notesLimit', String(notesLimit));
    return api(`/admin/users/${userId}?${params.toString()}`).then(setData);
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
      const newTotal = (data.notesTotal ?? 0) - selected.size;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / notesLimit));
      const pageToUse = Math.min(notesPage, newTotalPages);
      setNotesPage(pageToUse);
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
      const newTotal = (data.notesTotal ?? 1) - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / notesLimit));
      const pageToUse = Math.min(notesPage, newTotalPages);
      setNotesPage(pageToUse);
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    }
  };

  const handleSaveStorageLimit = async () => {
    const mb = Number(storageLimitMB);
    if (!Number.isFinite(mb) || mb < 0) {
      setLimitMessage('Enter a valid non-negative number (MB).');
      return;
    }
    setLimitMessage('');
    setSavingLimit(true);
    try {
      await api(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ storageLimitBytes: mb * BYTES_PER_MB }),
      });
      await refetchWithParams();
      setLimitMessage('Storage limit updated.');
      setTimeout(() => setLimitMessage(''), 3000);
    } catch (err) {
      setLimitMessage(err.message || 'Failed to update limit');
    } finally {
      setSavingLimit(false);
    }
  };

  const handleProfileListedChange = async (checked) => {
    setSavingProfileListed(true);
    setError('');
    try {
      await api(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ profileListedOnExplore: checked }),
      });
      await refetchWithParams();
    } catch (err) {
      setError(err.message || 'Failed to update profile listing');
    } finally {
      setSavingProfileListed(false);
    }
  };

  const handleNoteListedChange = async (noteId, listedOnExplore) => {
    setSavingNoteListedId(noteId);
    setError('');
    try {
      await api(`/admin/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ listedOnExplore }),
      });
      await refetchWithParams();
    } catch (err) {
      setError(err.message || 'Failed to update note listing');
    } finally {
      setSavingNoteListedId(null);
    }
  };

  const handleFilesPerPageChange = (e) => {
    const newLimit = Number(e.target.value);
    setNotesLimit(newLimit);
    setNotesPage(1);
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

  const { user, usedBytes = 0, notes, notesTotal = 0 } = data;
  const limitBytes = user?.storageLimitBytes ?? 50 * BYTES_PER_MB;
  const filesTotalPages = Math.max(1, Math.ceil(notesTotal / notesLimit));
  const filesStart = notesTotal === 0 ? 0 : (notesPage - 1) * notesLimit + 1;
  const filesEnd = Math.min(notesPage * notesLimit, notesTotal);

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
            <p className="small text-muted mb-0 mt-1">{notesTotal} file(s)</p>
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

      <div className="admin-card card mb-4">
        <div className="card-body">
          <h3 className="h6 mb-3">Explore</h3>
          <div className="form-check">
            <input
              id="admin-profile-listed-explore"
              type="checkbox"
              className="form-check-input"
              checked={!!user?.profileListedOnExplore}
              disabled={savingProfileListed}
              onChange={(e) => handleProfileListedChange(e.target.checked)}
              aria-label="List profile on Explore"
            />
            <label className="form-check-label" htmlFor="admin-profile-listed-explore">
              List profile on Explore
            </label>
          </div>
          {savingProfileListed && <span className="small text-muted ms-2">Saving...</span>}
        </div>
      </div>

      <div className="admin-card card mb-4">
        <div className="card-body">
          <h3 className="h6 mb-3">Storage limit</h3>
          <p className="small text-muted mb-2">
            Used: {(usedBytes / BYTES_PER_MB).toFixed(1)} MB · Limit: {(limitBytes / BYTES_PER_MB).toFixed(1)} MB
          </p>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <label htmlFor="admin-storage-limit-mb" className="form-label small mb-0">Limit (MB)</label>
            <input
              id="admin-storage-limit-mb"
              type="number"
              min={0}
              step={1}
              className="form-control form-control-sm"
              style={{ width: 90 }}
              value={storageLimitMB}
              onChange={(e) => setStorageLimitMB(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSaveStorageLimit}
              disabled={savingLimit}
            >
              {savingLimit ? 'Saving...' : 'Save'}
            </button>
            {limitMessage && (
              <span className={`small ${limitMessage.startsWith('Storage limit updated') ? 'text-success' : 'text-danger'}`}>
                {limitMessage}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
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
        <div className="d-flex align-items-center gap-2 ms-auto">
          <label htmlFor="admin-files-per-page" className="form-label small mb-0 text-nowrap">
            Files per page
          </label>
          <select
            id="admin-files-per-page"
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={notesLimit}
            onChange={handleFilesPerPageChange}
            aria-label="Files per page"
          >
            {FILES_PAGE_SIZES.map((n) => (
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
                <th style={{ width: 40 }}>
                  {notes?.length > 0 && (
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={notes.length > 0 && selected.size === notes.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all on page"
                    />
                  )}
                </th>
                <th>Title</th>
                <th>Original filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Public</th>
                <th>On Explore</th>
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
                  <td>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={!!note.listedOnExplore}
                      disabled={savingNoteListedId === note._id}
                      onChange={(e) => handleNoteListedChange(note._id, e.target.checked)}
                      aria-label={`List ${note.title} on Explore`}
                    />
                  </td>
                  <td>{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Link
                      to={`/admin/view/note/${note._id}`}
                      className="btn btn-sm btn-outline-primary me-1"
                    >
                      View
                    </Link>
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
        {(!notes || notes.length === 0) && !loading && (
          <div className="card-body text-center text-muted">No files.</div>
        )}
      </div>

      {notesTotal > 0 && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
          <p className="small text-muted mb-0">
            Showing {filesStart}–{filesEnd} of {notesTotal} file{notesTotal !== 1 ? 's' : ''}
          </p>
          <nav aria-label="Files pagination" className="d-flex align-items-center gap-1">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={notesPage <= 1}
              onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="px-2 small">
              Page {notesPage} of {filesTotalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={notesPage >= filesTotalPages}
              onClick={() => setNotesPage((p) => Math.min(filesTotalPages, p + 1))}
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        </div>
      )}

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
