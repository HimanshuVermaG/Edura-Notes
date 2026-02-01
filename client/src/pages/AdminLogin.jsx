import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const buttonRef = useRef(null);
  const initDoneRef = useRef(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

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
          setSubmitting(false);
          return;
        }
        setToken(data.token, data.user);
        navigate('/admin', { replace: true });
      })
      .catch((err) => setError(err.message || 'Sign in failed'))
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
    <div className="admin-login-page min-vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="admin-login-card card shadow-lg" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body p-4">
          <h2 className="h4 mb-2 text-center">Admin Login</h2>
          <p className="text-muted small text-center mb-4">Sign in with your Google admin account.</p>
          {error && (
            <div className="alert alert-danger py-2 small mb-3" role="alert">
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
        </div>
      </div>
    </div>
  );
}
