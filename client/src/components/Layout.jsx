import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/signin');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <header className="edura-header">
        <nav className="navbar navbar-expand-lg navbar-light container">
          <Link className="navbar-brand" to="/">
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
                  {user?._id && (
                    <li className="nav-item">
                      <Link className="nav-link small" to={`/profile/${user._id}`} title="Your public profile">
                        Public profile
                      </Link>
                    </li>
                  )}
                  <li className="nav-item">
                    <span className="nav-link text-muted small">{user?.name}</span>
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
                    <Link className="nav-link" to="/signin">
                      Sign In
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn btn-edura btn-sm" to="/signup">
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
              <p className="small mb-0">Store and organize your notes with folders. Secure viewing, no copy or print.</p>
            </div>
            <div className="col-md-2">
              <h6>Quick Links</h6>
              <ul className="list-unstyled small">
                <li><Link to="/signin">Sign In</Link></li>
                <li><Link to="/signup">Sign Up</Link></li>
                <li><Link to="/home">Home</Link></li>
                <li><Link to="/manage">Manage</Link></li>
              </ul>
            </div>
            <div className="col-md-2">
              <h6>Resources</h6>
              <ul className="list-unstyled small">
                <li><a href="#privacy">Privacy</a></li>
                <li><a href="#terms">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="copyright text-center small">Copyright © {new Date().getFullYear()} Edura Notes. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
