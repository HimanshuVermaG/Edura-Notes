import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { api, apiForm } from '../api/client';

export default function NewNote() {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [folderId, setFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api('/folders')
      .then(setFolders)
      .catch(() => setFolders([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please select a PDF or image file');
      return;
    }
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (folderId) formData.append('folderId', folderId);
      await apiForm('/notes', formData, { method: 'POST' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to upload note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="edura-card p-4">
        <h2 className="edura-section-title mb-2">Upload PDF or Image</h2>
        <p className="edura-section-subtitle mb-4">Choose a PDF or image file (JPEG, PNG, GIF, WebP) and optionally assign it to a folder.</p>
        <form className="edura-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          )}
          <div className="mb-3">
            <label htmlFor="title" className="form-label">Title</label>
            <input
              id="title"
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Note title"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="file" className="form-label">PDF or image file</label>
            <input
              id="file"
              type="file"
              className="form-control"
              accept=".pdf,application/pdf,.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="folder" className="form-label">Folder</label>
            <select
              id="folder"
              className="form-select"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">Uncategorized</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex gap-2">
            <button type="submit" className="edura-btn-primary btn btn-primary" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Upload'}
            </button>
            <Link to="/dashboard" className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
