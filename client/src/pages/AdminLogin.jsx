import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const buttonRef = useRef(null);
  const initDoneRef = useRef(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

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
        if (data.user?.role !== 'admin') {
          setError('Not an admin account. Sign in with a Google account that has admin access.');
          triggerShake();
          setSubmitting(false);
          return;
        }
        setToken(data.token, data.user);
        navigate('/admin', { replace: true });
      })
      .catch((err) => { setError(err.message || 'Sign in failed'); triggerShake(); })
      .finally(() => setSubmitting(false));
  };

  const callbackRef = useRef(handleCredential);
  callbackRef.current = handleCredential;

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
    <div className="admin-login-page min-vh-100 d-flex align-items-center justify-content-center">
      {/* Dot grid background */}
      <div className="admin-login-dot-grid" aria-hidden />
      <div className="admin-login-spotlight" aria-hidden />

      <div className="glass admin-login-card" style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1, borderRadius: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
        <div className="card-body p-4" style={{ borderRadius: 20 }}>
          <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
            <ShieldIcon />
            <h2 className="h4 mb-0" style={{ color: '#1f2937' }}>Admin Login</h2>
          </div>
          <p className="text-muted small text-center mb-4">Sign in with your Google admin account.</p>
          {error && (
            <div className={`alert alert-danger py-2 small mb-3 admin-login-error${shakeError ? ' edura-shake' : ''}`} role="alert">
              {error}
            </div>
          )}
          {!GOOGLE_CLIENT_ID ? (
            <p className="text-muted small text-center">Google Sign-In is not configured.</p>
          ) : (
            <div className="d-flex flex-column align-items-center">
              <div ref={buttonRef} />
              {submitting && (
                <p className="small text-muted mt-2 mb-0">Signing in...</p>
              )}
            </div>
          )}
          <p className="text-muted small text-center mt-3 mb-0">Only Google accounts with admin access can sign in here.</p>
          <div className="text-center mt-2">
            <Link to="/explore" className="admin-login-back-link small d-inline-flex align-items-center gap-1">
              <ArrowLeftIcon /> Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
