import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function Explore() {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(() => {
    const q = searchInput.trim();
    setSearchQuery(q);
    setSearched(true);
    setLoadingNotes(true);
    setLoadingUsers(true);

    const notesParams = new URLSearchParams();
    if (q) notesParams.set('search', q);
    if (currentUser?._id) notesParams.set('excludeUserId', currentUser._id);
    const notesQuery = notesParams.toString();
    const notesUrl = notesQuery ? `/public/explore/notes?${notesQuery}` : '/public/explore/notes';

    const usersParams = new URLSearchParams();
    if (q) usersParams.set('search', q);
    const usersQuery = usersParams.toString();
    const usersUrl = usersQuery ? `/public/explore/users?${usersQuery}` : '/public/explore/users';

    api(notesUrl)
      .then((data) => setNotes(data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoadingNotes(false));

    api(usersUrl)
      .then((data) => setUsers(data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [searchInput, currentUser?._id]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    runSearch();
  };

  return (
    <Layout>
      <div className="edura-card p-4 mb-4">
        <h1 className="edura-section-title mb-2">Explore</h1>
        <p className="edura-section-subtitle mb-0">Search public files and user profiles.</p>
      </div>

      <div className="mb-4 search-bar-wrap">
        <label htmlFor="explore-search" className="form-label visually-hidden">Search public files and profiles</label>
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
          <button
            type="submit"
            className="btn btn-edura search-bar-btn"
            aria-label="Search"
          >
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
          <section className="mb-4">
            <h2 className="h5 mb-3">Public files</h2>
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
            )}
          </section>

          <section>
            <h2 className="h5 mb-3">Profiles</h2>
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
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
