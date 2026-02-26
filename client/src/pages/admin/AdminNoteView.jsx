import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';
import SecureNoteViewerLazy from '../../components/SecureNoteViewerLazy';
import ErrorBoundary from '../../components/ErrorBoundary';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function AdminNoteView() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [savingListed, setSavingListed] = useState(false);

  const backUrl = note?.userId?._id ? `/admin/users/${note.userId._id}` : '/admin/users';
  const handleBack = useCallback(() => navigate(backUrl), [navigate, backUrl]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  useEffect(() => {
    if (!noteId) {
      setLoading(false);
      return;
    }
    api(`/admin/notes/${noteId}`)
      .then(setNote)
      .catch(() => setError('Note not found'))
      .finally(() => setLoading(false));
  }, [noteId]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleBack]);

  const handleListedOnExploreChange = async (checked) => {
    setSavingListed(true);
    setError('');
    try {
      const updated = await api(`/admin/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ listedOnExplore: checked }),
      });
      setNote(updated);
    } catch (err) {
      setError(err.message || 'Failed to update listing');
    } finally {
      setSavingListed(false);
    }
  };

  const preventContextMenu = useCallback((e) => e.preventDefault(), []);
  const preventDrag = useCallback((e) => e.preventDefault(), []);

  if (loading) {
    return (
      <div className="fullscreen-pdf-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="fullscreen-pdf-loading d-flex flex-column align-items-center justify-content-center gap-3">
        <p className="text-danger mb-0">{error || 'Note not found'}</p>
        <Link to="/admin/users" className="btn btn-primary">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div
      className="fullscreen-pdf-wrapper secure-note-viewer secure-note-watermark no-drag"
      onContextMenu={preventContextMenu}
      onDragStart={preventDrag}
    >
      <div className="fullscreen-pdf-bar">
        <span className="fullscreen-pdf-title text-truncate" title={note.title}>
          {note.title}
          {note.userId?.name && (
            <span className="ms-2 opacity-75 small">({note.userId.name})</span>
          )}
        </span>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <input
              id="admin-note-listed-explore"
              type="checkbox"
              className="form-check-input"
              checked={!!note.listedOnExplore}
              disabled={savingListed}
              onChange={(e) => handleListedOnExploreChange(e.target.checked)}
              aria-label="List on Explore"
            />
            <label className="form-check-label text-nowrap small text-white mb-0" htmlFor="admin-note-listed-explore">
              List on Explore
            </label>
            {savingListed && <span className="small opacity-75">Saving...</span>}
          </div>
          <div className="fullscreen-pdf-zoom" role="group" aria-label="Zoom">
            <button
              type="button"
              className="fullscreen-pdf-zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              title="Zoom out"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="fullscreen-pdf-zoom-value" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="fullscreen-pdf-zoom-btn"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              title="Zoom in"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={handleBack} aria-label="Back to user">
            Back to user
          </button>
        </div>
      </div>
      <div className="fullscreen-pdf-content">
        <ErrorBoundary
          fallback={
            <div className="fullscreen-pdf-loading d-flex flex-column align-items-center justify-content-center gap-3">
              <p className="text-warning mb-0">Failed to load the file viewer.</p>
              <button type="button" className="btn btn-outline-light" onClick={handleBack}>
                Back to user
              </button>
            </div>
          }
        >
          <SecureNoteViewerLazy
            adminNoteId={note._id}
            fullScreen={true}
            mimeType={note.mimeType}
            fileName={note.fileName}
            zoom={zoom}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
