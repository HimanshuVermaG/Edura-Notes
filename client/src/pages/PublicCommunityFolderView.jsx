import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';

function relativeTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  if (sec < 2592000) return Math.floor(sec / 86400) + 'd ago';
  if (sec < 31536000) return Math.floor(sec / 2592000) + 'w ago';
  return Math.floor(sec / 31536000) + 'y ago';
}

function getFileTypeStyle(mimeType, originalName) {
  const m = (mimeType || '').toLowerCase();
  const ext = (originalName || '').toLowerCase().split('.').pop();
  if (m.includes('pdf') || ext === 'pdf') return { color: 'community-file-icon-pdf' };
  if (m.includes('word') || m.includes('document') || ['doc', 'docx'].includes(ext)) return { color: 'community-file-icon-doc' };
  if (m.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { color: 'community-file-icon-image' };
  if (m.includes('powerpoint') || m.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return { color: 'community-file-icon-ppt' };
  return { color: 'community-file-icon-default' };
}

function FileIcon({ mimeType, originalName }) {
  const { color } = getFileTypeStyle(mimeType, originalName);
  return (
    <span className={`community-file-icon-box ${color}`} aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </span>
  );
}

export default function PublicCommunityFolderView() {
  const { id: communityId, folderId } = useParams();
  const [community, setCommunity] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!communityId) return;
    setLoading(true);
    setError('');
    api(`/public/communities/${communityId}`)
      .then((data) => {
        setCommunity(data);
        setFolders(data.folders || []);
        setFiles(data.files || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load community');
        setCommunity(null);
        setFolders([]);
        setFiles([]);
      })
      .finally(() => setLoading(false));
  }, [communityId]);

  const isRoot = folderId === 'root';
  const folderName = useMemo(() => {
    if (isRoot) return 'Uncategorized';
    const folder = folders.find((f) => String(f._id) === String(folderId));
    return folder?.name || 'Folder';
  }, [isRoot, folderId, folders]);

  const folderFiles = useMemo(() => {
    if (isRoot) return files.filter((f) => !f.communityFolderId);
    return files.filter((f) => f.communityFolderId && String(f.communityFolderId) === String(folderId));
  }, [files, isRoot, folderId]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-5">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !community) {
    return (
      <Layout>
        <div className="container py-5">
          <div className="alert alert-danger" role="alert">
            {error || 'Community not found.'}
          </div>
          <Link to="/community" className="btn btn-outline-primary">
            Back to Community Discovery
          </Link>
        </div>
      </Layout>
    );
  }

  if (!isRoot && folders.every((f) => String(f._id) !== String(folderId))) {
    return (
      <Layout>
        <div className="container py-5">
          <div className="alert alert-warning" role="alert">
            Folder not found.
          </div>
          <Link to={`/community/${communityId}`} className="btn btn-outline-primary">
            Back to community
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="community-view-wrap">
        <div className="container py-4">
          <nav className="community-breadcrumb mb-3" aria-label="Breadcrumb">
            <Link to="/explore" className="community-breadcrumb-link">Home</Link>
            <span className="community-breadcrumb-sep" aria-hidden>/</span>
            <Link to="/community" className="community-breadcrumb-link">Community Discovery</Link>
            <span className="community-breadcrumb-sep" aria-hidden>/</span>
            <Link to={`/community/${communityId}`} className="community-breadcrumb-link">{community.name}</Link>
            <span className="community-breadcrumb-sep" aria-hidden>/</span>
            <span className="community-breadcrumb-current">{folderName}</span>
          </nav>

          <Link to={`/community/${communityId}`} className="btn btn-sm btn-outline-secondary mb-3">
            ← Back to community
          </Link>

          <div className="community-profile-hero edura-card p-4 p-md-5 mb-5">
            <div className="community-profile-hero-inner">
              <div className="community-profile-avatar">
                {community.coverUrl ? (
                  <img src={community.coverUrl} alt="" className="community-profile-avatar-img" />
                ) : (
                  <div className="community-profile-avatar-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="community-profile-hero-content">
                <h1 className="community-profile-hero-title">{community.name}</h1>
                <p className="community-profile-hero-desc mb-0">Files in {folderName}</p>
              </div>
            </div>
          </div>

          <section className="community-profile-section">
            <h2 className="community-profile-section-title">
              <span className="community-profile-section-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              </span>
              Files in {folderName}
            </h2>
            {folderFiles.length === 0 ? (
              <p className="text-muted mb-0">No files in this folder.</p>
            ) : (
              <div className="community-recent-grid">
                {folderFiles.map((file) => (
                  <Link
                    key={file._id}
                    to={`/community/${communityId}/file/${file._id}`}
                    className="community-recent-card edura-card"
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <FileIcon mimeType={file.mimeType} originalName={file.originalName} />
                    </div>
                    <h3 className="community-recent-card-title">{file.title || file.originalName || 'Untitled'}</h3>
                    <p className="community-recent-card-meta">{relativeTime(file.updatedAt || file.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
