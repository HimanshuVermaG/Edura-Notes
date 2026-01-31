import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import SecureNoteViewerLazy from '../components/SecureNoteViewerLazy';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function FullScreenPdfView() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  useEffect(() => {
    api(`/notes/${id}`)
      .then(setNote)
      .catch(() => setError('Note not found'))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Link to="/home" className="btn btn-primary">
          Back to Home
        </Link>
      </div>
    );
  }

  const preventContextMenu = (e) => e.preventDefault();
  const preventDrag = (e) => e.preventDefault();

  return (
    <div
      className="fullscreen-pdf-wrapper secure-note-viewer secure-note-watermark no-drag"
      onContextMenu={preventContextMenu}
      onDragStart={preventDrag}
    >
      <div className="fullscreen-pdf-bar">
        <span className="fullscreen-pdf-title text-truncate">{note.title}</span>
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
          <Link to="/home" className="btn btn-sm btn-outline-light">
            Close
          </Link>
        </div>
      </div>
      <div className="fullscreen-pdf-content">
        <SecureNoteViewerLazy
          noteId={note._id}
          fullScreen={true}
          mimeType={note.mimeType}
          fileName={note.fileName}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
