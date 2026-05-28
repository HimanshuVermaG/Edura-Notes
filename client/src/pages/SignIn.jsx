import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Icon helpers
function MailIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}
function LockIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}
function UserIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function ArrowRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}

export default function SignIn() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shakeError, setShakeError] = useState(false);
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

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 500);
  };

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
      .catch((err) => { setError(err.message || 'Sign in failed'); triggerShake(); })
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
      .catch((err) => { setError(err.message || 'Sign in failed'); triggerShake(); })
      .finally(() => setSubmitting(false));
  };

  const handleEmailSignUp = (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      triggerShake();
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
      .catch((err) => { setError(err.message || 'Sign up failed'); triggerShake(); })
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
        <div className="edura-auth-split">
          {/* ── Left: Form panel ── */}
          <div className="edura-auth-panel-form">
            <h2 className="mb-1" style={{ fontSize: '1.6rem' }}>
              {mode === 'signin' ? 'Welcome back 👋' : 'Create account ✨'}
            </h2>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
              {mode === 'signin' ? 'Sign in to access your notes.' : 'Join Edura Notes for free.'}
            </p>

            {error && (
              <div className={`alert alert-danger py-2 small mb-3 edura-auth-error${shakeError ? ' edura-shake' : ''}`} role="alert">
                {error}
              </div>
            )}

            {GOOGLE_CLIENT_ID && (
              <div className="d-flex flex-column align-items-center mb-4">
                <div ref={buttonRef} />
                {submitting && (
                  <p className="small text-muted mt-2 mb-0">Signing in...</p>
                )}
                <div className="edura-auth-divider">
                  <span>or</span>
                </div>
              </div>
            )}
            {!GOOGLE_CLIENT_ID && (
              <p className="text-muted small mb-3">Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in the client environment.</p>
            )}

            {/* Tab switcher */}
            <div className="edura-auth-tabs" role="tablist">
              <button
                type="button"
                className={`nav-link${mode === 'signin' ? ' active' : ''}`}
                onClick={() => setMode('signin')}
                role="tab"
                aria-selected={mode === 'signin'}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`nav-link${mode === 'signup' ? ' active' : ''}`}
                onClick={() => setMode('signup')}
                role="tab"
                aria-selected={mode === 'signup'}
              >
                Sign up
              </button>
            </div>

            {mode === 'signin' ? (
              <form onSubmit={handleEmailSignIn}>
                <div className="edura-float-label">
                  <span className="edura-input-icon"><MailIcon /></span>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={submitting}
                    placeholder=" "
                  />
                  <label htmlFor="signin-email">Email</label>
                </div>
                <div className="edura-float-label">
                  <span className="edura-input-icon"><LockIcon /></span>
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={submitting}
                    placeholder=" "
                  />
                  <label htmlFor="signin-password">Password</label>
                </div>
                <button type="submit" className="btn btn-edura w-100 mt-2" disabled={submitting} style={{ padding: '0.65rem' }}>
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <>
                <p className="small text-muted mb-3">Password must be at least 6 characters.</p>
                <form onSubmit={handleEmailSignUp}>
                  <div className="edura-float-label">
                    <span className="edura-input-icon"><UserIcon /></span>
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                      disabled={submitting}
                      placeholder=" "
                    />
                    <label htmlFor="signup-name">Full name</label>
                  </div>
                  <div className="edura-float-label">
                    <span className="edura-input-icon"><MailIcon /></span>
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      disabled={submitting}
                      placeholder=" "
                    />
                    <label htmlFor="signup-email">Email</label>
                  </div>
                  <div className="edura-float-label">
                    <span className="edura-input-icon"><LockIcon /></span>
                    <input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={submitting}
                      placeholder=" "
                    />
                    <label htmlFor="signup-password">Password (min 6 chars)</label>
                  </div>
                  <button type="submit" className="btn btn-edura w-100 mt-2" disabled={submitting} style={{ padding: '0.65rem' }}>
                    {submitting ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
              </>
            )}

            <p className="text-center mt-4 mb-0">
              <Link to="/community" className="edura-auth-explore-link">
                Browse public notes without signing in <ArrowRightIcon />
              </Link>
            </p>
          </div>

          {/* ── Right: Decorative panel ── */}
          <div className="edura-auth-panel-deco" aria-hidden="true">
            <div className="edura-auth-deco-blob edura-auth-deco-blob-1" />
            <div className="edura-auth-deco-blob edura-auth-deco-blob-2" />
            <div className="edura-auth-deco-blob edura-auth-deco-blob-3" />
            <div className="edura-auth-panel-deco-inner">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" style={{ marginBottom: '1rem' }}>
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              </svg>
              <h2>Edura Notes</h2>
              <p>Securely store, organize, and share your academic &amp; professional documents.</p>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                <span>✓ Secure cloud storage</span>
                <span>✓ Organize with folders</span>
                <span>✓ Share public notes</span>
                <span>✓ Access anywhere</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
