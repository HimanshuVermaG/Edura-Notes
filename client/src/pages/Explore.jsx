import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getInitials } from '../utils/avatar';

const EXPLORE_PAGE_SIZES = [4, 8, 12, 20, 50, 100];

function relativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  if (sec < 2592000) return Math.floor(sec / 86400) + 'd ago';
  if (sec < 31536000) return Math.floor(sec / 2592000) + 'mo ago';
  return Math.floor(sec / 31536000) + 'y ago';
}

function isPdf(mimeType, originalName) {
  if (mimeType && mimeType.toLowerCase().includes('pdf')) return true;
  const ext = (originalName || '').toLowerCase().split('.').pop();
  return ext === 'pdf';
}

export default function Explore() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(4);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [notes, setNotes] = useState([]);
  const [notesTotal, setNotesTotal] = useState(0);
  const [notesPage, setNotesPage] = useState(1);
  const [notesLimit, setNotesLimit] = useState(4);
  const [notesSortBy, setNotesSortBy] = useState('time');
  const [loadingNotes, setLoadingNotes] = useState(false);

  const usersFetchId = useRef(0);
  const notesFetchId = useRef(0);

  const fetchUsers = useCallback(() => {
    const id = ++usersFetchId.current;
    setLoadingUsers(true);
    const params = new URLSearchParams();
    params.set('page', String(usersPage));
    params.set('limit', String(usersLimit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    api(`/public/explore/users?${params.toString()}`)
      .then((data) => {
        if (id !== usersFetchId.current) return;
        setUsers(data.users || []);
        setUsersTotal(data.total ?? 0);
      })
      .catch(() => {
        if (id !== usersFetchId.current) return;
        setUsers([]);
        setUsersTotal(0);
      })
      .finally(() => {
        if (id !== usersFetchId.current) return;
        setLoadingUsers(false);
      });
  }, [usersPage, usersLimit, appliedSearch]);

  const fetchNotes = useCallback(() => {
    const id = ++notesFetchId.current;
    setLoadingNotes(true);
    const params = new URLSearchParams();
    params.set('page', String(notesPage));
    params.set('limit', String(notesLimit));
    params.set('sortBy', notesSortBy);
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    if (currentUser?._id) params.set('excludeUserId', currentUser._id);
    api(`/public/explore/notes?${params.toString()}`)
      .then((data) => {
        if (id !== notesFetchId.current) return;
        setNotes(data.notes || []);
        setNotesTotal(data.total ?? 0);
      })
      .catch(() => {
        if (id !== notesFetchId.current) return;
        setNotes([]);
        setNotesTotal(0);
      })
      .finally(() => {
        if (id !== notesFetchId.current) return;
        setLoadingNotes(false);
      });
  }, [notesPage, notesLimit, notesSortBy, appliedSearch, currentUser?._id]);

  useEffect(() => {
    if (searchFilter === 'all' || searchFilter === 'profiles') fetchUsers();
  }, [searchFilter, fetchUsers]);

  useEffect(() => {
    if (searchFilter === 'all' || searchFilter === 'notes') fetchNotes();
  }, [searchFilter, fetchNotes]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setAppliedSearch(searchInput.trim());
    setUsersPage(1);
    setNotesPage(1);
  };

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));
  const notesTotalPages = Math.max(1, Math.ceil(notesTotal / notesLimit));

  return (
    <Layout>
      <section className="explore-hero-wrap explore-hero explore-hero-animated text-center mb-5">
        <div className="explore-hero-inner">
          <h1 className="explore-hero-title">
            Secure document management <br className="d-none d-sm-block" /> for <span className="explore-hero-highlight explore-hero-highlight-animated">modern learning</span>
          </h1>
          <p className="explore-hero-subtitle">
            Edura Notes is the secure platform for students and professionals to store, share, and discover knowledge. Organize your academic life today.
          </p>
          <div className="explore-scroll-hint" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            Scroll to explore
          </div>
        </div>
      </section>

      <section className="explore-public-notes mb-4">
        <h2 className="explore-section-title text-center">Explore Public Notes</h2>
        <p className="explore-section-desc text-center">
          Discover study materials, lecture notes, and resources shared by the Edura community.
        </p>
        <div className="explore-search-wrap">
          <label htmlFor="explore-search" className="form-label visually-hidden">
            Search for notes, topics, or profiles
          </label>
          <form className="explore-search-bar" onSubmit={handleSearchSubmit}>
            <span className="explore-search-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              id="explore-search"
              type="search"
              className="explore-search-input"
              placeholder="Search notes, topics, or profiles..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search for notes, topics, or profiles"
              autoComplete="off"
            />
            <div className="explore-search-actions">
              <select
                className="explore-search-filter"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="all">All</option>
                <option value="profiles">Profiles</option>
                <option value="notes">Notes</option>
              </select>
              <button type="submit" className="explore-search-btn" aria-label="Search">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {(searchFilter === 'all' || searchFilter === 'profiles') && (
        <section className="explore-contributors mb-5">
          <div className="explore-section-header">
            <div>
              <h2 className="explore-section-title d-flex align-items-center gap-2">
                <span className="explore-section-icon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                  </svg>
                </span>
                Top Contributors
              </h2>
              <p className="explore-section-desc mb-0">Active students and professionals sharing quality content.</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="explore-users-per-page" className="form-label small mb-0 text-nowrap">Show:</label>
              <select
                id="explore-users-per-page"
                className="form-select form-select-sm explore-select-sm"
                value={usersLimit}
                onChange={(e) => { setUsersLimit(Number(e.target.value)); setUsersPage(1); }}
                aria-label="Contributors per page"
              >
                {EXPLORE_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          {loadingUsers ? (
            <div className="row g-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="col-6 col-md-4 col-lg-3">
                  <div className="edura-card p-3 h-100 text-center">
                    <div className="edura-skeleton edura-skeleton-circle mx-auto mb-3" style={{ width: 80, height: 80 }} />
                    <div className="edura-skeleton edura-skeleton-text mx-auto" style={{ width: '60%' }} />
                    <div className="edura-skeleton edura-skeleton-text-sm mx-auto mt-2" style={{ width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="edura-card p-4 text-center text-muted">
              <p className="mb-2">No profiles match your search.</p>
              {appliedSearch.trim() && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => { setSearchInput(''); setAppliedSearch(''); setUsersPage(1); setNotesPage(1); }}
                >
                  Clear search
                </button>
              )}
              <p className="small mt-2 mb-0">Try a different filter or search term.</p>
            </div>
          ) : (
            <>
              <div className="explore-cards-row row g-3">
                {users.map((u) => (
                  <div key={u._id} className="col-6 col-md-4 col-lg-3">
                    <div className="edura-card explore-contributor-card p-3 h-100 text-center">
                      <div className="explore-avatar-wrap">
                        <div className="explore-avatar-gradient-ring d-inline-block">
                          {u.picture ? (
                            <img src={u.picture} alt="" className="explore-avatar-img rounded-circle" width={74} height={74} />
                          ) : (
                            <span className="explore-avatar-initials explore-avatar-initials-lg rounded-circle">{getInitials(u.name)}</span>
                          )}
                        </div>
                      </div>
                      <h3 className="explore-card-name mb-1">{u.name}</h3>
                      <Link to={`/profile/${u._id}`} className="btn btn-sm explore-btn-view-profile mt-2 w-100" style={{ borderRadius: '9999px' }}>
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {usersTotal > 0 && usersTotalPages > 1 && (
                <nav className="explore-pagination mt-5" aria-label="Contributors pagination">
                  <button type="button" className="explore-pagination-prev" disabled={usersPage <= 1} onClick={() => setUsersPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                  </button>
                  <div className="explore-pagination-numbers">
                    {Array.from({ length: usersTotalPages }, (_, i) => i + 1).map((n) => (
                      <button key={n} type="button" className={`explore-pagination-num ${usersPage === n ? 'explore-pagination-num-active' : ''}`} onClick={() => setUsersPage(n)} aria-label={`Page ${n}`}>{n}</button>
                    ))}
                  </div>
                  <button type="button" className="explore-pagination-next" disabled={usersPage >= usersTotalPages} onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))} aria-label="Next page">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
      {searchFilter === 'all' && <hr className="explore-section-divider" />}
      {(searchFilter === 'all' || searchFilter === 'notes') && (
        <section className="explore-files">
          <div className="explore-section-header">
            <div>
              <h2 className="explore-section-title d-flex align-items-center gap-2">
                <span className="explore-section-icon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                </span>
                Public Files
              </h2>
              <p className="explore-section-desc mb-0">Recent uploads from the community.</p>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <label htmlFor="explore-notes-sort" className="form-label small mb-0 text-nowrap">Sort by:</label>
              <select
                id="explore-notes-sort"
                className="form-select form-select-sm explore-select-sm"
                value={notesSortBy}
                onChange={(e) => { setNotesSortBy(e.target.value); setNotesPage(1); }}
                aria-label="Sort order"
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="time">Newest first</option>
              </select>
              <label htmlFor="explore-notes-per-page" className="form-label small mb-0 text-nowrap">Show:</label>
              <select
                id="explore-notes-per-page"
                className="form-select form-select-sm explore-select-sm"
                value={notesLimit}
                onChange={(e) => { setNotesLimit(Number(e.target.value)); setNotesPage(1); }}
                aria-label="Files per page"
              >
                {EXPLORE_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          {loadingNotes ? (
            <div className="row g-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="col-6 col-md-4 col-lg-3">
                  <div className="edura-card overflow-hidden" style={{ padding: 0 }}>
                    <div className="edura-skeleton" style={{ height: 128 }} />
                    <div className="p-3">
                      <div className="edura-skeleton edura-skeleton-text" />
                      <div className="edura-skeleton edura-skeleton-text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="edura-card p-4 text-center text-muted">
              <p className="mb-2">No public files match your search.</p>
              {appliedSearch.trim() && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => { setSearchInput(''); setAppliedSearch(''); setUsersPage(1); setNotesPage(1); }}
                >
                  Clear search
                </button>
              )}
              <p className="small mt-2 mb-0">Try a different filter or search term.</p>
            </div>
          ) : (
            <>
              <div className="explore-cards-row row g-3">
                {notes.map((note) => (
                  <div key={note._id} className="col-6 col-md-4 col-lg-3">
                    <div className={`edura-card explore-file-card h-100 d-flex flex-column overflow-hidden`} style={{ padding: 0 }}>
                      <div className={`explore-file-card-icon-strip ${isPdf(note.mimeType, note.originalName) ? 'explore-file-strip-pdf' : 'explore-file-strip-image'}`}>
                        {isPdf(note.mimeType, note.originalName) ? (
                          <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="explore-file-strip-icon" style={{ color: '#2563eb', opacity: 0.7 }}>
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3 11H8v-2h3v2zm0-4H8v-2h3v2zm0-4H8V7h3v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
                          </svg>
                        ) : (
                          <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="explore-file-strip-icon" style={{ color: '#059669', opacity: 0.7 }}>
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                          </svg>
                        )}
                      </div>
                      <div className="explore-file-card-body p-3 flex-grow-1 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="explore-badge-public">
                            <span className="explore-badge-public-dot" aria-hidden />
                            PUBLIC
                          </span>
                          <span className="explore-file-time small text-muted">{relativeTime(note.updatedAt || note.createdAt)}</span>
                        </div>
                        <h3 className="explore-file-title mb-1">{note.title}</h3>
                        {note.description?.trim() && (
                          <p className="explore-file-desc small text-muted mb-3 flex-grow-1" title={note.description}>
                            {note.description.length > 80 ? note.description.slice(0, 80) + '…' : note.description}
                          </p>
                        )}
                        <div className="explore-file-card-footer mt-auto pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2">
                          <div className="d-flex align-items-center gap-2 min-w-0">
                            {note.userId?.picture ? (
                              <img src={note.userId.picture} alt="" className="explore-avatar-img rounded-circle flex-shrink-0" width={24} height={24} />
                            ) : (
                              <span className="explore-avatar-initials explore-avatar-initials-sm rounded-circle flex-shrink-0">{getInitials(note.userId?.name)}</span>
                            )}
                            <span className="small text-muted text-truncate explore-file-author-name">{note.userId?.name || 'Unknown'}</span>
                          </div>
                          <Link to={`/view/note/${note._id}`} className="explore-file-view-link small d-inline-flex align-items-center gap-1 flex-shrink-0">
                            View <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {notesTotal > 0 && notesTotalPages > 1 && (
                <nav className="explore-pagination mt-5 mb-4" aria-label="Files pagination">
                  <button type="button" className="explore-pagination-prev" disabled={notesPage <= 1} onClick={() => setNotesPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                  </button>
                  <div className="explore-pagination-numbers">
                    {Array.from({ length: Math.min(notesTotalPages, 10) }, (_, i) => i + 1).map((n) => (
                      <button key={n} type="button" className={`explore-pagination-num ${notesPage === n ? 'explore-pagination-num-active' : ''}`} onClick={() => setNotesPage(n)} aria-label={`Page ${n}`}>{n}</button>
                    ))}
                  </div>
                  <button type="button" className="explore-pagination-next" disabled={notesPage >= notesTotalPages} onClick={() => setNotesPage((p) => Math.min(notesTotalPages, p + 1))} aria-label="Next page">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      )}
    </Layout>
  );
}
