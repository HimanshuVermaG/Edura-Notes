import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function SignUp() {
  const [name, setName] = useState('');
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
      const data = await api('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setToken(data.token, data.user);
      navigate('/signin');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="edura-auth-page">
        <div className="edura-auth-card">
          <div className="edura-card p-4">
            <h2 className="edura-section-title mb-2">Create account</h2>
            <p className="edura-section-subtitle mb-4">Sign up to start storing your notes.</p>
            <form className="edura-form" onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-danger py-2 small" role="alert">
                  {error}
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Name</label>
                <input
                  id="name"
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
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
                  minLength={6}
                  autoComplete="new-password"
                />
                <div className="form-text small">At least 6 characters</div>
              </div>
              <button type="submit" className="edura-btn-primary btn btn-primary" disabled={submitting}>
                {submitting ? 'Signing up...' : 'Sign Up'}
              </button>
            </form>
            <p className="text-center text-muted small mt-3 mb-0">
              Already have an account? <Link to="/signin">Sign In</Link>
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
