import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import SecureNoteViewerLazy from '../components/SecureNoteViewerLazy';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function PublicCommunityFileView() {
  const { id: communityId, fileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  const backUrl = location.state?.from || `/community/${communityId}`;
  const handleBack = useCallback(() => navigate(backUrl), [navigate, backUrl]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  useEffect(() => {
    if (!communityId || !fileId) {
      setError('Invalid link');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api(`/public/communities/${communityId}/files/${fileId}`)
      .then(setFileMeta)
      .catch(() => setError('File not found'))
      .finally(() => setLoading(false));
  }, [communityId, fileId]);

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

  if (error || !fileMeta) {
    return (
      <div className="fullscreen-pdf-loading d-flex flex-column align-items-center justify-content-center gap-3">
        <p className="text-danger mb-0">{error || 'File not found'}</p>
        <Link to={`/community/${communityId}`} className="btn btn-primary">
          Back to community
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
        <span className="fullscreen-pdf-title text-truncate" title={fileMeta.title}>
          {fileMeta.title}
        </span>
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
          <button type="button" className="btn btn-sm btn-outline-light" onClick={handleBack} aria-label="Back to community">
            Back to community
          </button>
        </div>
      </div>
      <div className="fullscreen-pdf-content">
        <SecureNoteViewerLazy
          communityFileId={fileId}
          communityId={communityId}
          fullScreen={true}
          mimeType={fileMeta.mimeType}
          fileName={fileMeta.originalName || fileMeta.fileName}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
