import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Globe, Settings, Link as LinkIcon } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';
import { useEffect, useState } from 'react';

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('edura-theme') === 'dark';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('edura-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark];
}

function useScrollTop() {
  const [show, setShow] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > 300);
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return { show, scrolled };
}

// Sun icon
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

// Moon icon
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
    </svg>
  );
}

// Arrow up icon for scroll-to-top
function ArrowUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

export default function Layout({ children }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useDarkMode();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { show: showScrollTop, scrolled } = useScrollTop();

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <header className={`edura-header glass${scrolled ? ' scrolled' : ''}`}>
        <nav className="navbar navbar-expand-lg navbar-light container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to={isAuthenticated ? '/' : '/community'}>
            <span className="navbar-brand-icon" aria-hidden>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              </svg>
            </span>
            Notes Handling
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#nav"
            aria-controls="nav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="nav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
              {isAuthenticated ? (
                <>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/dashboard">
                      My Files
                    </NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/community">
                      Community
                    </NavLink>
                  </li>
                  {user?._id && (
                    <li className="nav-item">
                      <Link className="nav-link small" to={`/profile/${user._id}`} title="Your public profile">
                        Public profile
                      </Link>
                    </li>
                  )}
                  <li className="nav-item d-flex align-items-center gap-2">
                    {user?.picture ? (
                      <img src={user.picture} alt="" className="nav-user-avatar rounded-circle" width={32} height={32} />
                    ) : (
                      <span className="nav-user-initials rounded-circle" aria-hidden>{getInitials(user?.name)}</span>
                    )}
                    <span className="nav-link text-muted small mb-0 py-0 pe-1">{user?.name}</span>
                    <button type="button" className="btn btn-sm btn-link text-muted p-0 ms-1 me-2" onClick={() => setProfileModalOpen(true)} title="Edit Profile">
                      <Settings size={16} />
                    </button>
                  </li>
                  <li className="nav-item d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="edura-dark-toggle"
                      onClick={() => setDark(d => !d)}
                      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                      aria-label="Toggle dark mode"
                    >
                      {dark ? <SunIcon /> : <MoonIcon />}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button type="button" className="btn btn-edura btn-sm" onClick={handleSignOut}>
                      Sign Out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/community">
                      Community
                    </Link>
                  </li>
                  <li className="nav-item d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="edura-dark-toggle"
                      onClick={() => setDark(d => !d)}
                      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                      aria-label="Toggle dark mode"
                    >
                      {dark ? <SunIcon /> : <MoonIcon />}
                    </button>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-edura btn-sm" to="/signin">
                      Sign In
                    </Link>
                  </li>
                  <li className="nav-item ms-2">
                    <Link className="btn btn-edura btn-sm" to="/signin" state={{ mode: 'signup' }}>
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>
      </header>

      <main className="flex-grow-1 container py-4 edura-page-fade">{children}</main>

      <footer className="edura-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-4">
              <h6>Notes Handling</h6>
              <p className="small mb-0">Securely store, organize, and share your academic and professional documents with Notes Handling.</p>
            </div>
            <div className="col-md-2">
              <h6>Quick Links</h6>
              <ul className="list-unstyled small">
                <li><Link to="/community">Community</Link></li>
                {isAuthenticated ? (
                  <>
                    <li><Link to="/manage">My Files</Link></li>
                    {user?._id && <li><Link to={`/profile/${user._id}`}>Public profile</Link></li>}
                  </>
                ) : (
                  <li><Link to="/signin">Sign In</Link></li>
                )}
              </ul>
            </div>
            <div className="col-md-2">
              <h6>Resources</h6>
              <ul className="list-unstyled small">
                <li><span className="text-white-50">Privacy Policy</span></li>
                <li><span className="text-white-50">Terms of Service</span></li>
                <li><span className="text-white-50">Help Center</span></li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6>Connect</h6>
              <div className="edura-footer-social">
                <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter / X">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="copyright small mt-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{color: '#fff', opacity: 0.7}}><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" /></svg>
            © {new Date().getFullYear()} Notes Handling. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Scroll to top button */}
      <button
        type="button"
        className={`edura-scroll-top${showScrollTop ? ' visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        <ArrowUpIcon />
      </button>

      {/* Profile Modal */}
      <EditProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} user={user} />
    </div>
  );
}

function EditProfileModal({ isOpen, onClose, user }) {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [socials, setSocials] = useState({ github: '', linkedin: '', twitter: '', website: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setSocials({
        github: user.socialLinks?.github || '',
        linkedin: user.socialLinks?.linkedin || '',
        twitter: user.socialLinks?.twitter || '',
        website: user.socialLinks?.website || ''
      });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, bio, socialLinks: socials }),
        headers: { 'Content-Type': 'application/json' }
      });
      login(localStorage.getItem('token'), res.user);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content edura-card border-0">
            <div className="modal-header border-0 pb-0">
              <h5 className="modal-title fw-bold">Edit Profile</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} id="profile-form">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Name</label>
                  <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Bio</label>
                  <textarea className="form-control" rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..."></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">GitHub URL</label>
                  <div className="input-group">
                    <span className="input-group-text"><LinkIcon size={16} /></span>
                    <input type="url" className="form-control" value={socials.github} onChange={e => setSocials(s => ({ ...s, github: e.target.value }))} placeholder="https://github.com/..." />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">LinkedIn URL</label>
                  <div className="input-group">
                    <span className="input-group-text"><LinkIcon size={16} /></span>
                    <input type="url" className="form-control" value={socials.linkedin} onChange={e => setSocials(s => ({ ...s, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Twitter URL</label>
                  <div className="input-group">
                    <span className="input-group-text"><LinkIcon size={16} /></span>
                    <input type="url" className="form-control" value={socials.twitter} onChange={e => setSocials(s => ({ ...s, twitter: e.target.value }))} placeholder="https://twitter.com/..." />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Personal Website</label>
                  <div className="input-group">
                    <span className="input-group-text"><Globe size={16} /></span>
                    <input type="url" className="form-control" value={socials.website} onChange={e => setSocials(s => ({ ...s, website: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer border-0 pt-0">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button type="submit" form="profile-form" className="btn btn-edura" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
