import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import CommunityCard from '../components/CommunityCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getInitials } from '../utils/avatar';

const EXPLORE_PAGE_SIZES = [4, 8, 12, 20, 50, 100];

// ─── Stat chip for hero (modernised) ───────────────────────────────
const HeroStatIconDoc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const HeroStatIconPeople = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const HeroStatIconFree = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
  </svg>
);

function HeroStat({ icon, value, label }) {
  return (
    <div className="explore-hero-stat">
      <span className="explore-hero-stat-icon">{icon}</span>
      <div className="explore-hero-stat-content">
        <span className="explore-hero-stat-value">{value}</span>
        <span className="explore-hero-stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function Explore() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');

  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(4);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [communities, setCommunities] = useState([]);
  const [communitiesTotal, setCommunitiesTotal] = useState(0);
  const [communitiesPage, setCommunitiesPage] = useState(1);
  const [communitiesLimit, setCommunitiesLimit] = useState(4);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  const usersFetchId = useRef(0);
  const communitiesFetchId = useRef(0);

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

  const fetchCommunities = useCallback(() => {
    const id = ++communitiesFetchId.current;
    setLoadingCommunities(true);
    const params = new URLSearchParams();
    params.set('page', String(communitiesPage));
    params.set('limit', String(communitiesLimit));
    if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
    api(`/public/communities?${params.toString()}`)
      .then((data) => {
        if (id !== communitiesFetchId.current) return;
        setCommunities(data.communities || []);
        setCommunitiesTotal(data.total ?? 0);
      })
      .catch(() => {
        if (id !== communitiesFetchId.current) return;
        setCommunities([]);
        setCommunitiesTotal(0);
      })
      .finally(() => {
        if (id !== communitiesFetchId.current) return;
        setLoadingCommunities(false);
      });
  }, [communitiesPage, communitiesLimit, appliedSearch]);

  useEffect(() => {
    const filterFromUrl = searchParams.get('filter');
    const filterFromState = location.state?.filter;
    if (filterFromUrl === 'communities' || filterFromState === 'communities') {
      setSearchFilter('communities');
    }
  }, [searchParams, location.state]);

  useEffect(() => {
    if (searchFilter === 'all' || searchFilter === 'profiles') fetchUsers();
  }, [searchFilter, fetchUsers]);

  useEffect(() => {
    if (searchFilter === 'all' || searchFilter === 'communities') fetchCommunities();
  }, [searchFilter, fetchCommunities]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setAppliedSearch(searchInput.trim());
    setUsersPage(1);
    setCommunitiesPage(1);
  };

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / usersLimit));
  const communitiesTotalPages = Math.max(1, Math.ceil(communitiesTotal / communitiesLimit));

  return (
    <Layout>
      {/* ═══════════════════════════════════════════════
          HERO — Full-bleed deep dark gradient
      ═══════════════════════════════════════════════ */}
      <section className="explore-hero-v2" aria-labelledby="explore-hero-heading">
        {/* Background layers */}
        <div className="explore-hero-bg" aria-hidden>
          <div className="explore-hero-orb explore-hero-orb-1" />
          <div className="explore-hero-orb explore-hero-orb-2" />
          <div className="explore-hero-orb explore-hero-orb-3" />
          <div className="explore-hero-grid" />
        </div>

        <div className="explore-hero-v2-inner">
          {/* Eyebrow tag */}
          <div className="explore-hero-eyebrow">
            <span className="explore-hero-eyebrow-dot" aria-hidden />
            Open knowledge platform
          </div>

          <h1 id="explore-hero-heading" className="explore-hero-v2-title">
            Discover notes for<br />
            <span className="explore-hero-gradient-text">modern learners</span>
          </h1>
          <p className="explore-hero-v2-sub">
            Browse thousands of study materials, lecture notes, and documents
            shared freely by students and professionals worldwide.
          </p>

          {/* Inline search inside hero */}
          <form className="explore-hero-search" onSubmit={handleSearchSubmit} role="search">
            <span className="explore-hero-search-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              id="explore-search"
              type="search"
              className="explore-hero-search-input"
              placeholder="Search people or communities…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search public profiles and communities"
              autoComplete="off"
            />
            <div className="explore-hero-search-right">
              <select
                className="explore-hero-filter-select"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="all">All</option>
                <option value="profiles">People</option>
                <option value="communities">Communities</option>
              </select>
              <button type="submit" className="explore-hero-search-btn">
                Search
              </button>
            </div>
          </form>

          {/* Stats row — modernised pill chips */}
          <div className="explore-hero-stats">
            <HeroStat icon={<HeroStatIconDoc />} value="1000+" label="Public notes" />
            <HeroStat icon={<HeroStatIconPeople />} value="500+" label="Contributors" />
            <HeroStat icon={<HeroStatIconFree />} value="Free" label="Always" />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="explore-hero-scroll-cue" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </section>

      {/* Page body */}
      <div className="explore-body">
        {/* ─── Top Contributors ─────────────────────────── */}
        {(searchFilter === 'all' || searchFilter === 'profiles') && (
          <section className="explore-contributors mb-5">
            <div className="explore-section-header">
              <div>
                <h2 className="explore-section-title-v2 d-flex align-items-center gap-2">
                  <span className="explore-section-icon-pill" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                  </span>
                  Top Contributors
                </h2>
                <p className="explore-section-desc mb-0">Active students and professionals sharing quality content.</p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="explore-users-per-page" className="form-label small mb-0 text-nowrap" style={{ color: 'var(--edura-text-muted)' }}>Show:</label>
                <select
                  id="explore-users-per-page"
                  className="explore-mini-select"
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
                    <div className="explore-contributor-card-v2 text-center p-3">
                      <div className="edura-skeleton edura-skeleton-circle mx-auto mb-3" style={{ width: 80, height: 80 }} />
                      <div className="edura-skeleton edura-skeleton-text mx-auto" style={{ width: '60%' }} />
                      <div className="edura-skeleton edura-skeleton-text-sm mx-auto mt-2" style={{ width: '80%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="explore-empty-state">
                <div className="explore-empty-icon">👥</div>
                <p className="mb-2">No profiles match your search.</p>
                {appliedSearch.trim() && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    style={{ borderRadius: '9999px' }}
                    onClick={() => { setSearchInput(''); setAppliedSearch(''); setUsersPage(1); setCommunitiesPage(1); }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="row g-3">
                  {users.map((u) => (
                    <div key={u._id} className="col-6 col-md-4 col-lg-3">
                      <div className="explore-contributor-card-v2 text-center p-3 h-100">
                        <div className="explore-avatar-gradient-ring d-inline-block mb-2">
                          {u.picture ? (
                            <img
                              src={u.picture}
                              alt=""
                              className="rounded-circle d-block"
                              width={72}
                              height={72}
                              style={{ border: '2px solid var(--edura-card-bg)' }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="explore-avatar-initials explore-avatar-initials-lg rounded-circle">{getInitials(u.name)}</span>
                          )}
                        </div>
                        <h3 className="explore-card-name mb-0">{u.name}</h3>
                        <p className="small mb-2" style={{ color: 'var(--edura-text-muted)', fontSize: '0.75rem' }}>Contributor</p>
                        <Link to={`/profile/${u._id}`} className="explore-btn-profile-v2">
                          View Profile →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                {usersTotal > 0 && usersTotalPages > 1 && (
                  <nav className="explore-pagination mt-5" aria-label="Contributors pagination">
                    <button type="button" className="explore-pagination-prev" disabled={usersPage <= 1} onClick={() => setUsersPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                    </button>
                    <div className="explore-pagination-numbers">
                      {Array.from({ length: usersTotalPages }, (_, i) => i + 1).map((n) => (
                        <button key={n} type="button" className={`explore-pagination-num ${usersPage === n ? 'explore-pagination-num-active' : ''}`} onClick={() => setUsersPage(n)} aria-label={`Page ${n}`}>{n}</button>
                      ))}
                    </div>
                    <button type="button" className="explore-pagination-next" disabled={usersPage >= usersTotalPages} onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))} aria-label="Next page">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        )}

        {searchFilter === 'all' && <div className="explore-section-rule" />}

        {/* ─── Public Communities ──────────────────────────────── */}
        {(searchFilter === 'all' || searchFilter === 'communities') && (
          <>
            <section className="explore-files mb-5">
            <div className="explore-section-header">
              <div>
                <h2 className="explore-section-title-v2 d-flex align-items-center gap-2">
                  <span className="explore-section-icon-pill" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </span>
                  Public Communities
                </h2>
                <p className="explore-section-desc mb-0">Browse communities created by admins and explore shared resources.</p>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <label htmlFor="explore-communities-per-page" className="form-label small mb-0 text-nowrap" style={{ color: 'var(--edura-text-muted)' }}>Show:</label>
                <select id="explore-communities-per-page" className="explore-mini-select" value={communitiesLimit} onChange={(e) => { setCommunitiesLimit(Number(e.target.value)); setCommunitiesPage(1); }} aria-label="Communities per page">
                  {EXPLORE_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingCommunities ? (
              <div className="row g-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="col-6 col-md-4 col-lg-3">
                    <div className="community-card">
                      <div className="community-card-cover edura-skeleton" style={{ height: 112 }} />
                      <div className="community-card-body p-3">
                        <div className="edura-skeleton edura-skeleton-text" style={{ width: '80%' }} />
                        <div className="edura-skeleton edura-skeleton-text-sm mt-2" style={{ width: '60%' }} />
                        <div className="community-card-stats mt-3 d-flex gap-2">
                          <span className="edura-skeleton edura-skeleton-text-sm" style={{ width: 60 }} />
                        </div>
                        <div className="edura-skeleton mt-3" style={{ height: 36, borderRadius: 8 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : communities.length === 0 ? (
              <div className="explore-empty-state">
                <div className="explore-empty-icon">👥</div>
                <p className="mb-2">No public communities match your search.</p>
                {appliedSearch.trim() && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    style={{ borderRadius: '9999px' }}
                    onClick={() => { setSearchInput(''); setAppliedSearch(''); setUsersPage(1); setCommunitiesPage(1); }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="row g-3">
                  {communities.map((c) => (
                    <div key={c._id} className="col-6 col-md-4 col-lg-3">
                      <CommunityCard community={c} />
                    </div>
                  ))}
                </div>
                {communitiesTotal > 0 && communitiesTotalPages > 1 && (
                  <nav className="explore-pagination mt-5 mb-4" aria-label="Communities pagination">
                    <button type="button" className="explore-pagination-prev" disabled={communitiesPage <= 1} onClick={() => setCommunitiesPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
                    </button>
                    <div className="explore-pagination-numbers">
                      {Array.from({ length: Math.min(communitiesTotalPages, 10) }, (_, i) => i + 1).map((n) => (
                        <button key={n} type="button" className={`explore-pagination-num ${communitiesPage === n ? 'explore-pagination-num-active' : ''}`} onClick={() => setCommunitiesPage(n)} aria-label={`Page ${n}`}>{n}</button>
                      ))}
                    </div>
                    <button type="button" className="explore-pagination-next" disabled={communitiesPage >= communitiesTotalPages} onClick={() => setCommunitiesPage((p) => Math.min(communitiesTotalPages, p + 1))} aria-label="Next page">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
          </>
        )}
      </div>
    </Layout>
  );
}
