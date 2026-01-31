import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="edura-auth-page">
        <div className="edura-auth-card">
          <div className="edura-card p-4">
            <h2 className="edura-section-title mb-2">Sign in</h2>
            <p className="edura-section-subtitle mb-4">Welcome back. Sign in to access your notes.</p>
            <form className="edura-form" onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="edura-btn-primary btn btn-primary" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className="text-center text-muted small mt-3 mb-0">
              Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
            </p>
            <p className="text-center text-muted small mt-2 mb-0">
              <Link to="/explore">Explore public files and profiles</Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
