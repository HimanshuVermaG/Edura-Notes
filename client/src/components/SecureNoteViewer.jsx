import { useRef, useCallback, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { apiGetBlob } from '../api/client';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker (must be in same module as Document/Page)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function inferMimeType(fileName) {
  if (!fileName) return 'application/pdf';
  const ext = fileName.toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/pdf';
}

export default function SecureNoteViewer({ noteId, publicNoteId, adminNoteId, pdfBlobUrl, fullScreen: fullScreenProp = false, mimeType: mimeTypeProp, fileName, zoom: zoomProp = 1 }) {
  const mimeType = mimeTypeProp || (fileName ? inferMimeType(fileName) : 'application/pdf');
  const isImage = mimeType && mimeType.startsWith('image/');
  const containerRef = useRef(null);
  const [url, setUrl] = useState(pdfBlobUrl || null);
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(800);
  const zoom = typeof zoomProp === 'number' && zoomProp > 0 ? zoomProp : 1;
  const fileId = adminNoteId || publicNoteId || noteId;
  const [loading, setLoading] = useState(!!fileId && !pdfBlobUrl);
  const [error, setError] = useState(null);
  const createdUrlRef = useRef(null);

  useEffect(() => {
    if (pdfBlobUrl) {
      setUrl(pdfBlobUrl);
      setLoading(false);
      return;
    }
    if (!fileId) {
      setLoading(false);
      return;
    }
    const fileUrl = adminNoteId
      ? `/admin/notes/${adminNoteId}/file`
      : publicNoteId
        ? `/public/notes/${publicNoteId}/file`
        : `/notes/${noteId}/file`;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetBlob(fileUrl)
      .then((blob) => {
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        createdUrlRef.current = u;
        setUrl(u);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load file');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
    };
  }, [noteId, publicNoteId, adminNoteId, pdfBlobUrl]);

  useEffect(() => {
    return () => {
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setPageWidth(Math.min(w, 900));
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [url]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setError(err?.message || 'Failed to load file');
  }, []);

  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  const preventDrag = useCallback((e) => {
    e.preventDefault();
  }, []);

  if (loading) {
    return (
      <div className="secure-note-viewer p-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="secure-note-viewer p-4 text-danger">
        {error}
      </div>
    );
  }

  if (!url) {
    return (
      <div className="secure-note-viewer p-4 text-muted">
        No file to display.
      </div>
    );
  }

  const fullScreen = !!fullScreenProp;

  if (isImage) {
    return (
      <div
        ref={containerRef}
        className={`secure-note-viewer secure-note-watermark no-drag ${fullScreen ? 'secure-note-viewer-fullscreen' : ''}`}
        onContextMenu={preventContextMenu}
        onDragStart={preventDrag}
        style={fullScreen ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { minHeight: 480 }}
      >
        <div
          className="secure-note-pdf-container"
          style={
            fullScreen
              ? { flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }
              : { maxHeight: '70vh', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }
          }
        >
          <img
            src={url}
            alt="Note"
            className="secure-note-image"
            style={{
              maxWidth: '100%',
              height: 'auto',
              display: 'block',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
            draggable={false}
          />
        </div>
      </div>
    );
  }

  /* Top-align so first page isn't clipped; center horizontally only */
  const pdfContainerStyle = fullScreen
    ? { flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }
    : { maxHeight: '70vh', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' };

  return (
    <div
      ref={containerRef}
      className={`secure-note-viewer secure-note-watermark no-drag ${fullScreen ? 'secure-note-viewer-fullscreen' : ''}`}
      onContextMenu={preventContextMenu}
      onDragStart={preventDrag}
      style={fullScreen ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { minHeight: 480 }}
    >
      <div className="secure-note-pdf-container" style={pdfContainerStyle}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="text-center py-4">
              <div className="spinner-border text-primary spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          }
        >
          {numPages != null &&
            Array.from(new Array(numPages), (_, i) => (
              <Page
                key={`page-${i + 1}`}
                pageNumber={i + 1}
                width={pageWidth * zoom}
                renderTextLayer={false}
                renderAnnotationLayer={true}
                className="secure-note-pdf-page"
              />
            ))}
        </Document>
      </div>
    </div>
  );
}
