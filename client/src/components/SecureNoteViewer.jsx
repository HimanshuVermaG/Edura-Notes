import { useRef, useCallback, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { api, apiGetBlob, apiGetBlobWithProgress } from '../api/client';
import { useAuth } from '../context/AuthContext';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker served from public/ so it loads from same origin (avoids dynamic import/CDN failures)
const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
pdfjs.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;

function inferMimeType(fileName) {
  if (!fileName) return 'application/pdf';
  const ext = fileName.toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/pdf';
}

function LazyPage({ pageNumber, width, zoom = 1, onActive }) {
  const [isRendered, setIsRendered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Observer 1: Lazy loading (triggers early, unobserves after rendering)
    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRendered(true);
          loadObserver.disconnect();
        }
      },
      { rootMargin: '150% 0px' }
    );
    loadObserver.observe(el);

    // Observer 2: Active page tracking (triggers when near the center of the viewport)
    const activeObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onActive(pageNumber);
        }
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );
    activeObserver.observe(el);

    return () => {
      loadObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [pageNumber, onActive]);

  const estimatedHeight = width * 1.414;

  return (
    <div 
      ref={ref} 
      className="lazy-page-wrapper position-relative" 
      style={{ minHeight: isRendered ? 'auto' : estimatedHeight, width, marginBottom: 16 }}
    >
      {isRendered ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={true}
          className="secure-note-pdf-page"
        />
      ) : (
        <div className="lazy-page-placeholder" style={{ width: '100%', height: estimatedHeight }}>
          <div className="spinner-border spinner-border-sm text-primary" role="status" />
        </div>
      )}
    </div>
  );
}

export default function SecureNoteViewer({ noteId, publicNoteId, adminNoteId, pdfBlobUrl, fullScreen: fullScreenProp = false, mimeType: mimeTypeProp, fileName, zoom: zoomProp = 1, invertColors = false }) {
  const mimeType = mimeTypeProp || (fileName ? inferMimeType(fileName) : 'application/pdf');
  const isImage = mimeType && mimeType.startsWith('image/');
  const containerRef = useRef(null);
  const [url, setUrl] = useState(pdfBlobUrl || null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(800);
  const zoom = typeof zoomProp === 'number' && zoomProp > 0 ? zoomProp : 1;
  const fileId = adminNoteId || publicNoteId || noteId;
  const [loading, setLoading] = useState(!!fileId && !pdfBlobUrl);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const createdUrlRef = useRef(null);
  
  const { isAuthenticated } = useAuth();

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
    setDownloadProgress(0);
    setError(null);
    apiGetBlobWithProgress(fileUrl, (percent) => {
      if (!cancelled) setDownloadProgress(percent);
    })
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

  const handlePageActive = useCallback((pageNumber) => {
    setCurrentPage(pageNumber);
  }, []);

  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
  }, []);

  const preventDrag = useCallback((e) => {
    e.preventDefault();
  }, []);

  const fullScreen = !!fullScreenProp;

  if (loading) {
    return (
      <div className={`secure-note-viewer p-4 text-center d-flex flex-column align-items-center justify-content-center ${fullScreen ? 'secure-note-viewer-fullscreen' : ''}`} style={fullScreen ? { flex: 1, minHeight: 0, background: '#323639' } : { minHeight: 480, background: '#323639' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="mt-3 text-white fw-medium">
          {downloadProgress < 0 
            ? `Downloading... ${(Math.abs(downloadProgress) / 1024 / 1024).toFixed(1)} MB`
            : downloadProgress > 0 && downloadProgress < 100 
              ? `Downloading... ${Math.round(downloadProgress)}%` 
              : 'Loading...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`secure-note-viewer p-4 text-danger d-flex align-items-center justify-content-center ${fullScreen ? 'secure-note-viewer-fullscreen' : ''}`} style={fullScreen ? { flex: 1, minHeight: 0 } : { minHeight: 480 }}>
        {error}
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`secure-note-viewer p-4 text-muted d-flex align-items-center justify-content-center ${fullScreen ? 'secure-note-viewer-fullscreen' : ''}`} style={fullScreen ? { flex: 1, minHeight: 0 } : { minHeight: 480 }}>
        No file to display.
      </div>
    );
  }

  if (isImage) {
    return (
      <div
        ref={containerRef}
        className={`secure-note-viewer secure-note-watermark no-drag ${fullScreen ? 'secure-note-viewer-fullscreen' : ''} ${invertColors ? 'dark-mode-pdf' : ''}`}
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
      className={`secure-note-viewer secure-note-watermark no-drag ${fullScreen ? 'secure-note-viewer-fullscreen' : ''} ${invertColors ? 'dark-mode-pdf' : ''}`}
      onContextMenu={preventContextMenu}
      onDragStart={preventDrag}
      style={fullScreen ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' } : { minHeight: 480, position: 'relative' }}
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
              <LazyPage
                key={`page-${i + 1}`}
                pageNumber={i + 1}
                width={pageWidth * zoom}
                zoom={zoom}
                onActive={handlePageActive}
              />
            ))}
        </Document>
      </div>
      {numPages != null && numPages > 1 && (
        <div className="secure-note-page-indicator">
          Page {currentPage} of {numPages}
        </div>
      )}
    </div>
  );
}
