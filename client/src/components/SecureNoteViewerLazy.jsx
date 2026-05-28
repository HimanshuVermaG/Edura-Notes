import { lazy, Suspense } from 'react';

const SecureNoteViewer = lazy(() => import('./SecureNoteViewer'));

function ViewerFallback({ fullScreen }) {
  return (
    <div className={`secure-note-viewer p-4 text-center d-flex align-items-center justify-content-center ${fullScreen ? 'secure-note-viewer-fullscreen' : ''}`} style={fullScreen ? { flex: 1, minHeight: 0 } : { minHeight: 480 }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading viewer...</span>
      </div>
    </div>
  );
}

export default function SecureNoteViewerLazy({
  noteId,
  publicNoteId,
  adminNoteId,
  pdfBlobUrl,
  fullScreen,
  mimeType,
  fileName,
  zoom,
  invertColors
}) {
  return (
    <Suspense fallback={<ViewerFallback fullScreen={fullScreen} />}>
      <SecureNoteViewer 
        noteId={noteId}
        publicNoteId={publicNoteId}
        adminNoteId={adminNoteId}
        pdfBlobUrl={pdfBlobUrl}
        fullScreen={fullScreen}
        mimeType={mimeType}
        fileName={fileName}
        zoom={zoom}
        invertColors={invertColors}
      />
    </Suspense>
  );
}
