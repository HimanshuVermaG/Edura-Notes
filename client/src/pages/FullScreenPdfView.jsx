import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import { api } from '../api/client';
import SecureNoteViewerLazy from '../components/SecureNoteViewerLazy';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function FullScreenPdfView() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || '/manage';
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [invertColors, setInvertColors] = useState(false);

  const handleClose = useCallback(() => {
    navigate(from);
  }, [navigate, from]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

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
        <Link to="/manage" className="btn btn-edura px-4">
          Back to My Files
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
            <button
              type="button"
              className="fullscreen-pdf-zoom-btn ms-2"
              onClick={() => setInvertColors(v => !v)}
              title="Toggle Dark Mode"
              aria-label="Toggle Dark Mode"
            >
              {invertColors ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={handleClose} aria-label="Close">
            Close
          </button>
        </div>
      </div>
      <div className="fullscreen-pdf-content">
        <SecureNoteViewerLazy
          noteId={note._id}
          fullScreen={true}
          mimeType={note.mimeType}
          fileName={note.fileName || note.originalName}
          zoom={zoom}
          invertColors={invertColors}
        />
      </div>
    </div>
  );
}
