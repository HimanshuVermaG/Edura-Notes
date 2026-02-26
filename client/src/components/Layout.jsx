import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/avatar';

export default function Layout({ children }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="edura-header">
        <nav className="navbar navbar-expand-lg navbar-light container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to={isAuthenticated ? '/' : '/explore'}>
            <span className="navbar-brand-icon" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              </svg>
            </span>
            Edura Notes
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
                    <Link className="nav-link" to="/home">
                      Home
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/manage">
                      Manage
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/explore">
                      Explore
                    </Link>
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
                      <img src={user.picture} alt="" className="nav-user-avatar rounded-circle" width={28} height={28} />
                    ) : (
                      <span className="nav-user-initials rounded-circle" aria-hidden>{getInitials(user?.name)}</span>
                    )}
                    <span className="nav-link text-muted small mb-0 py-0">{user?.name}</span>
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
                    <Link className="nav-link" to="/explore">
                      Explore
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-outline-primary btn-sm" to="/signin">
                      Sign In
                    </Link>
                  </li>
                  <li className="nav-item ms-2">
                    <Link className="btn btn-edura btn-sm" to={{ pathname: '/signin', state: { mode: 'signup' } }}>
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>
      </header>

      <main className="flex-grow-1 container py-4">{children}</main>

      <footer className="edura-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-4">
              <h6>Edura Notes</h6>
              <p className="small mb-0">Securely store, organize, and share your academic and professional documents with Edura Notes.</p>
            </div>
            <div className="col-md-2">
              <h6>Quick Links</h6>
              <ul className="list-unstyled small">
                <li><Link to="/explore">Explore</Link></li>
                <li><Link to="/signin">Sign In</Link></li>
                <li><Link to="/home">Home</Link></li>
                <li><Link to="/manage">Manage</Link></li>
              </ul>
            </div>
            <div className="col-md-2">
              <h6>Resources</h6>
              <ul className="list-unstyled small">
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#help">Help Center</a></li>
              </ul>
            </div>
          </div>
          <div className="copyright text-center small mt-3">© {new Date().getFullYear()} Edura Notes. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
