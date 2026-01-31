import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { buildFolderTree } from '../utils/folderTree';
import { sortNotes } from '../utils/sortNotes';
import SortBySelect from '../components/SortBySelect';
import ViewModeToggle from '../components/ViewModeToggle';

export default function PublicProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (!userId) {
      setError('Invalid profile');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api(`/public/profile/${userId}`)
      .then((data) => {
        setUser(data.user);
        setFolders(data.folders || []);
        setNotes(data.notes || []);
      })
      .catch((err) => {
        setError(err.message || 'User not found');
        setUser(null);
        setFolders([]);
        setNotes([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const getFolderId = (note) => {
    const fid = note.folderId;
    return fid && (typeof fid === 'object' ? fid._id : fid);
  };

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return notes;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    return notes.filter((n) => {
      const title = (n.title || '').toString();
      const desc = (n.description || '').toString();
      const orig = (n.originalName || '').toString();
      return regex.test(title) || regex.test(desc) || regex.test(orig);
    });
  }, [notes, searchQuery]);

  const sortedNotes = useMemo(() => sortNotes(filteredNotes, folders, sortBy), [filteredNotes, folders, sortBy]);

  const notesByFolder = (folderId) => {
    if (folderId === null) return sortedNotes.filter((n) => !getFolderId(n));
    return sortedNotes.filter((n) => getFolderId(n) === folderId);
  };

  const isList = viewMode === 'list';

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout>
        <div className="edura-card p-4">
          <p className="text-danger mb-2">{error || 'User not found'}</p>
          <Link to="/" className="btn btn-outline-primary">Home</Link>
        </div>
      </Layout>
    );
  }

  const noteCardContent = (note) => (
    <>
      <h6 className="card-title mb-1 text-truncate">{note.title}</h6>
      {note.userId?.name && (
        <p className="card-text small mb-2 text-muted">Uploaded by {note.userId.name}</p>
      )}
      {note.description?.trim() && (
        <p className="card-text small mb-2 text-muted" title={note.description}>
          {note.description.length > 80 ? note.description.slice(0, 80) + '…' : note.description}
        </p>
      )}
      <Link to={`/view/note/${note._id}`} className="btn btn-sm btn-outline-primary">
        View
      </Link>
    </>
  );

  const renderNoteCard = (note) => {
    if (isList) {
      return (
        <div key={note._id} className="edura-card p-2 px-3 d-flex align-items-center gap-3 flex-wrap">
          <div className="flex-grow-1 min-w-0">
            <h6 className="card-title mb-0 text-truncate">{note.title}</h6>
            {note.userId?.name && (
              <span className="text-muted small">Uploaded by {note.userId.name}</span>
            )}
            {note.description?.trim() && (
              <span className="text-muted small text-truncate ms-2" style={{ maxWidth: 240 }} title={note.description}>
                {note.description.length > 60 ? note.description.slice(0, 60) + '…' : note.description}
              </span>
            )}
          </div>
          <Link to={`/view/note/${note._id}`} className="btn btn-sm btn-outline-primary flex-shrink-0">
            View
          </Link>
        </div>
      );
    }
    return (
      <div key={note._id} className="col-md-6 col-lg-4">
        <div className="edura-card p-3 h-100">
          {noteCardContent(note)}
        </div>
      </div>
    );
  };

  function renderFolderSection(node, depth = 0) {
    const folder = node.folder;
    const folderNotes = notesByFolder(folder._id);
    const hasChildren = node.children?.length > 0;
    if (folderNotes.length === 0 && !hasChildren) return null;
    const isSubfolder = depth > 0;
    const headingClass = isSubfolder ? 'text-muted small text-uppercase mb-2 ms-3' : 'text-muted small text-uppercase mb-2';
    return (
      <div key={folder._id} className={isSubfolder ? 'mb-4 ms-3' : 'mb-4'}>
        <h6 className={headingClass}>{folder.name}</h6>
        {folderNotes.length > 0 && (
          isList ? (
            <div className="d-flex flex-column gap-2">
              {folderNotes.map((note) => renderNoteCard(note))}
            </div>
          ) : (
            <div className="row g-3">
              {folderNotes.map((note) => renderNoteCard(note))}
            </div>
          )
        )}
        {hasChildren && node.children.map((child) => renderFolderSection(child, depth + 1))}
      </div>
    );
  }

  return (
    <Layout>
      <div className="edura-card p-4 mb-4">
        <h1 className="edura-section-title mb-2">{user.name}&apos;s profile</h1>
        <p className="edura-section-subtitle mb-0">Public notes and files</p>
      </div>

      {notes.length === 0 ? (
        <div className="edura-card p-5 text-center text-muted">
          <p className="mb-0">No public notes yet.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 search-bar-wrap">
            <label htmlFor="public-profile-search" className="form-label visually-hidden">Search notes</label>
            <div className="search-bar input-group" style={{ maxWidth: 400 }}>
              <input
                id="public-profile-search"
                type="search"
                className="form-control edura-form search-bar-input"
                placeholder="Search notes..."
                value={searchInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchInput(v);
                  if (v === '') setSearchQuery('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setSearchQuery(searchInput))}
                aria-label="Search notes"
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
            <h2 className="h5 mb-0">All Notes</h2>
            <div className="d-flex align-items-center gap-3">
              <SortBySelect sortBy={sortBy} onSortByChange={setSortBy} />
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>
          {filteredNotes.length === 0 ? (
            <div className="edura-card p-4 text-center text-muted">
              <p className="mb-0">{searchQuery.trim() ? `No notes match "${searchQuery.trim()}".` : 'No public notes yet.'}</p>
            </div>
          ) : (
            <>
              {notesByFolder(null).length > 0 && (
                <div className="mb-4">
                  <h6 className="text-muted small text-uppercase mb-2">Uncategorized</h6>
                  {isList ? (
                    <div className="d-flex flex-column gap-2">
                      {notesByFolder(null).map((note) => renderNoteCard(note))}
                    </div>
                  ) : (
                    <div className="row g-3">
                      {notesByFolder(null).map((note) => renderNoteCard(note))}
                    </div>
                  )}
                </div>
              )}
              {folderTree.map((node) => renderFolderSection(node))}
            </>
          )}
        </>
      )}
    </Layout>
  );
}
