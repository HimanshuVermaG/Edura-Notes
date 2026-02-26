import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, apiForm } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { buildFolderTree, getFoldersInTreeOrder } from '../../utils/folderTree';
import ConfirmModal from '../../components/ConfirmModal';

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

/** Flatten tree to [{ id, name, depth }] for dropdown. */
function flattenTreeForSelect(nodes, depth = 0) {
  const result = [];
  if (!Array.isArray(nodes)) return result;
  nodes.forEach((node) => {
    result.push({ id: node.folder._id, name: node.folder.name, depth });
    if (node.children?.length) {
      result.push(...flattenTreeForSelect(node.children, depth + 1));
    }
  });
  return result;
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
  const [newFolderParentId, setNewFolderParentId] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);

  const [targetFolderId, setTargetFolderId] = useState('');
  const [fileQueue, setFileQueue] = useState([]);
  const [dropzoneDragging, setDropzoneDragging] = useState(false);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const folderSelectOptions = useMemo(() => {
    const opts = [{ id: '', name: 'Root Directory', depth: 0 }];
    opts.push(...flattenTreeForSelect(folderTree));
    return opts;
  }, [folderTree]);

  const loadCommunity = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api(`/admin/communities/${communityId}`);
      setName(data.name || '');
      setDescription(data.description || '');
      setTags(Array.isArray(data.tags) ? [...data.tags] : []);
      setCoverUrl(data.coverUrl || null);
      setFolders(data.folders || []);
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
          body: JSON.stringify({
            name: n,
            parentId: newFolderParentId || null,
          }),
        });
        setFolders((prev) => [...prev, created]);
        setNewFolderName('');
        setNewFolderParentId('');
      } catch (err) {
        addToast(err.message || 'Failed to add folder', 'error');
        return;
      }
    } else {
      const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFolders((prev) => [
        ...prev,
        { _id: tempId, name: n, parentId: newFolderParentId || null },
      ]);
      setNewFolderName('');
      setNewFolderParentId('');
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
              <h2 className="h6 mb-0 text-uppercase fw-bold">Folder Structure</h2>
              <span className="badge bg-warning text-dark">Hierarchy Setup</span>
            </div>
            <div className="card-body">
              <div className="d-flex gap-2 mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="New folder…"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFolder())}
                />
                <select
                  className="form-select"
                  style={{ width: 'auto', maxWidth: 180 }}
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  aria-label="Parent folder"
                >
                  {folderSelectOptions.map((opt) => (
                    <option key={opt.id || 'root'} value={opt.id}>
                      {opt.depth > 0 ? '　'.repeat(opt.depth) + opt.name : opt.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-primary" onClick={addFolder}>
                  Add
                </button>
              </div>
              <div className="small">
                {folderTree.length === 0 ? (
                  <p className="text-muted mb-0">No folders yet. Add one above.</p>
                ) : (
                  <FolderTreeDisplay
                    nodes={folderTree}
                    editingFolderId={editingFolderId}
                    editingFolderName={editingFolderName}
                    onEditStart={(id, name) => {
                      setEditingFolderId(id);
                      setEditingFolderName(name);
                    }}
                    onEditSave={updateFolder}
                    onEditCancel={() => { setEditingFolderId(null); setEditingFolderName(''); }}
                    onEditNameChange={setEditingFolderName}
                    onDelete={setDeleteFolderTarget}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="admin-card card h-100">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0 text-uppercase fw-bold">File Management</h2>
              <span className="badge bg-primary">Initial Seeding</span>
            </div>
            <div className="card-body d-flex flex-column">
              <div
                className={`border border-2 border-dashed rounded p-5 text-center mb-4 ${dropzoneDragging ? 'border-primary bg-light' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <p className="fw-bold mb-1">Drag &amp; drop community files</p>
                <p className="text-muted small mb-3">Select a destination folder first</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="d-none"
                  accept={ALLOWED_EXT.join(',') + ',.pdf'}
                  multiple
                  onChange={(e) => addFilesToQueue(e.target.files)}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Explore Library
                </button>
              </div>
              <div className="mb-3">
                <span className="small text-muted text-uppercase fw-bold">Target Destination</span>
                <select
                  className="form-select form-select-sm mt-1"
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  aria-label="Target folder for new files"
                >
                  {folderSelectOptions.map((opt) => (
                    <option key={opt.id || 'root'} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-grow-1 overflow-auto">
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
                          <span className="fw-bold text-truncate">{item.file.name}</span>
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
            </div>
          </div>
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
              Delete &quot;{deleteFolderTarget.name}&quot;? Files in this folder will be moved to parent or root.
            </p>
          ) : null
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function FolderTreeDisplay({
  nodes,
  editingFolderId,
  editingFolderName,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditNameChange,
  onDelete,
  depth = 0,
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  return (
    <ul className="list-unstyled mb-0">
      {nodes.map((node) => {
        const f = node.folder;
        const isEditing = editingFolderId === f._id;
        const hasChildren = node.children?.length > 0;
        return (
          <li key={f._id} className="mb-1">
            <div
              className="d-flex align-items-center gap-2 py-1 px-2 rounded hover-bg-light"
              style={depth > 0 ? { marginLeft: depth * 16 } : {}}
            >
              {isEditing ? (
                <>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={editingFolderName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onEditSave();
                      if (e.key === 'Escape') onEditCancel();
                    }}
                    autoFocus
                  />
                  <button type="button" className="btn btn-sm btn-primary" onClick={onEditSave}>
                    Save
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onEditCancel}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="text-muted small">{f.name}</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-auto"
                    onClick={() => onEditStart(f._id, f.name)}
                    aria-label={`Edit ${f.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-danger"
                    onClick={() => onDelete(f)}
                    aria-label={`Delete ${f.name}`}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            {hasChildren && (
              <FolderTreeDisplay
                nodes={node.children}
                editingFolderId={editingFolderId}
                editingFolderName={editingFolderName}
                onEditStart={onEditStart}
                onEditSave={onEditSave}
                onEditCancel={onEditCancel}
                onEditNameChange={onEditNameChange}
                onDelete={onDelete}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
