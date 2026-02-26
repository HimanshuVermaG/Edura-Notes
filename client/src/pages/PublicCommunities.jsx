import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';

const COMMUNITY_PAGE_SIZES = [8, 12, 20, 50];
const CATEGORY_OPTIONS = ['All', 'Engineering', 'Sciences', 'Humanities', 'Arts', 'Business'];

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export default function PublicCommunities() {
  const [communities, setCommunities] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const fetchId = useRef(0);

  const fetchCommunities = useCallback(() => {
    const id = ++fetchId.current;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    if (activeTag && activeTag !== 'All') params.set('tag', activeTag);
    api(`/public/communities?${params.toString()}`)
      .then((data) => {
        if (id !== fetchId.current) return;
        setCommunities(data.communities || []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        if (id !== fetchId.current) return;
        setError(err.message || 'Failed to load communities');
        setCommunities([]);
        setTotal(0);
      })
      .finally(() => {
        if (id !== fetchId.current) return;
        setLoading(false);
      });
  }, [page, limit, appliedSearch, activeTag]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setAppliedSearch(searchInput.trim());
    setPage(1);
  };

  const handleTagClick = (tag) => {
    setActiveTag(tag);
    setPage(1);
  };

  return (
    <Layout>
      <div className="community-discovery-wrap">
        {/* Breadcrumb */}
        <nav className="community-breadcrumb" aria-label="Breadcrumb">
          <Link to="/explore" className="community-breadcrumb-link">
            Home
          </Link>
          <span className="community-breadcrumb-sep" aria-hidden>
            /
          </span>
          <span className="community-breadcrumb-current">Community Discovery</span>
        </nav>

        {/* Hero */}
        <section className="community-hero" aria-labelledby="community-hero-heading">
          <h1 id="community-hero-heading" className="community-hero-title">
            Find your academic community
          </h1>
          <p className="community-hero-sub">
            Browse communities created by admins and explore shared file repositories.
          </p>
          <form
            className="community-search-form"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <span className="community-search-icon" aria-hidden>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              className="community-search-input"
              placeholder="Search subjects, universities, or community names…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search communities"
              autoComplete="off"
            />
            <button type="submit" className="community-search-btn">
              Search
            </button>
          </form>
        </section>

        {/* Category pills */}
        <div className="community-pills">
          {CATEGORY_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`community-pill ${activeTag === tag ? 'community-pill-active' : ''}`}
              onClick={() => handleTagClick(tag)}
              aria-pressed={activeTag === tag}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Section header + grid */}
        <section className="community-section">
          <div className="explore-section-header community-section-header">
            <h2 className="explore-section-title-v2">Communities</h2>
            <div className="d-flex align-items-center gap-2">
              <label
                htmlFor="community-per-page"
                className="form-label small mb-0 text-nowrap"
                style={{ color: 'var(--edura-text-muted)' }}
              >
                Show:
              </label>
              <select
                id="community-per-page"
                className="explore-mini-select"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Communities per page"
              >
                {COMMUNITY_PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="row g-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="col-6 col-md-4 col-lg-3">
                  <div className="community-card">
                    <div className="community-card-cover edura-skeleton" style={{ height: 112 }} />
                    <div className="community-card-body">
                      <div className="edura-skeleton edura-skeleton-text" style={{ width: '80%' }} />
                      <div className="edura-skeleton edura-skeleton-text-sm mt-2" style={{ width: '60%' }} />
                      <div className="community-card-stats mt-3">
                        <span className="edura-skeleton edura-skeleton-text-sm" style={{ width: 60 }} />
                        <span className="edura-skeleton edura-skeleton-text-sm" style={{ width: 60 }} />
                      </div>
                      <div className="edura-skeleton mt-3" style={{ height: 36, borderRadius: 8 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : communities.length === 0 ? (
            <div className="community-empty">
              <div className="community-empty-icon" aria-hidden>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="mb-2">No communities yet.</p>
              {appliedSearch.trim() && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  style={{ borderRadius: '9999px' }}
                  onClick={() => {
                    setSearchInput('');
                    setAppliedSearch('');
                    setPage(1);
                  }}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="row g-4">
                {communities.map((c) => (
                  <div key={c._id} className="col-6 col-md-4 col-lg-3">
                    <div className="community-card h-100 d-flex flex-column">
                      <div className="community-card-cover">
                        {c.coverUrl ? (
                          <img
                            src={c.coverUrl}
                            alt=""
                            className="community-card-cover-img"
                          />
                        ) : (
                          <div className="community-card-cover-placeholder" aria-hidden />
                        )}
                      </div>
                      <div className="community-card-body d-flex flex-column flex-grow-1">
                        <h3 className="community-card-title">{c.name}</h3>
                        <p className="community-card-sub">
                          {c.tags?.length
                            ? c.tags[0]
                            : c.createdBy?.name
                              ? c.createdBy.name
                              : (c.description || '').slice(0, 40)}
                          {(c.description && c.description.length > 40) || (c.tags?.length && !c.createdBy?.name) ? '…' : ''}
                        </p>
                        <div className="community-card-stats">
                          <span className="community-stat">
                            <span className="community-stat-icon" aria-hidden>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <line x1="10" y1="9" x2="8" y2="9" />
                              </svg>
                            </span>
                            {formatCount(c.fileCount ?? 0)} resources
                          </span>
                        </div>
                        <div className="community-card-actions mt-auto pt-3">
                          <Link
                            to={`/community/${c._id}`}
                            className="community-card-btn"
                          >
                            Enter community
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {total > limit && (
                <div className="community-pagination d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4">
                  <p className="small mb-0" style={{ color: 'var(--edura-text-muted)' }}>
                    Showing {start}–{end} of {total}
                  </p>
                  <div className="d-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
