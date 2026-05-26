import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import FolderTreeSelect from '../components/FolderTreeSelect';
import ConfirmModal from '../components/ConfirmModal';
import { api, apiForm, invalidateBlobCache, getApiUrl } from '../api/client';

export default function EditNote() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState(null);
  const [driveLink, setDriveLink] = useState('');
  const [editMode, setEditMode] = useState('keep'); // 'keep', 'file', 'link'
  const [folderId, setFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [currentFileName, setCurrentFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const initialRef = useRef({ title: '', description: '', folderId: '', isPublic: false });
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api(`/notes/${id}`), api('/folders')])
      .then(([note, foldersList]) => {
        const desc = note.description || '';
        const isPub = note.isPublic === true;
        const fid = note.folderId && (typeof note.folderId === 'object' ? note.folderId._id : note.folderId);
        const fidStr = fid || '';
        setTitle(note.title);
        setDescription(desc);
        setIsPublic(isPub);
        setCurrentFileName(note.originalName || note.fileName || '');
        setDriveLink(note.driveLink || '');
        setFolderId(fidStr);
        setFolders(foldersList);
        initialRef.current = { title: note.title, description: desc, folderId: fidStr, isPublic: isPub, driveLink: note.driveLink || '' };
      })
      .catch(() => setError('Note not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const init = initialRef.current;
  const isDirty = init.title !== '' && (
    (editMode === 'file' && file != null) ||
    (editMode === 'link' && driveLink !== init.driveLink) ||
    title !== init.title ||
    description !== init.description ||
    folderId !== init.folderId ||
    isPublic !== init.isPublic
  );

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editMode === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('isPublic', String(isPublic));
        if (folderId) formData.append('folderId', folderId);
        await apiForm(`/notes/${id}`, formData, { method: 'PUT' });
      } else {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          isPublic,
          folderId: folderId || null,
        };
        if (editMode === 'link' && driveLink.trim()) {
          payload.driveLink = driveLink.trim();
        }
        await api(`/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      // Bust the blob cache so the viewer re-downloads the updated file
      const fileUrl = `/notes/${id}/file`;
      await invalidateBlobCache(getApiUrl(fileUrl));
      navigate('/manage');
    } catch (err) {
      setError(err.message || 'Failed to update note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api(`/notes/${id}`, { method: 'DELETE' });
      await invalidateBlobCache(getApiUrl(`/notes/${id}/file`));
      setShowDeleteModal(false);
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
      <nav aria-label="Breadcrumb" className="edura-breadcrumb">
        <Link to="/manage">Manage</Link>
        <span className="text-muted">/</span>
        <span className="breadcrumb-current">Edit note</span>
      </nav>
      <div className="edura-card edura-card-lg p-4">
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
            <label className="form-label">Update File or Link (optional)</label>
            <div className="btn-group w-100 mb-3" role="group">
              <input type="radio" className="btn-check" name="editMode" id="editKeep" checked={editMode === 'keep'} onChange={() => setEditMode('keep')} />
              <label className="btn btn-outline-primary btn-sm" htmlFor="editKeep">Keep Current</label>
              
              <input type="radio" className="btn-check" name="editMode" id="editFile" checked={editMode === 'file'} onChange={() => setEditMode('file')} />
              <label className="btn btn-outline-primary btn-sm" htmlFor="editFile">Upload New File</label>
              
              <input type="radio" className="btn-check" name="editMode" id="editLink" checked={editMode === 'link'} onChange={() => setEditMode('link')} />
              <label className="btn btn-outline-primary btn-sm" htmlFor="editLink">New Drive Link</label>
            </div>
            
            {editMode === 'keep' && (
               <div className="form-text mt-0">
                 Current file: {init.driveLink ? 'Google Drive Link' : (currentFileName || 'None')}
               </div>
            )}
            
            {editMode === 'file' && (
              <>
                <input
                  id="file"
                  type="file"
                  className="form-control"
                  accept=".pdf,application/pdf,.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <div className="form-text small mt-1">
                    New file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </>
            )}

            {editMode === 'link' && (
              <>
                <input
                  id="driveLink"
                  type="url"
                  className="form-control"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="e.g. https://drive.google.com/file/d/1vN_XYZ.../view"
                />
                <small className="text-muted mt-2 d-block">
                  Ensure the link sharing is set to "<strong>Anyone with the link</strong>".
                </small>
              </>
            )}
          </div>
          <div className="edura-form-actions">
            <button type="submit" className="edura-btn-primary btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/manage" className="btn btn-outline-secondary">
              Cancel
            </Link>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
              aria-label="Delete note"
            >
              {deleting ? 'Deleting...' : 'Delete note'}
            </button>
          </div>
        </form>
      </div>
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete note"
        body="Delete this note? This cannot be undone."
        confirmLabel="Delete note"
        variant="danger"
        loading={deleting}
      />
    </Layout>
  );
}
