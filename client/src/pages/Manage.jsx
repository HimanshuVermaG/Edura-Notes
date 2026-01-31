import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api, apiForm } from '../api/client';
import FolderList from '../components/FolderList';
import NoteCard from '../components/NoteCard';
import ViewModeToggle from '../components/ViewModeToggle';
import SortBySelect from '../components/SortBySelect';
import { sortNotes } from '../utils/sortNotes';
import { getFoldersInTreeOrder } from '../utils/folderTree';

export default function Manage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderIds, setSelectedFolderIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dropzoneDragging, setDropzoneDragging] = useState(false);
  const [usedBytes, setUsedBytes] = useState(null);
  const [limitBytes, setLimitBytes] = useState(null);
  const fileInputRef = useRef(null);

  const BYTES_PER_MB = 1024 * 1024;
  const atStorageLimit = usedBytes != null && limitBytes != null && usedBytes >= limitBytes;

  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const validateFile = (file) => {
    if (!file) return 'Please select a file';
    if (file.size > MAX_FILE_SIZE) return 'File must be 20 MB or smaller';
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      return 'Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed';
    }
    return null;
  };

  const notesUrl = useMemo(() => {
    const searchQ = searchQuery.trim();
    const searchPart = searchQ ? `search=${encodeURIComponent(searchQ)}` : '';
    const foldersUrl = searchQ ? `/folders?search=${encodeURIComponent(searchQ)}` : '/folders';
    if (selectedFolderIds.size === 0) {
      const notes = searchPart ? `/notes?${searchPart}` : '/notes';
      return { notes, folders: foldersUrl };
    }
    const ids = Array.from(selectedFolderIds).map((id) => (id === 'uncategorized' ? 'null' : id)).join(',');
    const notes = searchPart ? `/notes?folderIds=${encodeURIComponent(ids)}&${searchPart}` : `/notes?folderIds=${encodeURIComponent(ids)}`;
    return { notes, folders: foldersUrl };
  }, [selectedFolderIds, searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, notesRes, storageRes] = await Promise.all([
        api(notesUrl.folders),
        api(notesUrl.notes),
        api('/notes/storage').catch(() => ({ usedBytes: 0, limitBytes: 50 * 1024 * 1024 })),
      ]);
      setFolders(foldersRes);
      setNotes(notesRes);
      setUsedBytes(storageRes?.usedBytes ?? 0);
      setLimitBytes(storageRes?.limitBytes ?? 50 * 1024 * 1024);
    } catch {
      setFolders([]);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [notesUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    const fileErr = validateFile(uploadFile);
    if (fileErr) {
      setUploadError(fileErr);
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
      if (uploadFolderId) formData.append('folderId', uploadFolderId);
      formData.append('isPublic', String(uploadIsPublic));
      await apiForm('/notes', formData, { method: 'POST' });
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      setUploadFolderId('');
      setUploadIsPublic(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (file) => {
    setUploadError('');
    const err = validateFile(file);
    if (err) setUploadError(err);
    setUploadFile(file || null);
  };

  const handleDropzoneDrop = (e) => {
    e.preventDefault();
    setDropzoneDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDropzoneDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropzoneDragging(true);
  };

  const handleDropzoneDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropzoneDragging(false);
  };

  const handleClear = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadFolderId('');
    setUploadIsPublic(false);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sortedNotes = useMemo(() => sortNotes(notes, folders, sortBy), [notes, folders, sortBy]);

  const notesByFolder = (folderId) => {
    if (folderId === null) return sortedNotes.filter((n) => !n.folderId);
    return sortedNotes.filter((n) => n.folderId === folderId);
  };

  const allNotesShown = selectedFolderIds.size === 0;
  const isList = viewMode === 'list';

  const renderNote = (note, folderName) => (
    <NoteCard
      key={note._id}
      note={note}
      onDeleted={loadData}
      viewMode={viewMode}
      showActions={true}
      folderName={folderName}
    />
  );

  const noteWrapper = (note, folderName) =>
    isList ? (
      <div key={note._id}>{renderNote(note, folderName)}</div>
    ) : (
      <div key={note._id} className="col-md-6 col-lg-4">
        {renderNote(note, folderName)}
      </div>
    );

  const foldersInOrder = useMemo(() => getFoldersInTreeOrder(folders), [folders]);

  const headingLabel = allNotesShown
    ? 'All Notes'
    : selectedFolderIds.size === 1 && selectedFolderIds.has('uncategorized')
      ? 'Uncategorized'
      : selectedFolderIds.size === 1
        ? folders.find((f) => f._id === Array.from(selectedFolderIds)[0])?.name || 'Notes'
        : `${selectedFolderIds.size} categories`;

  return (
    <Layout>
      <div className="app-with-sidebar">
        <aside className="categories-sidebar">
          <FolderList
            folders={folders}
            selectedFolderIds={selectedFolderIds}
            onSelectionChange={setSelectedFolderIds}
            onFoldersChange={loadData}
            readOnly={false}
          />
        </aside>
        <main className="categories-main">
          <h1 className="edura-section-title">Manage Notes &amp; Folders</h1>
          <p className="edura-section-subtitle mb-4">
            Upload, edit, delete, and organize your notes and folders. Drag notes onto categories in the sidebar to move them.
          </p>

          {usedBytes != null && limitBytes != null && (
            <div className="edura-card p-3 mb-4">
              <h3 className="h6 mb-2">Storage</h3>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <span className="small text-muted">
                  {(usedBytes / BYTES_PER_MB).toFixed(1)} MB / {(limitBytes / BYTES_PER_MB).toFixed(1)} MB used
                </span>
                <div className="progress flex-grow-1" style={{ maxWidth: 280, height: 8 }}>
                  <div
                    className={`progress-bar ${atStorageLimit ? 'bg-danger' : ''}`}
                    role="progressbar"
                    style={{ width: `${Math.min(100, (usedBytes / limitBytes) * 100)}%` }}
                    aria-valuenow={usedBytes}
                    aria-valuemin={0}
                    aria-valuemax={limitBytes}
                  />
                </div>
              </div>
              {atStorageLimit && (
                <p className="small text-danger mb-0 mt-2">
                  Storage limit reached. Delete some files or ask an admin to increase your limit.
                </p>
              )}
            </div>
          )}

          <section id="upload-section" className="upload-file-section edura-card p-4">
            <h2 className="upload-file-title">Upload a file</h2>
            <p className="upload-file-subtitle">
              Images (JPEG, PNG, GIF, WebP) and PDFs. Max 20 MB.
            </p>
            <form className="edura-form" onSubmit={handleUploadSubmit}>
              {uploadError && (
                <div className="alert alert-danger py-2 small mb-3" role="alert">
                  {uploadError}
                </div>
              )}
              <div
                className={`upload-file-dropzone ${dropzoneDragging ? 'upload-file-dropzone-dragover' : ''}`}
                onDragOver={handleDropzoneDragOver}
                onDragLeave={handleDropzoneDragLeave}
                onDrop={handleDropzoneDrop}
              >
                <input
                  ref={fileInputRef}
                  id="manage-upload-file"
                  type="file"
                  accept=".pdf,application/pdf,.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  aria-label="Choose file"
                />
                <label htmlFor="manage-upload-file" className="d-block mb-1">
                  <span className="upload-file-dropzone-btn">Choose file</span>
                </label>
                <p className="upload-file-dropzone-text mb-0">or drag and drop here</p>
                {uploadFile && (
                  <p className="small mt-2 mb-0 text-muted">
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>
              <div className="upload-file-meta">
                <div style={{ minWidth: 200, flex: 1 }}>
                  <label htmlFor="manage-upload-title" className="form-label small">Title</label>
                  <input
                    id="manage-upload-title"
                    type="text"
                    className="form-control form-control-sm"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Note title"
                  />
                </div>
                <div style={{ minWidth: 160 }}>
                  <label htmlFor="manage-upload-folder" className="form-label small">Folder</label>
                  <select
                    id="manage-upload-folder"
                    className="form-select form-select-sm"
                    value={uploadFolderId}
                    onChange={(e) => setUploadFolderId(e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {folders.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="upload-file-description">
                <label htmlFor="manage-upload-description" className="form-label small">Description</label>
                <textarea
                  id="manage-upload-description"
                  className="form-control form-control-sm upload-description-input"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional description for this note"
                  rows={3}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="manage-upload-visibility" className="form-label small">Visibility</label>
                <select
                  id="manage-upload-visibility"
                  className="form-select form-select-sm"
                  style={{ maxWidth: 160 }}
                  value={uploadIsPublic ? 'true' : 'false'}
                  onChange={(e) => setUploadIsPublic(e.target.value === 'true')}
                >
                  <option value="false">Private</option>
                  <option value="true">Public</option>
                </select>
                <div className="form-text small">Public notes appear on your public profile and in Explore.</div>
              </div>
              <div className="upload-file-actions">
                <button
                  type="submit"
                  className="btn btn-upload-primary"
                  disabled={submitting || !uploadFile || atStorageLimit}
                >
                  {submitting ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  className="btn btn-upload-clear"
                  onClick={handleClear}
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          <div className="mb-4 search-bar-wrap">
            <label htmlFor="manage-search" className="form-label visually-hidden">Search folders and notes</label>
            <div className="search-bar input-group" style={{ maxWidth: 400 }}>
              <input
                id="manage-search"
                type="search"
                className="form-control edura-form search-bar-input"
                placeholder="Search folders and notes..."
                value={searchInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchInput(v);
                  if (v === '') setSearchQuery('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setSearchQuery(searchInput))}
                aria-label="Search folders and notes"
              />
              <button
                type="button"
                className="btn btn-edura search-bar-btn"
                onClick={() => setSearchQuery(searchInput)}
                aria-label="Search"
              >
                Search
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h2 className="h5 mb-0">{headingLabel}</h2>
            <div className="d-flex align-items-center gap-3">
              <SortBySelect sortBy={sortBy} onSortByChange={setSortBy} />
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {allNotesShown && (
                <div className="row g-3 mb-4">
                  {sortedNotes.filter((n) => !n.folderId).length > 0 && (
                    <div className="col-12">
                      <h6 className="text-muted small text-uppercase mb-2">Uncategorized</h6>
                      {isList ? (
                        <div className="d-flex flex-column gap-2">
                          {sortedNotes.filter((n) => !n.folderId).map((note) => noteWrapper(note, null))}
                        </div>
                      ) : (
                        <div className="row g-3">
                          {sortedNotes.filter((n) => !n.folderId).map((note) => noteWrapper(note, null))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {allNotesShown
                ? foldersInOrder.map((folder) => {
                    const folderNotes = notesByFolder(folder._id);
                    if (folderNotes.length === 0) return null;
                    return (
                      <div key={folder._id} className="mb-4">
                        <h6 className="text-muted small text-uppercase mb-2">{folder.name}</h6>
                        {isList ? (
                          <div className="d-flex flex-column gap-2">
                            {folderNotes.map((note) => noteWrapper(note, folder.name))}
                          </div>
                        ) : (
                          <div className="row g-3">
                            {folderNotes.map((note) => noteWrapper(note, folder.name))}
                          </div>
                        )}
                      </div>
                    );
                  })
                : selectedFolderIds.size > 1
                  ? (() => {
                      const sections = [];
                      if (selectedFolderIds.has('uncategorized')) {
                        const uncat = sortedNotes.filter((n) => !n.folderId);
                        if (uncat.length > 0) sections.push({ key: 'uncategorized', title: 'Uncategorized', notes: uncat });
                      }
                      foldersInOrder.forEach((folder) => {
                        if (!selectedFolderIds.has(folder._id)) return;
                        const folderNotes = sortedNotes.filter((n) => n.folderId === folder._id);
                        if (folderNotes.length > 0) sections.push({ key: folder._id, title: folder.name, notes: folderNotes });
                      });
                      return sections.map(({ key, title, notes: sectionNotes }) => (
                        <div key={key} className="mb-4">
                          <h6 className="text-muted small text-uppercase mb-2">{title}</h6>
                          {isList ? (
                            <div className="d-flex flex-column gap-2">
                              {sectionNotes.map((note) => noteWrapper(note, title))}
                            </div>
                          ) : (
                            <div className="row g-3">
                              {sectionNotes.map((note) => noteWrapper(note, title))}
                            </div>
                          )}
                        </div>
                      ));
                    })()
                  : isList ? (
                    <div className="d-flex flex-column gap-2">
                      {sortedNotes.map((note) => {
                        const folder = folders.find((f) => f._id === note.folderId);
                        return noteWrapper(note, folder?.name ?? null);
                      })}
                    </div>
                  ) : (
                    <div className="row g-3">
                      {sortedNotes.map((note) => {
                        const folder = folders.find((f) => f._id === note.folderId);
                        return noteWrapper(note, folder?.name ?? null);
                      })}
                    </div>
                  )}
              {notes.length === 0 && !loading && (
                <div className="edura-card p-5 text-center text-muted">
                  {searchQuery.trim() ? (
                    <>
                      <p className="mb-2">No folders or notes match &quot;{searchQuery.trim()}&quot;</p>
                      <p className="small mb-0">Try a different search or clear the search bar.</p>
                    </>
                  ) : (
                    <>
                      <p className="mb-2">Your notes and folders will appear here.</p>
                      <p className="small mb-0">Create a folder in the sidebar, or use the upload form to add a PDF or image.</p>
                      <button
                        type="button"
                        className="btn btn-edura mt-3"
                        onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                      >
                        Upload your first note
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </Layout>
  );
}
