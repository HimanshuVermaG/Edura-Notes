import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import FolderList from '../components/FolderList';
import NoteCard from '../components/NoteCard';
import ViewModeToggle from '../components/ViewModeToggle';
import SortBySelect from '../components/SortBySelect';
import { sortNotes } from '../utils/sortNotes';
import { getFoldersInTreeOrder } from '../utils/folderTree';

export default function Homepage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderIds, setSelectedFolderIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');

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
      const [foldersRes, notesRes] = await Promise.all([
        api(notesUrl.folders),
        api(notesUrl.notes),
      ]);
      setFolders(foldersRes);
      setNotes(notesRes);
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
      showActions={false}
      folderName={folderName}
      showFileName={false}
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
            readOnly
          />
        </aside>
        <main className="categories-main">
          <h1 className="edura-section-title">Welcome, {user?.name}</h1>
          <p className="edura-section-subtitle mb-4">
            Browse your notes and folders. Use Manage to upload, edit, or organize.
          </p>

          <div className="mb-4 search-bar-wrap">
            <label htmlFor="homepage-search" className="form-label visually-hidden">Search folders and notes</label>
            <div className="search-bar input-group" style={{ maxWidth: 400 }}>
              <input
                id="homepage-search"
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
                      <p className="small mb-0">Go to Manage to create folders and upload notes.</p>
                      <Link to="/manage" className="btn btn-edura mt-3">
                        Go to Manage
                      </Link>
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
