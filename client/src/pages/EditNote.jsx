import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import FolderTreeSelect from '../components/FolderTreeSelect';
import { api, apiForm } from '../api/client';

export default function EditNote() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState(null);
  const [folderId, setFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api(`/notes/${id}`), api('/folders')])
      .then(([note, foldersList]) => {
        setTitle(note.title);
        setDescription(note.description || '');
        setIsPublic(note.isPublic === true);
        setCurrentFileName(note.originalName || note.fileName || '');
        const fid = note.folderId && (typeof note.folderId === 'object' ? note.folderId._id : note.folderId);
        setFolderId(fid || '');
        setFolders(foldersList);
      })
      .catch(() => setError('Note not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('isPublic', String(isPublic));
        if (folderId) formData.append('folderId', folderId);
        await apiForm(`/notes/${id}`, formData, { method: 'PUT' });
      } else {
        await api(`/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            isPublic,
            folderId: folderId || null,
          }),
        });
      }
      navigate('/manage');
    } catch (err) {
      setError(err.message || 'Failed to update note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api(`/notes/${id}`, { method: 'DELETE' });
      navigate('/manage');
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !title) {
    return (
      <Layout>
        <div className="alert alert-danger">{error}</div>
        <Link to="/manage">Back to Manage</Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="edura-card p-4">
        <h2 className="edura-section-title mb-2">Edit note</h2>
        <p className="edura-section-subtitle mb-4">Update title, description, folder, visibility, or replace the file (PDF or image).</p>
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
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-control"
              rows={3}
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label id="edit-note-folder-label" className="form-label">Folder</label>
            <FolderTreeSelect
              id="folder"
              labelId="edit-note-folder-label"
              folders={folders}
              value={folderId}
              onChange={setFolderId}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="visibility" className="form-label">Visibility</label>
            <select
              id="visibility"
              className="form-select"
              style={{ maxWidth: 160 }}
              value={isPublic ? 'true' : 'false'}
              onChange={(e) => setIsPublic(e.target.value === 'true')}
            >
              <option value="false">Private</option>
              <option value="true">Public</option>
            </select>
            <div className="form-text small">Public notes appear on your public profile and in Explore.</div>
          </div>
          <div className="mb-4">
            <label htmlFor="file" className="form-label">Replace file (optional)</label>
            <input
              id="file"
              type="file"
              className="form-control"
              accept=".pdf,application/pdf,.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {currentFileName && !file && (
              <div className="form-text small">Current file: {currentFileName}</div>
            )}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button type="submit" className="edura-btn-primary btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/manage" className="btn btn-outline-secondary">
              Cancel
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger ms-auto"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete note'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
