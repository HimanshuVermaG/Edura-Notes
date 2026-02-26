import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function SignIn() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const buttonRef = useRef(null);
  const initDoneRef = useRef(false);
  const { setToken, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';
  const initialMode = location.state?.mode === 'signup' ? 'signup' : 'signin';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const [mode, setModeState] = useState(initialMode);
  const setMode = (m) => {
    setError('');
    setModeState(m);
  };

  const fromRef = useRef(from);
  const setTokenRef = useRef(setToken);
  const navigateRef = useRef(navigate);
  fromRef.current = from;
  setTokenRef.current = setToken;
  navigateRef.current = navigate;

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

  const handleEmailSignIn = (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
      .then((data) => {
        setTokenRef.current(data.token, data.user);
        navigateRef.current(fromRef.current, { replace: true });
      })
      .catch((err) => setError(err.message || 'Sign in failed'))
      .finally(() => setSubmitting(false));
  };

  const handleEmailSignUp = (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    })
      .then((data) => {
        setTokenRef.current(data.token, data.user);
        navigateRef.current(fromRef.current, { replace: true });
      })
      .catch((err) => setError(err.message || 'Sign up failed'))
      .finally(() => setSubmitting(false));
  };

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

  return (
    <Layout>
      <div className="edura-auth-page">
        <div className="edura-auth-card">
          <div className="edura-card p-4">
            <h2 className="edura-section-title mb-2">Sign in / Sign up</h2>
            <p className="edura-section-subtitle mb-3">Use Google or email to access your notes.</p>
            {error && (
              <div className="alert alert-danger py-2 small mb-3" role="alert">
                {error}
              </div>
            )}
            {GOOGLE_CLIENT_ID && (
              <div className="d-flex flex-column align-items-center mb-4">
                <div ref={buttonRef} />
                {submitting && (
                  <p className="small text-muted mt-2 mb-0">Signing in...</p>
                )}
                <span className="small text-muted my-3">or</span>
              </div>
            )}
            {!GOOGLE_CLIENT_ID && (
              <p className="text-muted small mb-3">Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in the client environment.</p>
            )}
            <ul className="nav nav-tabs nav-fill mb-3" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  type="button"
                  className={`nav-link ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => setMode('signin')}
                  role="tab"
                  aria-selected={mode === 'signin'}
                >
                  Sign in
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  type="button"
                  className={`nav-link ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => setMode('signup')}
                  role="tab"
                  aria-selected={mode === 'signup'}
                >
                  Sign up
                </button>
              </li>
            </ul>
            {mode === 'signin' ? (
              <form onSubmit={handleEmailSignIn}>
                <div className="mb-3">
                  <label htmlFor="signin-email" className="form-label small">Email</label>
                  <input
                    id="signin-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="signin-password" className="form-label small">Password</label>
                  <input
                    id="signin-password"
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                </div>
                <button type="submit" className="btn btn-edura w-100" disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
              ) : (
                <>
                  <p className="small text-muted mb-3">Password must be at least 6 characters.</p>
                  <form onSubmit={handleEmailSignUp}>
                <div className="mb-3">
                  <label htmlFor="signup-name" className="form-label small">Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="signup-email" className="form-label small">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="signup-password" className="form-label small">Password (min 6 characters)</label>
                  <input
                    id="signup-password"
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    disabled={submitting}
                  />
                </div>
                <button type="submit" className="btn btn-edura w-100" disabled={submitting}>
                  {submitting ? 'Signing up...' : 'Sign up'}
                </button>
              </form>
                </>
              )}
            <p className="text-center text-muted small mt-4 mb-0">
              <Link to="/explore">Explore public files and profiles</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
