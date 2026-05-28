import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Moon, Sun } from 'lucide-react';
import SecureNoteViewerLazy from '../SecureNoteViewerLazy';
import { api } from '../../api/client';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function SecureNoteModal({ isOpen, onClose, note, currentUser }) {
  const [zoom, setZoom] = useState(1);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [invertColors, setInvertColors] = useState(false);

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

  const fetchComments = useCallback(async () => {
    if (!note) return;
    setLoadingComments(true);
    try {
      const res = await api(`/community-spaces/notes/${note._id || note.id}/comments`);
      setComments(Array.isArray(res) ? res : []);
    } catch (err) { console.error('Failed to load comments:', err); }
    finally { setLoadingComments(false); }
  }, [note]);

  useEffect(() => {
    if (showComments && isOpen) fetchComments();
  }, [showComments, isOpen, fetchComments]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !note) return;
    try {
      const res = await api(`/community-spaces/notes/${note._id || note.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: newComment }),
        headers: { 'Content-Type': 'application/json' }
      });
      setComments(prev => [...prev, res]);
      setNewComment('');
    } catch (err) { alert('Failed to post comment'); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api(`/community-spaces/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) { alert('Failed to delete comment'); }
  };

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

          <button type="button" className="btn btn-sm btn-outline-light" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
      </div>
      <div className="fullscreen-pdf-content d-flex" style={{ height: 'calc(100vh - var(--fullscreen-pdf-bar-height))', overflow: 'hidden' }}>
        <div className="flex-grow-1 h-100 position-relative d-flex flex-column">
          <SecureNoteViewerLazy 
            publicNoteId={note._id || note.id}
            fullScreen={true}
            mimeType={note.mimeType}
            fileName={note.fileName || note.originalName}
            zoom={zoom}
            invertColors={invertColors}
          />
        </div>


      </div>
    </div>
  );
}
