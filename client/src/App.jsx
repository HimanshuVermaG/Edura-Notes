import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Explore from './pages/Explore';
import AdminLogin from './pages/AdminLogin';
import Homepage from './pages/Homepage';
import Manage from './pages/Manage';
import EditNote from './pages/EditNote';
import ViewNote from './pages/ViewNote';
import FullScreenPdfView from './pages/FullScreenPdfView';
import PublicProfile from './pages/PublicProfile';
import PublicNoteView from './pages/PublicNoteView';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminNoteView from './pages/admin/AdminNoteView';

function ExploreOrRedirect() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to={{ pathname: '/', hash: 'explore' }} replace />;
  return <Explore />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route path="/signin" element={<Navigate to="/" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="view/note/:noteId" element={<AdminNoteView />} />
      </Route>
      <Route path="/profile/:userId" element={<PublicProfile />} />
      <Route path="/view/note/:id" element={<PublicNoteView />} />
      <Route path="/explore" element={<ExploreOrRedirect />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Homepage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage"
        element={
          <ProtectedRoute>
            <Manage />
          </ProtectedRoute>
        }
      />
      <Route path="/notes/new" element={<Navigate to="/manage" replace />} />
      <Route
        path="/notes/:id/view"
        element={
          <ProtectedRoute>
            <FullScreenPdfView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes/:id/edit"
        element={
          <ProtectedRoute>
            <EditNote />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes/:id"
        element={
          <ProtectedRoute>
            <ViewNote />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
