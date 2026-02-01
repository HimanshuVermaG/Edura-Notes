import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Landing() {
  const { isAuthenticated, loading, setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const buttonRef = useRef(null);
  const initDoneRef = useRef(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searched, setSearched] = useState(false);

  const fromRef = useRef(from);
  const setTokenRef = useRef(setToken);
  const navigateRef = useRef(navigate);
  fromRef.current = from;
  setTokenRef.current = setToken;
  navigateRef.current = navigate;

  if (loading) {
    return (
      <Layout>
        <div className="d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const handleCredential = (response) => {
    if (!response?.credential) return;
    setError('');
    setSubmitting(true);
    api('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential }),
    })
      .then((data) => {
        setTokenRef.current(data.token, data.user);
        navigateRef.current(fromRef.current, { replace: true });
      })
      .catch((err) => setError(err.message || 'Sign in failed'))
      .finally(() => setSubmitting(false));
  };

  const callbackRef = useRef(handleCredential);
  callbackRef.current = handleCredential;

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#explore' || hash === '#sign-in') {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current || initDoneRef.current) return;
    const init = () => {
      if (!window.google?.accounts?.id || initDoneRef.current) return;
      initDoneRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => callbackRef.current(response),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        size: 'large',
        text: 'signin_with',
        width: 280,
      });
    };
    if (window.google?.accounts?.id) {
      init();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          init();
        }
      }, 100);
      return () => clearInterval(t);
    }
  }, []);

  const runSearch = useCallback((query) => {
    const q = typeof query === 'string' ? query : searchInput.trim();
    setSearchQuery(q);
    setSearched(true);
    setLoadingNotes(true);
    setLoadingUsers(true);

    const notesParams = new URLSearchParams();
    if (q) notesParams.set('search', q);
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
  }, [searchInput]);

  useEffect(() => {
    runSearch('');
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    runSearch(searchInput.trim());
  };

  return (
    <Layout>
      <section id="sign-in" className="landing-hero py-5 mb-5">
        <div className="edura-card p-4 p-md-5 text-center mx-auto" style={{ maxWidth: 560 }}>
          <h1 className="edura-section-title mb-2">Your notes, organized and secure</h1>
          <p className="edura-section-subtitle mb-4">
            Store and share with folders. View anywhere — no copy, no print.
          </p>
          {error && (
            <div className="alert alert-danger py-2 small mb-3" role="alert">
              {error}
            </div>
          )}
          {!GOOGLE_CLIENT_ID ? (
            <p className="text-muted small">
              Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in the client environment.
            </p>
          ) : (
            <div className="d-flex flex-column align-items-center">
              <div ref={buttonRef} />
              {submitting && (
                <p className="small text-muted mt-2 mb-0">Signing in...</p>
              )}
            </div>
          )}
          <p className="text-muted small mt-4 mb-0">
            Or scroll down to explore public notes and profiles.
          </p>
        </div>
      </section>

      <section id="explore" className="landing-explore">
        <div className="edura-card p-4 mb-4">
          <h2 className="edura-section-title mb-2">Explore</h2>
          <p className="edura-section-subtitle mb-0">Search public files and user profiles.</p>
        </div>

        <div className="mb-4 search-bar-wrap">
          <label htmlFor="explore-search" className="form-label visually-hidden">
            Search public files and profiles
          </label>
          <form
            className="search-bar input-group"
            style={{ maxWidth: 400 }}
            onSubmit={handleSearchSubmit}
          >
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
            <p className="mb-0">
              Enter a search term and click Search to find public files and user profiles.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-4">
              <h3 className="h5 mb-3">Public files</h3>
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
                          <p
                            className="card-text small mb-2 text-muted"
                            title={note.description}
                          >
                            {note.description.length > 80
                              ? note.description.slice(0, 80) + '…'
                              : note.description}
                          </p>
                        )}
                        <div className="d-flex gap-2 flex-wrap">
                          <Link
                            to={`/view/note/${note._id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            View
                          </Link>
                          {note.userId?._id && (
                            <Link
                              to={`/profile/${note.userId._id}`}
                              className="btn btn-sm btn-outline-secondary"
                            >
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
              <h3 className="h5 mb-3">Profiles</h3>
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
                        <Link
                          to={`/profile/${u._id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
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
      </section>
    </Layout>
  );
}
