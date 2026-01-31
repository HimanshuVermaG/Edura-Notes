import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/users')
      .then(setUsers)
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const totalUsers = users.length;
  const totalNotes = users.reduce((sum, u) => sum + (u.noteCount || 0), 0);

  if (loading) {
    return (
      <div className="admin-page p-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page p-4">
      <h1 className="h4 mb-4">Dashboard</h1>
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-4">
          <div className="admin-card card h-100">
            <div className="card-body">
              <h6 className="text-muted text-uppercase small mb-1">Total Users</h6>
              <p className="h3 mb-0">{totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-4">
          <div className="admin-card card h-100">
            <div className="card-body">
              <h6 className="text-muted text-uppercase small mb-1">Total Notes</h6>
              <p className="h3 mb-0">{totalNotes}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex align-items-center gap-2">
        <Link to="/admin/users" className="btn btn-primary">
          View all users
        </Link>
      </div>
    </div>
  );
}
