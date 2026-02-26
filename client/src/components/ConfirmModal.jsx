import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable confirmation modal for destructive or important actions.
 * Renders via portal into document.body so it always overlays the viewport
 * and is not clipped by card overflow or parent transforms.
 */
function AlertTriangleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function ConfirmModal({
  show,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  useEffect(() => {
    if (show && closeRef.current) {
      closeRef.current.focus();
    }
  }, [show]);

  if (!show) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isDanger = variant === 'danger';

  const modal = (
    <div
      className="modal show d-block modal-backdrop-custom"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content edura-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Colored top accent bar */}
          <span className={`edura-modal-top-bar ${isDanger ? 'edura-modal-top-bar-danger' : 'edura-modal-top-bar-info'}`} />
          <div className="modal-header">
            {/* Icon */}
            <span className={`edura-modal-icon ${isDanger ? 'edura-modal-icon-danger' : 'edura-modal-icon-info'}`} aria-hidden>
              {isDanger ? <AlertTriangleIcon /> : <InfoIcon />}
            </span>
            <h5 id="confirm-modal-title" className="modal-title">
              {title}
            </h5>
            <button
              ref={closeRef}
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
          <div className="modal-body">{body}</div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn btn-${variant}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? '…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
