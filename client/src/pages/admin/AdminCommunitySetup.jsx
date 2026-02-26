import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, apiForm } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';
import FolderTreeSelect from '../../components/FolderTreeSelect';
import { getFoldersInTreeOrder } from '../../utils/folderTree';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function validateFile(file) {
  if (!file) return 'Please select a file';
  if (file.size > MAX_FILE_SIZE) return 'File must be 10 MB or smaller';
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return 'Only PDF and images (JPEG, PNG, GIF, WebP) are allowed';
  }
  return null;
}

function getFolderNameById(folders, id) {
  if (!id) return 'Root Directory';
  const f = folders.find((x) => x._id === id);
  return f ? f.name : 'Root Directory';
}

export default function AdminCommunitySetup() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const isEdit = Boolean(communityId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [coverUrl, setCoverUrl] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);

  const [targetFolderId, setTargetFolderId] = useState('');
  const [fileQueue, setFileQueue] = useState([]);
  const [dropzoneDragging, setDropzoneDragging] = useState(false);
  const [currentFormFile, setCurrentFormFile] = useState(null);
  const [uploadFileTitle, setUploadFileTitle] = useState('');
  const [uploadFileDescription, setUploadFileDescription] = useState('');
  const [existingFiles, setExistingFiles] = useState([]);
  const [deleteFileTarget, setDeleteFileTarget] = useState(null);

  const loadCommunity = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    setError('');
    try {
      const [data, filesList] = await Promise.all([
        api(`/admin/communities/${communityId}`),
        api(`/admin/communities/${communityId}/files`).then((f) => (Array.isArray(f) ? f : [])).catch(() => []),
      ]);
      setName(data.name || '');
      setDescription(data.description || '');
      setTags(Array.isArray(data.tags) ? [...data.tags] : []);
      setCoverUrl(data.coverUrl || null);
      setFolders(data.folders || []);
      setExistingFiles(filesList);
    } catch (err) {
      setError(err.message || 'Failed to load community');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    if (isEdit) loadCommunity();
  }, [isEdit, loadCommunity]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
      setDirty(true);
    }
  };

  const removeTag = (t) => {
    setTags((prev) => prev.filter((x) => x !== t));
    setDirty(true);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Cover must be an image (JPEG, PNG, GIF, WebP)', 'error');
      return;
    }
    setCoverFile(file);
    setCoverUrl(URL.createObjectURL(file));
    setDirty(true);
  };

  const addFolder = async () => {
    const n = newFolderName.trim();
    if (!n) {
      addToast('Folder name is required', 'error');
      return;
    }
    if (isEdit) {
      try {
        const created = await api(`/admin/communities/${communityId}/folders`, {
          method: 'POST',
          body: JSON.stringify({ name: n }),
        });
        setFolders((prev) => [...prev, created]);
        setNewFolderName('');
      } catch (err) {
        addToast(err.message || 'Failed to add folder', 'error');
        return;
      }
    } else {
      const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFolders((prev) => [...prev, { _id: tempId, name: n, parentId: null }]);
      setNewFolderName('');
      setDirty(true);
    }
  };

  const updateFolder = async () => {
    if (!editingFolderId || editingFolderName.trim() === '') return;
    const nameTrim = editingFolderName.trim();
    if (isEdit && !editingFolderId.startsWith('local-')) {
      try {
        await api(`/admin/communities/${communityId}/folders/${editingFolderId}`, {
          method: 'PUT',
          body: JSON.stringify({ name: nameTrim }),
        });
        setFolders((prev) =>
          prev.map((f) => (f._id === editingFolderId ? { ...f, name: nameTrim } : f))
        );
      } catch (err) {
        addToast(err.message || 'Failed to update folder', 'error');
        return;
      }
    } else {
      setFolders((prev) =>
        prev.map((f) => (f._id === editingFolderId ? { ...f, name: nameTrim } : f))
      );
      setDirty(true);
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const deleteFolder = async () => {
    if (!deleteFolderTarget) return;
    const id = deleteFolderTarget._id;
    if (isEdit && !id.startsWith('local-')) {
      try {
        await api(`/admin/communities/${communityId}/folders/${id}`, { method: 'DELETE' });
        setFolders((prev) => prev.filter((f) => f._id !== id));
        setFileQueue((prev) => prev.filter((q) => q.communityFolderId !== id));
      } catch (err) {
        addToast(err.message || 'Failed to delete folder', 'error');
      }
    } else {
      setFolders((prev) => prev.filter((f) => f._id !== id));
      setFileQueue((prev) => prev.filter((q) => q.communityFolderId !== id));
      setDirty(true);
    }
    setDeleteFolderTarget(null);
  };

  const addFilesToQueue = (files) => {
    const dest = targetFolderId || null;
    const toAdd = [];
    for (const file of Array.from(files || [])) {
      const err = validateFile(file);
      if (err) {
        addToast(err, 'error');
        continue;
      }
      toAdd.push({ file, communityFolderId: dest });
    }
    if (toAdd.length) {
      setFileQueue((prev) => [...prev, ...toAdd]);
      setDirty(true);
    }
  };

  const removeFromQueue = (index) => {
    setFileQueue((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDropzoneDragging(false);
    addFilesToQueue(e.dataTransfer?.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropzoneDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDropzoneDragging(false);
  };

  const handleUploadDropzoneDrop = (e) => {
    e.preventDefault();
    setDropzoneDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      addToast(err, 'error');
      return;
    }
    setCurrentFormFile(file);
  };

  const handleUploadDropzoneDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropzoneDragging(true);
  };

  const handleUploadDropzoneDragLeave = (e) => {
    e.preventDefault();
    setDropzoneDragging(false);
  };

  const handleUploadFileChange = (file) => {
    if (!file) {
      setCurrentFormFile(null);
      return;
    }
    const err = validateFile(file);
    if (err) {
      addToast(err, 'error');
      return;
    }
    setCurrentFormFile(file);
  };

  const handleAddToQueue = (e) => {
    e?.preventDefault();
    const err = validateFile(currentFormFile);
    if (err) {
      addToast(err, 'error');
      return;
    }
    if (!currentFormFile) {
      addToast('Please select a file', 'error');
      return;
    }
    const titleTrim = uploadFileTitle.trim();
    if (!titleTrim) {
      addToast('Title is required', 'error');
      return;
    }
    setFileQueue((prev) => [
      ...prev,
      {
        file: currentFormFile,
        communityFolderId: targetFolderId || null,
        title: titleTrim,
        description: uploadFileDescription.trim() || undefined,
      },
    ]);
    setDirty(true);
    setCurrentFormFile(null);
    setUploadFileTitle('');
    setUploadFileDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadClear = () => {
    setCurrentFormFile(null);
    setUploadFileTitle('');
    setUploadFileDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteFile = async () => {
    if (!deleteFileTarget || !communityId) return;
    const fileId = deleteFileTarget._id;
    try {
      await api(`/admin/communities/${communityId}/files/${fileId}`, { method: 'DELETE' });
      setExistingFiles((prev) => prev.filter((f) => f._id !== fileId));
      addToast('File deleted.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete file', 'error');
    } finally {
      setDeleteFileTarget(null);
    }
  };

  const handleDeploy = async () => {
    if (!name.trim()) {
      addToast('Display name is required', 'error');
      return;
    }
    setSaving(true);
    setError('');
    setDirty(false);
    try {
      let cId = communityId;
      if (!isEdit) {
        const created = await api('/admin/communities', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            coverUrl: coverUrl && !coverFile ? coverUrl : null,
            tags,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        cId = created._id;
        if (coverFile) {
          const fd = new FormData();
          fd.append('cover', coverFile);
          await apiForm(`/admin/communities/${cId}/cover`, fd, { method: 'POST' });
        }
        const sortedFolders = getFoldersInTreeOrder(folders);
        const tempToReal = {};
        for (const f of sortedFolders) {
          const parentId = f.parentId ? tempToReal[f.parentId] ?? null : null;
          const res = await api(`/admin/communities/${cId}/folders`, {
            method: 'POST',
            body: JSON.stringify({ name: f.name, parentId }),
            headers: { 'Content-Type': 'application/json' },
          });
          tempToReal[f._id] = res._id;
        }
        for (const item of fileQueue) {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('communityFolderId', item.communityFolderId ? tempToReal[item.communityFolderId] ?? '' : '');
          formData.append('title', (item.title || item.file?.name || '').trim() || 'Untitled');
          formData.append('description', item.description || '');
          await apiForm(`/admin/communities/${cId}/files`, formData, { method: 'POST' });
        }
        addToast('Community created successfully.', 'success');
      } else {
        await api(`/admin/communities/${cId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            coverUrl: coverFile ? undefined : coverUrl,
            tags,
          }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (coverFile) {
          const fd = new FormData();
          fd.append('cover', coverFile);
          await apiForm(`/admin/communities/${cId}/cover`, fd, { method: 'POST' });
        }
        for (const item of fileQueue) {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('communityFolderId', item.communityFolderId || '');
          formData.append('title', (item.title || item.file?.name || '').trim() || 'Untitled');
          formData.append('description', item.description || '');
          await apiForm(`/admin/communities/${cId}/files`, formData, { method: 'POST' });
        }
        if (fileQueue.length > 0) addToast('Community updated and files uploaded.', 'success');
        else addToast('Community updated.', 'success');
      }
      navigate('/admin/communities');
    } catch (err) {
      setError(err.message || 'Failed to save community');
      addToast(err.message || 'Failed to save community', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (dirty) setDiscardConfirm(true);
    else navigate('/admin/communities');
  };

  const confirmDiscard = () => {
    setDiscardConfirm(false);
    navigate('/admin/communities');
  };

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

  if (error && isEdit) {
    return (
      <div className="admin-page p-4">
        <div className="alert alert-danger d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span>{error}</span>
          <Link to="/admin/communities" className="btn btn-sm btn-outline-danger">
            Back to Communities
          </Link>
        </div>
      </div>
    );
  }

  const queueTotalBytes = fileQueue.reduce((acc, q) => acc + (q.file?.size ?? 0), 0);
  const queueTotalMB = (queueTotalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="admin-page p-4">
      <nav aria-label="breadcrumb" className="mb-2">
        <ol className="breadcrumb small mb-0">
          <li className="breadcrumb-item"><Link to="/admin/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item"><Link to="/admin/communities">Communities</Link></li>
          <li className="breadcrumb-item active" aria-current="page">
            {isEdit ? 'Edit Community' : 'Setup New Community'}
          </li>
        </ol>
      </nav>
      <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">Advanced Community Setup</h1>
          <p className="text-muted small mb-0">
            Configure identity, folder hierarchies, and seed initial files.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleDiscard}
            disabled={saving}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDeploy}
            disabled={saving || !name.trim()}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" aria-hidden />
                Deploying…
              </>
            ) : (
              <>Deploy Community</>
            )}
          </button>
        </div>
      </div>

      {error && !isEdit && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="admin-card card mb-4">
            <div className="card-header bg-light">
              <h2 className="h6 mb-0 text-uppercase fw-bold">Community Identity</h2>
            </div>
            <div className="card-body">
              <label className="form-label small fw-semibold">Banner &amp; Cover Art</label>
              <div
                className="border border-2 border-dashed rounded p-4 text-center mb-3"
                style={{ aspectRatio: '21/9', minHeight: 100 }}
              >
                {coverUrl ? (
                  <div className="position-relative h-100 w-100 rounded overflow-hidden">
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      className="w-100 h-100 object-fit-cover"
                    />
                  </div>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                    <span className="mb-2">Click to upload banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="d-none"
                      id="cover-upload"
                      onChange={handleCoverChange}
                    />
                    <label htmlFor="cover-upload" className="btn btn-sm btn-outline-primary mb-0">
                      Upload
                    </label>
                  </div>
                )}
                {coverUrl && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="d-none"
                      id="cover-upload-2"
                      onChange={handleCoverChange}
                    />
                    <label htmlFor="cover-upload-2" className="btn btn-sm btn-outline-secondary mt-2">
                      Change
                    </label>
                  </>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Display Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Engineering Scholars 2025"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty(true); setError(''); }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Classification Tags</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add tags…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={addTag}>
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="badge bg-primary d-inline-flex align-items-center gap-1"
                      >
                        {t}
                        <button
                          type="button"
                          className="btn btn-link p-0 border-0 text-white small"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => removeTag(t)}
                          aria-label={`Remove ${t}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label small fw-semibold">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Define the purpose of this community space…"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setDirty(true); }}
                />
              </div>
            </div>
          </div>

          <div className="admin-card card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0 text-uppercase fw-bold">Folders</h2>
              <span className="badge bg-secondary">Root-level only</span>
            </div>
            <div className="card-body">
              <div className="d-flex gap-2 mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="New folder name…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFolder())}
                />
                <button type="button" className="btn btn-primary" onClick={addFolder}>
                  Add folder
                </button>
              </div>
              <div className="small">
                {folders.length === 0 ? (
                  <p className="text-muted mb-0">No folders yet. Add one above.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {[...folders]
                      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                      .map((f) => {
                        const isEditing = editingFolderId === f._id;
                        return (
                          <li key={f._id} className="d-flex align-items-center gap-2 py-1 px-2 rounded hover-bg-light mb-1">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={editingFolderName}
                                  onChange={(e) => setEditingFolderName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') updateFolder();
                                    if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName(''); }
                                  }}
                                  autoFocus
                                />
                                <button type="button" className="btn btn-sm btn-primary" onClick={updateFolder}>
                                  Save
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingFolderId(null); setEditingFolderName(''); }}>
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-muted small">{f.name}</span>
                                <button type="button" className="btn btn-link btn-sm p-0 ms-auto" onClick={() => { setEditingFolderId(f._id); setEditingFolderName(f.name); }} aria-label={`Edit ${f.name}`}>
                                  Edit
                                </button>
                                <button type="button" className="btn btn-link btn-sm p-0 text-danger" onClick={() => setDeleteFolderTarget(f)} aria-label={`Delete ${f.name}`}>
                                  Delete
                                </button>
                              </>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <section id="upload-section" className="upload-file-section edura-card p-4">
            <h2 className="upload-file-title">
              <span className="upload-file-title-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
              </span>
              Upload File
            </h2>
            <form className="edura-form" onSubmit={handleAddToQueue}>
              <div className="upload-file-layout">
                <div
                  className={`upload-file-dropzone ${dropzoneDragging ? 'upload-file-dropzone-dragover' : ''}`}
                  onDragOver={handleUploadDropzoneDragOver}
                  onDragLeave={handleUploadDropzoneDragLeave}
                  onDrop={handleUploadDropzoneDrop}
                >
                  <input
                    ref={fileInputRef}
                    id="admin-community-upload-file"
                    type="file"
                    accept=".pdf,application/pdf,.jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => handleUploadFileChange(e.target.files?.[0] || null)}
                    aria-label="Choose file"
                  />
                  <label htmlFor="admin-community-upload-file" className="upload-file-dropzone-label">
                    <span className="upload-file-dropzone-icon" aria-hidden>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                      </svg>
                    </span>
                    <span className="upload-file-dropzone-text">Click to upload or drag and drop</span>
                    <span className="upload-file-dropzone-hint">PDF, PNG, JPG up to 10MB</span>
                  </label>
                  {currentFormFile && (
                    <p className="upload-file-dropzone-selected small mb-0">
                      Selected: {currentFormFile.name}
                    </p>
                  )}
                </div>
                <div className="upload-file-form-column">
                  <div className="upload-file-field">
                    <label htmlFor="admin-community-upload-title" className="form-label small">Title (required)</label>
                    <input
                      id="admin-community-upload-title"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Chapter 4 Summary"
                      value={uploadFileTitle}
                      onChange={(e) => setUploadFileTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="upload-file-field">
                    <label id="admin-community-upload-folder-label" className="form-label small">Folder</label>
                    <FolderTreeSelect
                      id="admin-community-upload-folder"
                      labelId="admin-community-upload-folder-label"
                      folders={folders}
                      value={targetFolderId}
                      onChange={setTargetFolderId}
                      className="form-select-sm"
                    />
                  </div>
                  <div className="upload-file-field upload-file-description">
                    <label htmlFor="admin-community-upload-description" className="form-label small">Description (optional)</label>
                    <textarea
                      id="admin-community-upload-description"
                      className="form-control form-control-sm upload-description-input"
                      placeholder="Optional description for this file"
                      rows={3}
                      value={uploadFileDescription}
                      onChange={(e) => setUploadFileDescription(e.target.value)}
                    />
                  </div>
                  <div className="upload-file-actions">
                    <button type="button" className="btn btn-upload-clear" onClick={handleUploadClear}>
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="btn btn-upload-primary"
                      disabled={!currentFormFile || !uploadFileTitle.trim()}
                    >
                      Upload File
                    </button>
                  </div>
                </div>
              </div>
            </form>
            <div className="flex-grow-1 overflow-auto mt-4">
              {fileQueue.length === 0 ? (
                <p className="text-muted small mb-0">No files queued. Add files above.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {fileQueue.map((item, idx) => (
                    <li
                      key={idx}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center gap-2 truncate">
                        <span className="text-muted small">
                          {item.file.size != null
                            ? (item.file.size / 1024).toFixed(1) + ' KB'
                            : '—'}
                        </span>
                        <span className="fw-bold text-truncate">{item.title || item.file.name}</span>
                        <span className="badge bg-primary small">
                          {getFolderNameById(folders, item.communityFolderId)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeFromQueue(idx)}
                        aria-label={`Remove ${item.file.name}`}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {fileQueue.length > 0 && (
              <p className="small text-muted mt-3 mb-0 text-center">
                Total files queued: {fileQueue.length} ({queueTotalMB} MB)
              </p>
            )}
          </section>

          {isEdit && (
            <section className="edura-card p-4 mt-4" aria-labelledby="existing-files-heading">
              <h2 id="existing-files-heading" className="h6 mb-3 text-uppercase fw-bold">
                Uploaded files
              </h2>
              {existingFiles.length === 0 ? (
                <p className="text-muted small mb-0">No files uploaded yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {existingFiles.map((file) => (
                    <li
                      key={file._id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div className="d-flex align-items-center gap-2 truncate min-w-0">
                        <span className="fw-bold text-truncate" title={file.title || file.originalName}>
                          {file.title || file.originalName || 'Untitled'}
                        </span>
                        <span className="badge bg-secondary small text-nowrap">
                          {getFolderNameById(folders, file.communityFolderId)}
                        </span>
                        {file.size != null && (
                          <span className="text-muted small text-nowrap">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        {file.fileUrl ? (
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                            aria-label={`View ${file.title || file.originalName}`}
                          >
                            View
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteFileTarget(file)}
                          aria-label={`Delete ${file.title || file.originalName}`}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmModal
        show={discardConfirm}
        onClose={() => setDiscardConfirm(false)}
        onConfirm={confirmDiscard}
        title="Discard changes?"
        body="You have unsaved changes. Leave without saving?"
        confirmLabel="Discard"
        variant="danger"
      />
      <ConfirmModal
        show={!!deleteFolderTarget}
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={deleteFolder}
        title="Delete folder?"
        body={
          deleteFolderTarget ? (
            <p className="mb-0">
              Delete &quot;{deleteFolderTarget.name}&quot;? Files in this folder will be moved to root.
            </p>
          ) : null
        }
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmModal
        show={!!deleteFileTarget}
        onClose={() => setDeleteFileTarget(null)}
        onConfirm={handleDeleteFile}
        title="Delete file?"
        body={
          deleteFileTarget ? (
            <p className="mb-0">
              Delete &quot;{deleteFileTarget.title || deleteFileTarget.originalName || 'this file'}&quot;? This cannot be undone.
            </p>
          ) : null
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
