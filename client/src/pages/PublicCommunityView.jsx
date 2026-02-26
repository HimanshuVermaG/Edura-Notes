import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';

const RECENT_FILES_COUNT = 8;

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

function formatSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return (i === 0 ? v : v.toFixed(1)) + ' ' + units[i];
}

function getFileTypeStyle(mimeType, originalName) {
  const m = (mimeType || '').toLowerCase();
  const ext = (originalName || '').toLowerCase().split('.').pop();
  if (m.includes('pdf') || ext === 'pdf') return { type: 'pdf', label: 'PDF', icon: 'picture_as_pdf', color: 'community-file-icon-pdf' };
  if (m.includes('word') || m.includes('document') || ['doc', 'docx'].includes(ext)) return { type: 'doc', label: 'Doc', icon: 'description', color: 'community-file-icon-doc' };
  if (m.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { type: 'image', label: 'Image', icon: 'image', color: 'community-file-icon-image' };
  if (m.includes('powerpoint') || m.includes('presentation') || ['ppt', 'pptx'].includes(ext)) return { type: 'ppt', label: 'PPT', icon: 'slideshow', color: 'community-file-icon-ppt' };
  return { type: 'file', label: 'File', icon: 'description', color: 'community-file-icon-default' };
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

export default function PublicCommunityView() {
  const { id } = useParams();
  const [community, setCommunity] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCommunity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await api(`/public/communities/${id}`);
      setCommunity(data);
      setFolders(data.folders || []);
      setFiles(data.files || []);
    } catch (err) {
      setError(err.message || 'Failed to load community');
      setCommunity(null);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  const recentFiles = useMemo(() => {
    return [...files]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, RECENT_FILES_COUNT);
  }, [files]);

  const rootFolders = useMemo(() => folders.filter((f) => !f.parentId), [folders]);

  const folderStats = useMemo(() => {
    const stats = {};
    folders.forEach((folder) => {
      const folderFiles = files.filter((f) => f.communityFolderId && String(f.communityFolderId) === String(folder._id));
      let totalSize = 0;
      let lastUpdated = null;
      folderFiles.forEach((f) => {
        if (f.size) totalSize += f.size;
        const t = f.updatedAt || f.createdAt;
        if (t && (!lastUpdated || new Date(t) > new Date(lastUpdated))) lastUpdated = t;
      });
      stats[String(folder._id)] = { count: folderFiles.length, totalSize, lastUpdated };
    });
    return stats;
  }, [folders, files]);

  const rootFiles = useMemo(() => files.filter((f) => !f.communityFolderId), [files]);
  const rootStats = useMemo(() => {
    let totalSize = 0;
    let lastUpdated = null;
    rootFiles.forEach((f) => {
      if (f.size) totalSize += f.size;
      const t = f.updatedAt || f.createdAt;
      if (t && (!lastUpdated || new Date(t) > new Date(lastUpdated))) lastUpdated = t;
    });
    return { count: rootFiles.length, totalSize, lastUpdated };
  }, [rootFiles]);

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

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

  return (
    <Layout>
      <div className="community-view-wrap">
        <div className="container py-4">
          <nav className="community-breadcrumb mb-3" aria-label="Breadcrumb">
            <Link to="/explore" className="community-breadcrumb-link">Home</Link>
            <span className="community-breadcrumb-sep" aria-hidden>/</span>
            <Link to="/community" className="community-breadcrumb-link">Community Discovery</Link>
            <span className="community-breadcrumb-sep" aria-hidden>/</span>
            <span className="community-breadcrumb-current">{community.name}</span>
          </nav>

          <Link to="/community" className="btn btn-sm btn-outline-secondary mb-3">
            ← Back to Community Discovery
          </Link>

          {/* Hero card */}
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
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-2">
                  <div>
                    <h1 className="community-profile-hero-title">{community.name}</h1>
                    <div className="community-profile-stats">
                      <span className="community-profile-stat">
                        <span className="community-profile-stat-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                        </span>
                        — Members
                      </span>
                      <span className="community-profile-stat">
                        <span className="community-profile-stat-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><path d="M2 7v10M6 7v10M10 7v10M14 7v10M18 7v10M22 7v10" /></svg>
                        </span>
                        <strong>{files.length}</strong> Files
                      </span>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary community-profile-btn-share" onClick={handleShare}>
                      <span className="community-profile-btn-icon" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" /></svg></span>
                      Share
                    </button>
                    <span className="btn btn-sm btn-edura community-profile-btn-join">Join</span>
                  </div>
                </div>
                {community.description && (
                  <p className="community-profile-hero-desc">{community.description}</p>
                )}
                {community.tags?.length > 0 && (
                  <div className="community-profile-tags">
                    {community.tags.map((tag) => (
                      <span key={tag} className="community-profile-tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <section className="community-profile-section mb-5">
            <h2 className="community-profile-section-title">
              <span className="community-profile-section-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
              </span>
              Recent Activity
            </h2>
            {recentFiles.length === 0 ? (
              <p className="text-muted mb-0">No recent files.</p>
            ) : (
              <div className="community-recent-grid">
                {recentFiles.map((file) => (
                  <Link
                    key={file._id}
                    to={`/community/${community._id}/file/${file._id}`}
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

          {/* All Folders */}
          <section className="community-profile-section">
            <h2 className="community-profile-section-title">
              <span className="community-profile-section-icon" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              </span>
              All Folders
            </h2>
            {rootFolders.length === 0 && rootStats.count === 0 ? (
              <p className="text-muted mb-0">No folders in this community yet.</p>
            ) : (
              <div className="community-folders-grid">
                {rootStats.count > 0 && (
                  <Link to={`/community/${community._id}/folder/root`} className="community-folder-card edura-card text-decoration-none">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="community-folder-icon-box">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                      </span>
                    </div>
                    <h3 className="community-folder-card-title">Uncategorized</h3>
                    <p className="community-folder-card-meta">{rootStats.count} items • {formatSize(rootStats.totalSize)}</p>
                    <div className="community-folder-card-footer">
                      <span className="community-folder-card-updated">Updated {relativeTime(rootStats.lastUpdated)}</span>
                    </div>
                  </Link>
                )}
                {rootFolders.map((folder) => {
                  const stats = folderStats[String(folder._id)] || { count: 0, totalSize: 0, lastUpdated: null };
                  return (
                    <Link key={folder._id} to={`/community/${community._id}/folder/${folder._id}`} className="community-folder-card edura-card text-decoration-none">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <span className="community-folder-icon-box">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                        </span>
                      </div>
                      <h3 className="community-folder-card-title">{folder.name}</h3>
                      <p className="community-folder-card-meta">{stats.count} items • {formatSize(stats.totalSize)}</p>
                      <div className="community-folder-card-footer">
                        <span className="community-folder-card-updated">Updated {relativeTime(stats.lastUpdated)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
