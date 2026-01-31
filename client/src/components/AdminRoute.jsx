import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLayout from './admin/AdminLayout';

export default function AdminRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
