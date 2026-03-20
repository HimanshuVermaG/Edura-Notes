import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';

function getStripClass(note) {
  const mime = (note.mimeType || '').toLowerCase();
  const name = (note.originalName || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'note-card-strip-pdf';
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) return 'note-card-strip-image';
  if (mime.includes('word') || /\.(doc|docx)$/.test(name)) return 'note-card-strip-doc';
  return 'note-card-strip-other';
}

export default function NoteCard({ note, onDeleted, viewMode = 'grid', showActions = true, folderName, showFileName = true, showVisibilityToggle = false, showUploadedBy = false }) {
  const [deleting, setDeleting] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { addToast } = useToast();
  const location = useLocation();
  const viewLinkState = { from: location.pathname };

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
    } catch (err) {
      addToast(err.message || 'Failed to update visibility', 'error');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api(`/notes/${note._id}`, { method: 'DELETE' });
      setShowDeleteModal(false);
      onDeleted?.();
    } catch (err) {
      addToast(err.message || 'Failed to delete note', 'error');
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
      <>
        <div
          className="edura-card p-2 px-3 d-flex align-items-center gap-3 flex-wrap note-card-list-row"
          style={{ cursor: showActions ? 'default' : 'default' }}
        >
          <div className="flex-grow-1 min-w-0 d-flex align-items-center gap-2 flex-wrap">
            <h6 className="card-title mb-0 text-truncate" style={{ minWidth: 120 }}>{note.title}</h6>
            {showFileName && (
              <span className="text-muted small text-truncate" style={{ maxWidth: 200 }}>{label}</span>
            )}
            {folderName != null && (
              <span className="badge bg-light text-dark small" style={{ borderRadius: '9999px' }}>{folderName}</span>
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
            <Link to={`/notes/${note._id}/view`} state={viewLinkState} className="btn btn-sm btn-outline-primary">View</Link>
            {showActions && (
              <>
                <Link to={`/notes/${note._id}/edit`} className="btn btn-sm btn-outline-secondary">Edit</Link>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={(e) => { e.preventDefault(); setShowDeleteModal(true); }}
                  disabled={deleting}
                  title="Delete note"
                  aria-label="Delete note"
                >
                  {deleting ? '…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>
        <ConfirmModal
          show={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete note"
          body="Delete this note? This cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
        />
      </>
    );
  }

  return (
    <div className="edura-card d-flex flex-column" style={{ cursor: 'default', overflow: 'hidden', padding: 0 }}>
      {/* Color strip */}
      <div className={`note-card-top-strip ${getStripClass(note)}`} />
      <div className="p-3 flex-grow-1 d-flex flex-column">
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
            {folderName != null && (
              <span className="badge bg-light text-dark small mb-2" style={{ borderRadius: '9999px' }}>{folderName}</span>
            )}
            <div className="d-flex gap-2 flex-wrap mt-auto">
              <Link to={`/notes/${note._id}/view`} state={viewLinkState} className="btn btn-sm btn-outline-primary">View</Link>
              {showActions && (
                <>
                  <Link to={`/notes/${note._id}/edit`} className="btn btn-sm btn-outline-secondary">Edit</Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={(e) => { e.preventDefault(); setShowDeleteModal(true); }}
                    disabled={deleting}
                    title="Delete note"
                    aria-label="Delete note"
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete note"
        body="Delete this note? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
