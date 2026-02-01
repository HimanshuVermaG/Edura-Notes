import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function SignIn() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const buttonRef = useRef(null);
  const initDoneRef = useRef(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

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
            <h2 className="edura-section-title mb-2">Sign in</h2>
            <p className="edura-section-subtitle mb-4">Sign in with your Google account to access your notes.</p>
            {error && (
              <div className="alert alert-danger py-2 small mb-3" role="alert">
                {error}
              </div>
            )}
            {!GOOGLE_CLIENT_ID ? (
              <p className="text-muted small">Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in the client environment.</p>
            ) : (
              <div className="d-flex flex-column align-items-center">
                <div ref={buttonRef} />
                {submitting && (
                  <p className="small text-muted mt-2 mb-0">Signing in...</p>
                )}
              </div>
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
