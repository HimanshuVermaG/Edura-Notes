import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiForm } from '../api/client';
import FolderList from '../components/FolderList';
import FolderTreeSelect from '../components/FolderTreeSelect';
import NoteCard from '../components/NoteCard';
import ViewModeToggle from '../components/ViewModeToggle';
import SortBySelect from '../components/SortBySelect';
import { sortNotes } from '../utils/sortNotes';
import { getFoldersInTreeOrder } from '../utils/folderTree';

const NOTES_PAGE_SIZES = [10, 20, 50, 100];

export default function Manage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [notesTotal, setNotesTotal] = useState(0);
  const [notesPage, setNotesPage] = useState(1);
  const [notesLimit, setNotesLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [selectedFolderIds, setSelectedFolderIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewModeState] = useState(() => localStorage.getItem('nh-viewMode') || 'grid');
  const setViewMode = (mode) => { setViewModeState(mode); localStorage.setItem('nh-viewMode', mode); };
  const [sortBy, setSortBy] = useState('name');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'link'
  const [uploadDriveLink, setUploadDriveLink] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dropzoneDragging, setDropzoneDragging] = useState(false);
  const [usedBytes, setUsedBytes] = useState(null);
  const [limitBytes, setLimitBytes] = useState(null);
  const fileInputRef = useRef(null);

  // Bulk operations state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [bulkMoveFolderId, setBulkMoveFolderId] = useState('');

  // Trash state
  const [showTrash, setShowTrash] = useState(false);
  const [trashNotes, setTrashNotes] = useState([]);
  const [loadingTrash, setLoadingTrash] = useState(false);

  const BYTES_PER_MB = 1024 * 1024;
  const atStorageLimit = usedBytes != null && limitBytes != null && usedBytes >= limitBytes;

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
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
    if (file.size > MAX_FILE_SIZE) return 'File must be 10 MB or smaller';
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
    const pageLimit = `page=${notesPage}&limit=${notesLimit}`;
    if (selectedFolderIds.size === 0) {
      const notes = searchPart ? `/notes?${pageLimit}&${searchPart}` : `/notes?${pageLimit}`;
      return { notes, folders: foldersUrl };
    }
    const ids = Array.from(selectedFolderIds).map((id) => (id === 'uncategorized' ? 'null' : id)).join(',');
    const notes = searchPart
      ? `/notes?${pageLimit}&folderIds=${encodeURIComponent(ids)}&${searchPart}`
      : `/notes?${pageLimit}&folderIds=${encodeURIComponent(ids)}`;
    return { notes, folders: foldersUrl };
  }, [selectedFolderIds, searchQuery, notesPage, notesLimit]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, notesRes, storageRes] = await Promise.all([
        api(notesUrl.folders),
        api(notesUrl.notes),
        api('/notes/storage').catch(() => ({ usedBytes: 0, limitBytes: 50 * 1024 * 1024 })),
      ]);
      setFolders(foldersRes);
      const notesList = Array.isArray(notesRes) ? notesRes : notesRes?.notes ?? [];
      const total = Array.isArray(notesRes) ? notesRes.length : notesRes?.total ?? 0;
      setNotes(notesList);
      setNotesTotal(total);
      setUsedBytes(storageRes?.usedBytes ?? 0);
      setLimitBytes(storageRes?.limitBytes ?? 50 * 1024 * 1024);
    } catch {
      setFolders([]);
      setNotes([]);
      setNotesTotal(0);
    } finally {
      setLoading(false);
    }
  }, [notesUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadTrash = useCallback(async () => {
    setLoadingTrash(true);
    try {
      const res = await api('/notes/trash/list');
      setTrashNotes(Array.isArray(res) ? res : []);
    } catch { setTrashNotes([]); }
    finally { setLoadingTrash(false); }
  }, []);

  useEffect(() => { if (showTrash) loadTrash(); }, [showTrash, loadTrash]);

  const handleRestore = async (noteId) => {
    try {
      await api(`/notes/trash/restore/${noteId}`, { method: 'PUT' });
      addToast('Note restored', 'success');
      loadTrash();
      loadData();
    } catch (err) { addToast(err.message || 'Failed to restore', 'error'); }
  };

  const handlePurge = async (noteId) => {
    if (!window.confirm('Permanently delete this file? This cannot be undone.')) return;
    try {
      await api(`/notes/trash/purge/${noteId}`, { method: 'DELETE' });
      addToast('Note permanently deleted', 'success');
      loadTrash();
      loadData();
    } catch (err) { addToast(err.message || 'Failed to purge', 'error'); }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Permanently delete ALL trashed files? This cannot be undone.')) return;
    try {
      await api('/notes/trash/empty', { method: 'POST' });
      addToast('Trash emptied', 'success');
      setTrashNotes([]);
      loadData();
    } catch (err) { addToast(err.message || 'Failed to empty trash', 'error'); }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (uploadMode === 'file') {
      const fileErr = validateFile(uploadFile);
      if (fileErr) {
        setUploadError(fileErr);
        return;
      }
    } else {
      if (!uploadDriveLink.trim() || !uploadDriveLink.match(/[-\w]{25,}/)) {
        setUploadError('Please provide a valid Google Drive link');
        return;
      }
    }
    if (!uploadTitle.trim()) {
      setUploadError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (uploadMode === 'file') {
        formData.append('file', uploadFile);
      } else {
        formData.append('driveLink', uploadDriveLink.trim());
      }
      formData.append('title', uploadTitle.trim());
      if (uploadDescription.trim()) formData.append('description', uploadDescription.trim());
      if (uploadFolderId) formData.append('folderId', uploadFolderId);
      formData.append('isPublic', String(uploadIsPublic));
      await apiForm('/notes', formData, { method: 'POST' });
      addToast('Note uploaded successfully.', 'success');
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      setUploadDriveLink('');
      setUploadMode('file');
      setUploadFolderId('');
      setUploadIsPublic(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotesPage(1);
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
    setUploadDriveLink('');
    setUploadMode('file');
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

  const toggleBulkSelect = (noteId) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId); else next.add(noteId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedNoteIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedNoteIds.size} file(s)? This cannot be undone.`)) return;
    try {
      await api('/notes/bulk-delete', { method: 'POST', body: JSON.stringify({ noteIds: [...selectedNoteIds] }), headers: { 'Content-Type': 'application/json' } });
      addToast(`${selectedNoteIds.size} file(s) deleted`, 'success');
      setSelectedNoteIds(new Set());
      loadData();
    } catch (err) { addToast(err.message || 'Bulk delete failed', 'error'); }
  };

  const handleBulkMove = async () => {
    if (selectedNoteIds.size === 0) return;
    try {
      await api('/notes/bulk-move', { method: 'PUT', body: JSON.stringify({ noteIds: [...selectedNoteIds], folderId: bulkMoveFolderId || null }), headers: { 'Content-Type': 'application/json' } });
      addToast(`${selectedNoteIds.size} file(s) moved`, 'success');
      setSelectedNoteIds(new Set());
      loadData();
    } catch (err) { addToast(err.message || 'Bulk move failed', 'error'); }
  };

  const handleBulkVisibility = async (isPublic) => {
    if (selectedNoteIds.size === 0) return;
    try {
      await api('/notes/bulk-visibility', { method: 'PUT', body: JSON.stringify({ noteIds: [...selectedNoteIds], isPublic }), headers: { 'Content-Type': 'application/json' } });
      addToast(`${selectedNoteIds.size} file(s) set to ${isPublic ? 'Public' : 'Private'}`, 'success');
      setSelectedNoteIds(new Set());
      loadData();
    } catch (err) { addToast(err.message || 'Bulk visibility failed', 'error'); }
  };

  const renderNote = (note, folderName) => (
    <NoteCard
      key={note._id}
      note={note}
      onDeleted={loadData}
      viewMode={viewMode}
      showActions={!bulkMode}
      folderName={folderName}
      bulkMode={bulkMode}
      isSelected={selectedNoteIds.has(note._id)}
      onToggleSelect={toggleBulkSelect}
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

  const notesTotalPages = Math.max(1, Math.ceil(notesTotal / notesLimit));
  const notesStart = notesTotal === 0 ? 0 : (notesPage - 1) * notesLimit + 1;
  const notesEnd = Math.min(notesPage * notesLimit, notesTotal);

  const handleFolderSelectionChange = (ids) => {
    setSelectedFolderIds(ids);
    setNotesPage(1);
  };

  const handleSearchClick = () => {
    setSearchQuery(searchInput);
    setNotesPage(1);
  };

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
            <div className="edura-card edura-storage-card mb-4">
              <div className="edura-storage-card-header">
                <span className="edura-storage-card-icon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  </svg>
                </span>
                <div className="edura-storage-card-heading">
                  <h3 className="edura-storage-card-title">Storage</h3>
                  <span className="edura-storage-card-usage">
                    <strong className="edura-storage-card-used">{(usedBytes / BYTES_PER_MB).toFixed(1)} MB</strong>
                    <span className="edura-storage-card-sep"> of </span>
                    <span className="edura-storage-card-total">{(limitBytes / BYTES_PER_MB).toFixed(1)} MB</span>
                    <span className="edura-storage-card-label"> used</span>
                  </span>
                </div>
              </div>
              <div className="edura-storage-card-bar-wrap">
                <div
                  className={`edura-storage-card-progress ${atStorageLimit ? 'edura-storage-card-progress--limit' : ''}`}
                  role="progressbar"
                  aria-valuenow={usedBytes}
                  aria-valuemin={0}
                  aria-valuemax={limitBytes}
                  aria-label={`Storage used: ${(usedBytes / BYTES_PER_MB).toFixed(1)} of ${(limitBytes / BYTES_PER_MB).toFixed(1)} MB`}
                >
                  <div
                    className="edura-storage-card-progress-fill"
                    style={{ width: `${Math.min(100, (usedBytes / limitBytes) * 100)}%` }}
                  />
                </div>
              </div>
              {atStorageLimit && (
                <p className="edura-storage-card-limit-msg" role="alert">
                  Storage limit reached. Delete some files or ask an admin to increase your limit.
                </p>
              )}
            </div>
          )}

          {atStorageLimit && (
            <div className="alert alert-warning mb-3" role="alert">
              <strong>Storage limit reached.</strong> Delete some files or ask an admin to increase your limit. Upload is disabled until you free space.
            </div>
          )}
          <section id="upload-section" className="upload-file-section edura-card p-4">
            <h2 className="upload-file-title">
              <span className="upload-file-title-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
              </span>
              Upload Note
            </h2>
            <form className="edura-form" onSubmit={handleUploadSubmit}>
              {uploadError && (
                <div className="alert alert-danger py-2 small mb-3" role="alert">
                  {uploadError}
                </div>
              )}
              <div className="upload-file-layout">
                <div className="w-100 mb-3" style={{ gridColumn: '1 / -1' }}>
                  <div className="btn-group" role="group">
                    <input type="radio" className="btn-check" name="uploadMode" id="modeFile" autoComplete="off" checked={uploadMode === 'file'} onChange={() => setUploadMode('file')} />
                    <label className="btn btn-outline-primary btn-sm" htmlFor="modeFile">Upload File</label>
                    <input type="radio" className="btn-check" name="uploadMode" id="modeLink" autoComplete="off" checked={uploadMode === 'link'} onChange={() => setUploadMode('link')} />
                    <label className="btn btn-outline-primary btn-sm" htmlFor="modeLink">Google Drive Link</label>
                  </div>
                </div>

                {uploadMode === 'file' ? (
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
                    <label htmlFor="manage-upload-file" className="upload-file-dropzone-label">
                      <span className="upload-file-dropzone-icon" aria-hidden>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                        </svg>
                      </span>
                      <span className="upload-file-dropzone-text">Click to upload or drag and drop</span>
                      <span className="upload-file-dropzone-hint">PDF, PNG, JPG up to 10MB</span>
                    </label>
                    {uploadFile && (
                      <p className="upload-file-dropzone-selected small mb-0">
                        Selected: <strong>{uploadFile.name}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="upload-file-field" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label htmlFor="manage-upload-link" className="form-label small fw-bold">Google Drive Public Link</label>
                    <input
                      id="manage-upload-link"
                      type="url"
                      className="form-control form-control-sm"
                      value={uploadDriveLink}
                      onChange={(e) => setUploadDriveLink(e.target.value)}
                      placeholder="e.g. https://drive.google.com/file/d/1vN_XYZ.../view"
                    />
                    <small className="text-muted mt-2 d-block">
                      Ensure the link sharing is set to "<strong>Anyone with the link</strong>". The secure viewer will proxy the file automatically.
                    </small>
                  </div>
                )}
                <div className="upload-file-form-column">
                  <div className="upload-file-field">
                    <label htmlFor="manage-upload-title" className="form-label small">Title</label>
                    <input
                      id="manage-upload-title"
                      type="text"
                      className="form-control form-control-sm"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Chapter 4 Summary"
                    />
                  </div>
                  <div className="upload-file-field">
                    <label id="manage-upload-folder-label" className="form-label small">Folder</label>
                    <FolderTreeSelect
                      id="manage-upload-folder"
                      labelId="manage-upload-folder-label"
                      folders={folders}
                      value={uploadFolderId}
                      onChange={setUploadFolderId}
                      className="form-select-sm"
                    />
                  </div>
                  <div className="upload-file-field" role="group" aria-labelledby="manage-upload-visibility-label">
                    <span id="manage-upload-visibility-label" className="form-label small d-block">Visibility</span>
                    <div className="upload-file-visibility-radios">
                      <label className="upload-file-radio-label">
                        <input
                          type="radio"
                          name="manage-upload-visibility"
                          value="false"
                          checked={!uploadIsPublic}
                          onChange={() => setUploadIsPublic(false)}
                          className="form-check-input"
                        />
                        <span>Private</span>
                      </label>
                      <label className="upload-file-radio-label">
                        <input
                          type="radio"
                          name="manage-upload-visibility"
                          value="true"
                          checked={uploadIsPublic}
                          onChange={() => setUploadIsPublic(true)}
                          className="form-check-input"
                        />
                        <span>Public</span>
                      </label>
                    </div>
                  </div>
                  <div className="upload-file-field upload-file-description">
                    <label htmlFor="manage-upload-description" className="form-label small">Description (Optional)</label>
                    <textarea
                      id="manage-upload-description"
                      className="form-control form-control-sm upload-description-input"
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Optional description for this note"
                      rows={3}
                    />
                  </div>
                  <div className="upload-file-actions">
                    <button
                      type="button"
                      className="btn btn-upload-clear"
                      onClick={handleClear}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="btn btn-upload-primary"
                      disabled={submitting || (uploadMode === 'file' ? !uploadFile : !uploadDriveLink) || atStorageLimit}
                    >
                      {submitting ? 'Processing...' : (uploadMode === 'file' ? 'Upload File' : 'Save Link')}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>

          <div className="mb-4 search-bar-wrap">
            <label htmlFor="manage-search" className="form-label visually-hidden">Search folders and notes</label>
            <div className="search-bar input-group" style={{ maxWidth: 400 }}>
              <span className="search-bar-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              </span>
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
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchClick())}
                aria-label="Search folders and notes"
              />
              <button
                type="button"
                className="btn btn-edura search-bar-btn"
                onClick={handleSearchClick}
                aria-label="Search"
              >
                Search
              </button>
            </div>
          </div>

          <div className="edura-toolbar-strip mb-3">
            <h2 className="h6 mb-0">{headingLabel}</h2>
            <div className="d-flex align-items-center gap-3 flex-wrap ms-auto">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="manage-notes-per-page" className="form-label small mb-0 text-nowrap">
                  Per page
                </label>
                <select
                  id="manage-notes-per-page"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={notesLimit}
                  onChange={(e) => {
                    setNotesLimit(Number(e.target.value));
                    setNotesPage(1);
                  }}
                  aria-label="Notes per page"
                >
                  {NOTES_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <SortBySelect sortBy={sortBy} onSortByChange={setSortBy} />
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              <button
                type="button"
                className={`btn btn-sm ${bulkMode ? 'btn-edura' : 'btn-outline-secondary'}`}
                onClick={() => { setBulkMode(m => !m); setSelectedNoteIds(new Set()); }}
              >
                {bulkMode ? '✕ Cancel' : '☐ Select'}
              </button>
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
              {notesTotal > 0 && (
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                  <p className="small text-muted mb-0">
                    Showing {notesStart}–{notesEnd} of {notesTotal} note{notesTotal !== 1 ? 's' : ''}
                  </p>
                  <nav aria-label="Notes pagination" className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={notesPage <= 1}
                      onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="px-2 small">
                      Page {notesPage} of {notesTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={notesPage >= notesTotalPages}
                      onClick={() => setNotesPage((p) => Math.min(notesTotalPages, p + 1))}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}

          {/* Trash Section */}
          <div className="mt-5 pt-4 border-top">
            <button
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
              onClick={() => setShowTrash(t => !t)}
            >
              🗑️ Trash {showTrash ? '▲' : '▼'}
            </button>
            {showTrash && (
              <div className="mt-3">
                {loadingTrash ? (
                  <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-muted"></div></div>
                ) : trashNotes.length === 0 ? (
                  <p className="text-muted small">Trash is empty.</p>
                ) : (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="small text-muted">{trashNotes.length} item(s) in trash</span>
                      <button className="btn btn-sm btn-outline-danger" onClick={handleEmptyTrash}>Empty Trash</button>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      {trashNotes.map(note => (
                        <div key={note._id} className="edura-card p-2 px-3 d-flex align-items-center gap-3" style={{ opacity: 0.7 }}>
                          <div className="flex-grow-1 min-w-0">
                            <h6 className="mb-0 small text-truncate" style={{ color: 'var(--edura-text)' }}>{note.title}</h6>
                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>Deleted {new Date(note.deletedAt).toLocaleDateString()}</span>
                          </div>
                          <button className="btn btn-sm btn-outline-success px-3" onClick={() => handleRestore(note._id)}>Restore</button>
                          <button className="btn btn-sm btn-outline-danger px-3" onClick={() => handlePurge(note._id)}>Delete</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Bulk Action Bar */}
      {bulkMode && selectedNoteIds.size > 0 && (
        <div className="position-fixed bottom-0 start-50 translate-middle-x mb-4 px-4 py-3 rounded-pill shadow-lg d-flex align-items-center gap-3 flex-wrap" style={{ background: 'var(--edura-card-bg)', border: '1px solid var(--edura-border)', zIndex: 1050, minWidth: '320px', backdropFilter: 'blur(12px)' }}>
          <span className="fw-bold small" style={{ color: 'var(--edura-text)' }}>{selectedNoteIds.size} selected</span>
          <div className="vr" style={{ height: '24px' }} />
          <button className="btn btn-sm btn-outline-danger rounded-pill px-3" onClick={handleBulkDelete}>🗑 Delete</button>
          <div className="d-flex align-items-center gap-1">
            <FolderTreeSelect
              id="bulk-move-folder"
              labelId="bulk-move-label"
              folders={folders}
              value={bulkMoveFolderId}
              onChange={setBulkMoveFolderId}
              className="form-select-sm"
            />
            <button className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={handleBulkMove}>📁 Move</button>
          </div>
          <div className="vr" style={{ height: '24px' }} />
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => handleBulkVisibility(true)}>🌐 Public</button>
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={() => handleBulkVisibility(false)}>🔒 Private</button>
        </div>
      )}
    </Layout>
  );
}
