import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const EXPLORE_PAGE_SIZES = [10, 20, 50, 100];

export default function Explore() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [searched, setSearched] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(10);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [notes, setNotes] = useState([]);
  const [notesTotal, setNotesTotal] = useState(0);
  const [notesPage, setNotesPage] = useState(1);
  const [notesLimit, setNotesLimit] = useState(10);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoadingUsers(true);
    const params = new URLSearchParams();
    params.set('page', String(usersPage));
    params.set('limit', String(usersLimit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    api(`/public/explore/users?${params.toString()}`)
      .then((data) => {
        setUsers(data.users || []);
        setUsersTotal(data.total ?? 0);
      })
      .catch(() => {
        setUsers([]);
        setUsersTotal(0);
      })
      .finally(() => setLoadingUsers(false));
  }, [usersPage, usersLimit, appliedSearch]);

  const fetchNotes = useCallback(() => {
    setLoadingNotes(true);
    const params = new URLSearchParams();
    params.set('page', String(notesPage));
    params.set('limit', String(notesLimit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    if (currentUser?._id) params.set('excludeUserId', currentUser._id);
    api(`/public/explore/notes?${params.toString()}`)
      .then((data) => {
        setNotes(data.notes || []);
        setNotesTotal(data.total ?? 0);
      })
      .catch(() => {
        setNotes([]);
        setNotesTotal(0);
      })
      .finally(() => setLoadingNotes(false));
  }, [notesPage, notesLimit, appliedSearch, currentUser?._id]);

  useEffect(() => {
    setSearched(true);
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setAppliedSearch(searchInput.trim());
    setUsersPage(1);
    setNotesPage(1);
  };

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));
  const usersStart = usersTotal === 0 ? 0 : (usersPage - 1) * usersLimit + 1;
  const usersEnd = Math.min(usersPage * usersLimit, usersTotal);

  const notesTotalPages = Math.max(1, Math.ceil(notesTotal / notesLimit));
  const notesStart = notesTotal === 0 ? 0 : (notesPage - 1) * notesLimit + 1;
  const notesEnd = Math.min(notesPage * notesLimit, notesTotal);

  return (
    <Layout>
      <div className="edura-card p-4 mb-4">
        <h1 className="edura-section-title mb-2">Explore</h1>
        <p className="edura-section-subtitle mb-0">Search public files and user profiles.</p>
      </div>

      <div className="mb-4 search-bar-wrap">
        <label htmlFor="explore-search" className="form-label visually-hidden">
          Search public files and profiles
        </label>
        <form className="search-bar input-group" style={{ maxWidth: 400 }} onSubmit={handleSearchSubmit}>
          <input
            id="explore-search"
            type="search"
            className="form-control edura-form search-bar-input"
            placeholder="Search public files and profiles..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search public files and profiles"
          />
          <button type="submit" className="btn btn-edura search-bar-btn" aria-label="Search">
            Search
          </button>
        </form>
      </div>

      {!searched ? (
        <div className="edura-card p-5 text-center text-muted">
          <p className="mb-0">Enter a search term and click Search to find public files and user profiles.</p>
        </div>
      ) : (
        <>
          <section className="mb-5">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <h2 className="h5 mb-0">Profiles</h2>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="explore-users-per-page" className="form-label small mb-0 text-nowrap">
                  Per page
                </label>
                <select
                  id="explore-users-per-page"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={usersLimit}
                  onChange={(e) => {
                    setUsersLimit(Number(e.target.value));
                    setUsersPage(1);
                  }}
                  aria-label="Profiles per page"
                >
                  {EXPLORE_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {loadingUsers ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="edura-card p-4 text-center text-muted">
                <p className="mb-0">No profiles match your search.</p>
              </div>
            ) : (
              <>
                <div className="row g-3">
                  {users.map((u) => (
                    <div key={u._id} className="col-md-6 col-lg-4">
                      <div className="edura-card p-3 h-100 d-flex align-items-center justify-content-between">
                        <span className="fw-medium">{u.name}</span>
                        <Link to={`/profile/${u._id}`} className="btn btn-sm btn-outline-primary">
                          View profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {usersTotal > 0 && (
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                    <p className="small text-muted mb-0">
                      Showing {usersStart}–{usersEnd} of {usersTotal} profile{usersTotal !== 1 ? 's' : ''}
                    </p>
                    <nav aria-label="Profiles pagination" className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        disabled={usersPage <= 1}
                        onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        Previous
                      </button>
                      <span className="px-2 small">
                        Page {usersPage} of {usersTotalPages}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        disabled={usersPage >= usersTotalPages}
                        onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <h2 className="h5 mb-0">Public files</h2>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="explore-notes-per-page" className="form-label small mb-0 text-nowrap">
                  Per page
                </label>
                <select
                  id="explore-notes-per-page"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={notesLimit}
                  onChange={(e) => {
                    setNotesLimit(Number(e.target.value));
                    setNotesPage(1);
                  }}
                  aria-label="Files per page"
                >
                  {EXPLORE_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {loadingNotes ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : notes.length === 0 ? (
              <div className="edura-card p-4 text-center text-muted">
                <p className="mb-0">No public files match your search.</p>
              </div>
            ) : (
              <>
                <div className="row g-3">
                  {notes.map((note) => (
                    <div key={note._id} className="col-md-6 col-lg-4">
                      <div className="edura-card p-3 h-100">
                        <h6 className="card-title mb-1 text-truncate">{note.title}</h6>
                        {note.userId?.name && (
                          <p className="card-text small mb-2 text-muted">
                            Uploaded by{' '}
                            <Link to={`/profile/${note.userId._id}`}>{note.userId.name}</Link>
                          </p>
                        )}
                        {note.description?.trim() && (
                          <p className="card-text small mb-2 text-muted" title={note.description}>
                            {note.description.length > 80 ? note.description.slice(0, 80) + '…' : note.description}
                          </p>
                        )}
                        <div className="d-flex gap-2 flex-wrap">
                          <Link to={`/view/note/${note._id}`} className="btn btn-sm btn-outline-primary">
                            View
                          </Link>
                          {note.userId?._id && (
                            <Link to={`/profile/${note.userId._id}`} className="btn btn-sm btn-outline-secondary">
                              Profile
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {notesTotal > 0 && (
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
                    <p className="small text-muted mb-0">
                      Showing {notesStart}–{notesEnd} of {notesTotal} file{notesTotal !== 1 ? 's' : ''}
                    </p>
                    <nav aria-label="Files pagination" className="d-flex align-items-center gap-1">
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
          </section>
        </>
      )}
    </Layout>
  );
}
