import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/admin/login');
  };

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
          Admin
        </div>
        <nav className="admin-sidebar-nav">
          <NavLink to="/admin/dashboard" end className="admin-sidebar-link">Dashboard</NavLink>
          <NavLink to="/admin/users" className="admin-sidebar-link">Users</NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" className="btn btn-sm btn-outline-light w-100" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-topbar-title">Admin Panel</span>
          <span className="admin-topbar-user">{user?.name || user?.email}</span>
        </header>
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
