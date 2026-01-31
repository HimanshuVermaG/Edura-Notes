import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function NoteCard({ note, onDeleted, viewMode = 'grid', showActions = true, folderName, showFileName = true, showVisibilityToggle = false, showUploadedBy = false }) {
  const [deleting, setDeleting] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const handleVisibilityChange = async (e) => {
    const isPublic = e.target.value === 'true';
    if (note.isPublic === isPublic) return;
    setTogglingVisibility(true);
    try {
      await api(`/notes/${note._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isPublic }),
      });
      onDeleted?.();
    } catch {
      // ignore
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/notes/${note._id}`, { method: 'DELETE' });
      onDeleted?.();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const label = note.originalName || 'Note';
  const description = note.description?.trim() || '';
  const authorName = note.userId?.name || '';
  const isList = viewMode === 'list';

  if (isList) {
    return (
      <div
        className="edura-card p-2 px-3 d-flex align-items-center gap-3 flex-wrap"
        style={{ cursor: showActions ? 'default' : 'default' }}
      >
        <div className="flex-grow-1 min-w-0 d-flex align-items-center gap-2 flex-wrap">
          <h6 className="card-title mb-0 text-truncate" style={{ minWidth: 120 }}>{note.title}</h6>
          {showFileName && (
            <span className="text-muted small text-truncate" style={{ maxWidth: 200 }}>{label}</span>
          )}
          {folderName != null && (
            <span className="badge bg-light text-dark small">{folderName}</span>
          )}
          {showVisibilityToggle && (
            <select
              className="form-select form-select-sm small"
              style={{ width: 'auto', minWidth: 90 }}
              value={note.isPublic === true ? 'true' : 'false'}
              onChange={handleVisibilityChange}
              disabled={togglingVisibility}
              title="Visibility"
            >
              <option value="false">Private</option>
              <option value="true">Public</option>
            </select>
          )}
          {description && (
            <span className="text-muted small text-truncate" style={{ maxWidth: 240 }} title={description}>{description}</span>
          )}
          {showUploadedBy && authorName && (
            <span className="text-muted small">By {authorName}</span>
          )}
        </div>
        <div className="d-flex gap-1 flex-shrink-0">
          <Link to={`/notes/${note._id}/view`} className="btn btn-sm btn-outline-primary">View</Link>
          {showActions && (
            <>
              <Link to={`/notes/${note._id}/edit`} className="btn btn-sm btn-outline-secondary">Edit</Link>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={handleDelete}
                disabled={deleting}
                title="Delete note"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="edura-card p-3" style={{ cursor: 'default' }}>
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="flex-grow-1 min-w-0">
          <h6 className="card-title mb-1 text-truncate">{note.title}</h6>
          {showFileName && (
            <p className="card-text small mb-1 text-muted text-truncate">{label}</p>
          )}
          {description && (
            <p className="card-text small mb-1 text-muted note-card-description" title={description}>
              {description.length > 80 ? description.slice(0, 80) + '…' : description}
            </p>
          )}
          {showUploadedBy && authorName && (
            <p className="card-text small mb-2 text-muted">Uploaded by {authorName}</p>
          )}
          {showVisibilityToggle && (
            <div className="mb-2">
              <label htmlFor={`visibility-${note._id}`} className="form-label small visually-hidden">Visibility</label>
              <select
                id={`visibility-${note._id}`}
                className="form-select form-select-sm small"
                style={{ width: 'auto', minWidth: 90 }}
                value={note.isPublic === true ? 'true' : 'false'}
                onChange={handleVisibilityChange}
                disabled={togglingVisibility}
                title="Visibility"
              >
                <option value="false">Private</option>
                <option value="true">Public</option>
              </select>
            </div>
          )}
          <div className="d-flex gap-2 flex-wrap">
            <Link to={`/notes/${note._id}/view`} className="btn btn-sm btn-outline-primary">View</Link>
            {showActions && (
              <>
                <Link to={`/notes/${note._id}/edit`} className="btn btn-sm btn-outline-secondary">Edit</Link>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete note"
                >
                  {deleting ? '…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
