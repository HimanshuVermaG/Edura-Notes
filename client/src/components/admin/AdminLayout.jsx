import { Link, useNavigate } from 'react-router-dom';
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
        <div className="admin-sidebar-brand">Admin</div>
        <nav className="admin-sidebar-nav">
          <Link to="/admin/dashboard" className="admin-sidebar-link">Dashboard</Link>
          <Link to="/admin/users" className="admin-sidebar-link">Users</Link>
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
