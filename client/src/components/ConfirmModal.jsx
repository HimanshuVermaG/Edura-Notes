import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable confirmation modal for destructive or important actions.
 * Renders via portal into document.body so it always overlays the viewport
 * and is not clipped by card overflow or parent transforms.
 */
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
          <div className="modal-header">
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
