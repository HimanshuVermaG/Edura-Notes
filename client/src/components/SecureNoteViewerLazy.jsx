import { lazy, Suspense } from 'react';

const SecureNoteViewer = lazy(() => import('./SecureNoteViewer'));

function ViewerFallback() {
  return (
    <div className="secure-note-viewer p-4 text-center" style={{ minHeight: 200 }}>
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
    <Suspense fallback={<ViewerFallback />}>
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
