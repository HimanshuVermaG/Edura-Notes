import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Globe, Link as LinkIcon, Star, Award, Medal, Trophy } from 'lucide-react';
import Layout from '../components/Layout';
import { api } from '../api/client';
import { getInitials } from '../utils/avatar';
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
        <div className="edura-card p-5 text-center">
          <p className="text-danger mb-4 fs-5">{error || 'User not found'}</p>
          <Link to="/community" className="btn btn-edura px-4">Back to Community</Link>
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
      {note.communitySpaceId && (
        <div className="mb-2 d-flex flex-wrap gap-1">
          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary small rounded-pill">
            Community: {typeof note.communitySpaceId === 'object' ? note.communitySpaceId.name : note.communitySpaceId}
          </span>
          {note.communityTopic && (
            <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary small rounded-pill">
              {note.communityTopic}
            </span>
          )}
        </div>
      )}
      {note.description?.trim() && (
        <p className="card-text small mb-2 text-muted flex-grow-1" title={note.description}>
          {note.description.length > 80 ? note.description.slice(0, 80) + '…' : note.description}
        </p>
      )}
      <div className="mt-auto pt-3">
        <Link to={`/view/note/${note._id}`} className="btn btn-sm btn-edura w-100 text-center text-decoration-none">
          View File
        </Link>
      </div>
    </>
  );

  const renderNoteCard = (note) => {
    if (isList) {
      return (
        <div key={note._id} className="edura-card p-2 px-3 d-flex align-items-center gap-3 flex-wrap">
          <div className="flex-grow-1 min-w-0 d-flex align-items-center gap-2 flex-wrap">
            <h6 className="card-title mb-0 text-truncate">{note.title}</h6>
            {note.communitySpaceId && (
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary small rounded-pill">
                {typeof note.communitySpaceId === 'object' ? note.communitySpaceId.name : note.communitySpaceId}
              </span>
            )}
            {note.userId?.name && (
              <span className="text-muted small ms-2">Uploaded by {note.userId.name}</span>
            )}
            {note.description?.trim() && (
              <span className="text-muted small text-truncate ms-2" style={{ maxWidth: 240 }} title={note.description}>
                {note.description.length > 60 ? note.description.slice(0, 60) + '…' : note.description}
              </span>
            )}
          </div>
          <Link to={`/view/note/${note._id}`} className="btn btn-sm btn-edura flex-shrink-0 text-decoration-none px-3">
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

  const FOLDER_INDENT_REM = 1.75;

  function renderFolderSection(node, depth = 0) {
    const folder = node.folder;
    const folderNotes = notesByFolder(folder._id);
    const hasChildren = node.children?.length > 0;
    if (folderNotes.length === 0 && !hasChildren) return null;
    const isSubfolder = depth > 0;
    const indentStyle = isSubfolder ? { marginLeft: `${depth * FOLDER_INDENT_REM}rem`, marginTop: '1.25rem' } : undefined;
    const headingClass = 'text-muted small text-uppercase mb-2';
    return (
      <div key={folder._id} className="mb-4" style={indentStyle}>
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
      <div className="edura-card p-0 mb-5 overflow-hidden position-relative border-0 shadow-sm">
        <div className="p-4 p-md-5 text-white" style={{ background: 'var(--edura-gradient)' }}>
          <div className="d-flex flex-column flex-md-row align-items-md-center gap-4 position-relative z-1">
            {user.picture ? (
              <img src={user.picture} alt="" className="rounded-circle shadow" width={80} height={80} style={{ objectFit: 'cover', border: '4px solid rgba(255,255,255,0.2)' }} />
            ) : (
              <span className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold shadow text-primary bg-white" style={{ width: 80, height: 80, fontSize: '2rem' }} aria-hidden>
                {getInitials(user.name)}
              </span>
            )}
            <div>
              <h1 className="fw-bold mb-1 text-white text-break" style={{ fontSize: '2.5rem', fontFamily: 'var(--edura-font-display)', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{user.name}</h1>
              <p className="mb-2 text-white-50 fs-6">Public notes and files</p>
              
              {user.badges && user.badges.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {user.badges.map(b => {
                    let Icon = Star;
                    if (b.icon === 'Award') Icon = Award;
                    if (b.icon === 'Medal') Icon = Medal;
                    if (b.icon === 'Trophy') Icon = Trophy;
                    return (
                      <span key={b.id} className="badge d-flex align-items-center gap-1 border shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: b.color, borderColor: b.color }}>
                        <Icon size={14} fill="currentColor" /> {b.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {user.bio && <p className="mb-3 text-white text-break" style={{ maxWidth: '600px', opacity: 0.9, whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
              
              {user.socialLinks && (user.socialLinks.github || user.socialLinks.linkedin || user.socialLinks.twitter || user.socialLinks.website) && (
                <div className="d-flex align-items-center gap-3">
                  {user.socialLinks.github && (
                    <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-white opacity-75 hover-opacity-100 transition-colors" aria-label="GitHub">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    </a>
                  )}
                  {user.socialLinks.linkedin && (
                    <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-white opacity-75 hover-opacity-100 transition-colors" aria-label="LinkedIn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  )}
                  {user.socialLinks.twitter && (
                    <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-white opacity-75 hover-opacity-100 transition-colors" aria-label="Twitter">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  )}
                  {user.socialLinks.website && (
                    <a href={user.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-white opacity-75 hover-opacity-100 transition-colors">
                      <Globe size={20} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="edura-card p-5 text-center text-muted">
          <p className="mb-2">No public notes yet.</p>
          <Link to="/community" className="btn btn-edura px-4 mt-2">Browse Community</Link>
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
