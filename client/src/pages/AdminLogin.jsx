import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.user?.role !== 'admin') {
        setError('Not an admin account. Sign in with an admin email and password.');
        setSubmitting(false);
        return;
      }
      setToken(data.token, data.user);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page min-vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div className="admin-login-card card shadow-lg" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card-body p-4">
          <h2 className="h4 mb-2 text-center">Admin Login</h2>
          <p className="text-muted small text-center mb-4">Sign in with your admin account.</p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                {error}
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="admin-email" className="form-label">Email</label>
              <input
                id="admin-email"
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="admin-password" className="form-label">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
