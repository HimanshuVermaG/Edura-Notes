import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import SecureNoteViewerLazy from '../components/SecureNoteViewerLazy';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function PublicNoteView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  const backUrl = note?.userId?._id ? `/profile/${note.userId._id}` : '/';
  const handleBack = useCallback(() => navigate(backUrl), [navigate, backUrl]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  useEffect(() => {
    if (!id) {
      setError('Invalid note');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api(`/public/notes/${id}`)
      .then(setNote)
      .catch(() => setError('Note not found or private'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleBack]);

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
        <p className="text-danger mb-0">{error || 'Note not found or private'}</p>
        <Link to="/" className="btn btn-edura px-4">
          Home
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
        <span className="fullscreen-pdf-title text-truncate" title={note.title}>{note.title}</span>
        <div className="d-flex align-items-center gap-2">
          <div className="fullscreen-pdf-zoom" role="group" aria-label="Zoom">
            <button
              type="button"
              className="fullscreen-pdf-zoom-btn"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              title="Zoom out"
              aria-label="Zoom out"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19 13H5v-2h14v2z"/></svg>
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
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
          </div>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={handleBack} aria-label="Back to profile">
            Back to profile
          </button>
        </div>
      </div>
      <div className="fullscreen-pdf-content">
        <SecureNoteViewerLazy
          publicNoteId={id}
          fullScreen={true}
          mimeType={note.mimeType}
          fileName={note.originalName || note.fileName}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
