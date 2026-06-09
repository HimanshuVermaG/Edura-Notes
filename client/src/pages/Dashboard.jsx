import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import FolderList from '../components/FolderList';
import NoteCard from '../components/NoteCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const searchQ = searchQuery.trim();
      const searchPart = searchQ ? `search=${encodeURIComponent(searchQ)}` : '';
      
      let folderIdsRaw = '';
      if (selectedFolderIds.size > 0) {
        folderIdsRaw = Array.from(selectedFolderIds).join(',');
      }
      
      const notesBase = folderIdsRaw ? `/notes?folderIds=${folderIdsRaw}` : '/notes';
      const notesUrl = searchPart ? (notesBase.includes('?') ? `${notesBase}&${searchPart}` : `${notesBase}?${searchPart}`) : notesBase;
      const foldersUrl = searchQ ? `/folders?search=${encodeURIComponent(searchQ)}` : '/folders';
      const [foldersRes, notesRes] = await Promise.all([
        api(foldersUrl),
        api(notesUrl),
      ]);
      setFolders(foldersRes);
      // Backend returns { notes, total } for list route now
      const notesList = Array.isArray(notesRes) ? notesRes : notesRes?.notes ?? [];
      setNotes(notesList);
    } catch {
      setFolders([]);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderIds, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  const notesByFolder = (folderId) => {
    if (folderId === null) return notes.filter((n) => !n.folderId);
    return notes.filter((n) => n.folderId === folderId);
  };

  const allNotesShown = selectedFolderIds.size === 0;

  return (
    <Layout>
      <h1 className="edura-section-title">Welcome, {user?.name}</h1>
      <p className="edura-section-subtitle mb-4">Your notes (PDF or image) and folders appear below. Create folders by subject or college section, then upload notes inside them.</p>

      <div className="mb-4 search-bar-wrap">
        <label htmlFor="dashboard-search" className="form-label visually-hidden">Search folders and notes</label>
        <div className="search-bar input-group" style={{ maxWidth: 400 }}>
          <input
            id="dashboard-search"
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

      <div className="app-with-sidebar">
        <aside className="categories-sidebar">
          <FolderList
            folders={folders}
            selectedFolderIds={selectedFolderIds}
            onSelectionChange={setSelectedFolderIds}
            onFoldersChange={loadData}
            readOnly={true}
          />
        </aside>
        
        <main className="categories-main">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h5 mb-0">
              {allNotesShown
                ? 'All Notes'
                : selectedFolderIds.size === 1 && selectedFolderIds.has('uncategorized')
                  ? 'Uncategorized'
                  : selectedFolderIds.size === 1
                    ? folders.find((f) => f._id === Array.from(selectedFolderIds)[0])?.name || 'Folder'
                    : `${selectedFolderIds.size} categories`}
            </h2>
            <Link to="/manage" className="btn btn-edura btn-sm">
              Manage &amp; Upload
            </Link>
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
              {notes.filter((n) => !n.folderId).length > 0 && (
                <div className="col-12">
                  <h6 className="text-muted small text-uppercase mb-2">Uncategorized</h6>
                  <div className="row g-3">
                    {notes.filter((n) => !n.folderId).map((note) => (
                      <div key={note._id} className="col-md-6 col-lg-4">
                        <NoteCard note={note} onDeleted={loadData} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            {allNotesShown
              ? folders.map((folder) => {
                  const folderNotes = notesByFolder(folder._id);
                  if (folderNotes.length === 0) return null;
                  return (
                    <div key={folder._id} className="mb-4">
                      <h6 className="text-muted small text-uppercase mb-2">{folder.name}</h6>
                      <div className="row g-3">
                        {folderNotes.map((note) => (
                          <div key={note._id} className="col-md-6 col-lg-4">
                            <NoteCard note={note} onDeleted={loadData} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              : selectedFolderIds.size > 1
                ? (() => {
                    const sections = [];
                    if (selectedFolderIds.has('uncategorized')) {
                      const uncat = notes.filter((n) => !n.folderId);
                      if (uncat.length > 0) sections.push({ key: 'uncategorized', title: 'Uncategorized', notes: uncat });
                    }
                    folders.forEach((folder) => {
                      if (!selectedFolderIds.has(folder._id)) return;
                      const folderNotes = notes.filter((n) => n.folderId === folder._id);
                      if (folderNotes.length > 0) sections.push({ key: folder._id, title: folder.name, notes: folderNotes });
                    });
                    return sections.map(({ key, title, notes: sectionNotes }) => (
                      <div key={key} className="mb-4">
                        <h6 className="text-muted small text-uppercase mb-2">{title}</h6>
                        <div className="row g-3">
                          {sectionNotes.map((note) => (
                            <div key={note._id} className="col-md-6 col-lg-4">
                              <NoteCard note={note} onDeleted={loadData} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()
                : (
                  <div className="row g-3">
                    {notes.map((note) => (
                      <div key={note._id} className="col-md-6 col-lg-4">
                        <NoteCard note={note} onDeleted={loadData} />
                      </div>
                    ))}
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
                  <p className="small mb-0">Upload a PDF or image from the Manage page.</p>
                  <Link to="/manage" className="btn btn-edura mt-3">
                    Upload your first note
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
