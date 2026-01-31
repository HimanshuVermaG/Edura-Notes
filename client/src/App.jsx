import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import AdminLogin from './pages/AdminLogin';
import Homepage from './pages/Homepage';
import Manage from './pages/Manage';
import EditNote from './pages/EditNote';
import ViewNote from './pages/ViewNote';
import FullScreenPdfView from './pages/FullScreenPdfView';
import PublicProfile from './pages/PublicProfile';
import PublicNoteView from './pages/PublicNoteView';
import Explore from './pages/Explore';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminNoteView from './pages/admin/AdminNoteView';

export default function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signin" element={<SignIn />} />
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
      <Route path="/explore" element={<Explore />} />
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
      <Route path="/" element={<Navigate to="/explore" replace />} />
      <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
