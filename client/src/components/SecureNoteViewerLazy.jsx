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

export default function SecureNoteViewerLazy(props) {
  return (
    <Suspense fallback={<ViewerFallback />}>
      <SecureNoteViewer {...props} />
    </Suspense>
  );
}
