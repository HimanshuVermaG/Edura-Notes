import React, { useState, useEffect, useCallback } from 'react';
import SecureNoteViewerLazy from '../SecureNoteViewerLazy';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function SecureNoteModal({ isOpen, onClose, note }) {
  const [zoom, setZoom] = useState(1);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);
  
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const preventContextMenu = useCallback((e) => e.preventDefault(), []);
  const preventDrag = useCallback((e) => e.preventDefault(), []);

  if (!isOpen || !note) return null;

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
          <button type="button" className="btn btn-sm btn-outline-light" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
      </div>
      <div className="fullscreen-pdf-content">
        <SecureNoteViewerLazy 
          publicNoteId={note._id || note.id}
          fullScreen={true}
          mimeType={note.mimeType}
          fileName={note.fileName || note.originalName}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
