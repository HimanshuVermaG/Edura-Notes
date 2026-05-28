import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Edit2, Trash2, CheckCircle, XCircle, FileText, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'requests'
  const [stats, setStats] = useState({ totalUsers: 0, totalNotes: 0, totalUsedBytes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Community State
  const [spaces, setSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
  
  // New/Edit Space Form State
  const initialSpaceState = { 
    name: '', code: '', description: '', topics: '',
    category: 'General', icon: 'Hash', color: 'from-indigo-600 to-purple-600',
    tags: ''
  };
  const [spaceForm, setSpaceForm] = useState(initialSpaceState);
  const [editingSpaceId, setEditingSpaceId] = useState(null);

  // Manage Files State
  const [managingFilesSpaceId, setManagingFilesSpaceId] = useState(null);
  const [communityFiles, setCommunityFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const ICONS = ['Hash', 'Code', 'Palette', 'BookOpen', 'Gamepad2', 'Heart', 'Sparkles', 'Compass', 'Briefcase', 'Music', 'Tv', 'Camera', 'Coffee', 'Globe', 'Flame'];
  const COLORS = [
    { label: 'Indigo Purple', value: 'from-indigo-600 to-purple-600' },
    { label: 'Warm Amber', value: 'from-amber-500 to-orange-600' },
    { label: 'Cyber Violet', value: 'from-violet-500 to-indigo-600' },
    { label: 'Ocean Emerald', value: 'from-emerald-500 to-teal-600' },
    { label: 'Slate Cosmic', value: 'from-slate-700 to-slate-900' }
  ];

  const ADMIN_COLOR_MAP = {
    'from-indigo-600 to-purple-600': 'linear-gradient(135deg, #4f46e5, #9333ea)',
    'from-amber-500 to-orange-600': 'linear-gradient(135deg, #f59e0b, #ea580c)',
    'from-violet-500 to-indigo-600': 'linear-gradient(135deg, #8b5cf6, #4f46e5)',
    'from-emerald-500 to-teal-600': 'linear-gradient(135deg, #10b981, #0d9488)',
    'from-slate-700 to-slate-900': 'linear-gradient(135deg, #334155, #0f172a)',
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [statsData, spacesData, categoriesData] = await Promise.all([
          api('/admin/stats'),
          api('/admin/community-spaces'),
          api('/admin/community-categories')
        ]);
        setStats(statsData);
        setSpaces(spacesData);
        setDbCategories(categoriesData || []);
      } else if (activeTab === 'requests') {
        const data = await api('/admin/community-requests');
        setRequests(data);
        setSelectedRequestIds(new Set());
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreateCategory = async () => {
    const name = window.prompt("Enter new category name:");
    if (!name?.trim()) return;
    try {
      const newCat = await api('/admin/community-categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
        headers: { 'Content-Type': 'application/json' }
      });
      setDbCategories(prev => [...prev, newCat]);
      setSpaceForm(prev => ({ ...prev, category: newCat.name }));
    } catch (err) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (e) => {
    e.preventDefault();
    const currentName = spaceForm.category;
    if (currentName === 'General') {
      alert("Cannot delete 'General' category.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the category "${currentName}"? Any spaces using it will be moved to 'General'.`)) return;
    
    try {
      await api(`/admin/community-categories/name/${encodeURIComponent(currentName)}`, { method: 'DELETE' });
      setDbCategories(prev => prev.filter(c => c.name !== currentName));
      setSpaceForm(prev => ({ ...prev, category: 'General' }));
      // Refresh spaces to reflect the category reassignment to 'General'
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleSaveSpace = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...spaceForm,
        topics: spaceForm.topics.split(',').map(t => t.trim()).filter(Boolean),
        tags: spaceForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editingSpaceId) {
        await api(`/admin/community-spaces/${editingSpaceId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        await api('/admin/community-spaces', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
      }

      setSpaceForm(initialSpaceState);
      setEditingSpaceId(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save space');
    }
  };

  const handleEditSpace = (space) => {
    setEditingSpaceId(space._id);
    setSpaceForm({
      name: space.name || '',
      code: space.code || '',
      description: space.description || '',
      category: space.category || 'General',
      icon: space.icon || 'Hash',
      color: space.color || 'from-indigo-600 to-purple-600',
      topics: (space.topics || []).join(', '),
      tags: (space.tags || []).join(', ')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSpaceId(null);
    setSpaceForm(initialSpaceState);
  };

  const handleDeleteSpace = async (id) => {
    if (!window.confirm("Are you sure you want to delete this space?")) return;
    try {
      await api(`/admin/community-spaces/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete space');
    }
  };

  const handleReviewRequest = async (id, status) => {
    try {
      await api(`/admin/community-requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleBulkReview = async (status) => {
    if (selectedRequestIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to ${status} ${selectedRequestIds.size} request(s)?`)) return;
    try {
      await api('/admin/community-requests/bulk-review', {
        method: 'PUT',
        body: JSON.stringify({ noteIds: Array.from(selectedRequestIds), status }),
        headers: { 'Content-Type': 'application/json' }
      });
      fetchData();
    } catch (err) {
      alert(err.message || `Failed to ${status} requests`);
    }
  };

  const toggleSelectRequest = (id) => {
    setSelectedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllRequests = () => {
    if (selectedRequestIds.size === requests.length) {
      setSelectedRequestIds(new Set());
    } else {
      setSelectedRequestIds(new Set(requests.map(r => r._id)));
    }
  };

  // Manage Files functions
  const handleManageFiles = async (spaceId) => {
    if (managingFilesSpaceId === spaceId) {
      setManagingFilesSpaceId(null);
      setCommunityFiles([]);
      return;
    }
    setManagingFilesSpaceId(spaceId);
    setLoadingFiles(true);
    try {
      const data = await api(`/admin/community-spaces/${spaceId}/notes`);
      setCommunityFiles(data);
    } catch (err) {
      alert(err.message || 'Failed to load community files');
      setManagingFilesSpaceId(null);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this file completely?")) return;
    try {
      await api(`/admin/notes`, { 
        method: 'DELETE',
        body: JSON.stringify({ noteIds: [noteId] }),
        headers: { 'Content-Type': 'application/json' }
      });
      setCommunityFiles(prev => prev.filter(f => f._id !== noteId));
    } catch (err) {
      alert(err.message || 'Failed to delete file');
    }
  };

  const { totalUsers, totalNotes, totalUsedBytes, dailyUsers, dailyNotes } = stats;
  const BYTES_PER_MB = 1024 * 1024;
  const totalStorageLabel = totalUsedBytes >= BYTES_PER_MB * 1024
    ? `${(totalUsedBytes / (BYTES_PER_MB * 1024)).toFixed(1)} GB`
    : `${(totalUsedBytes / BYTES_PER_MB).toFixed(1)} MB`;

  // Fill in missing dates for charts so days with 0 activity show up
  const fillMissingDates = (data) => {
    const filled = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = (data || []).find(item => item._id === dateStr);
      filled.push({ _id: dateStr, count: existing ? existing.count : 0 });
    }
    return filled;
  };

  const chartDailyUsers = fillMissingDates(dailyUsers);
  const chartDailyNotes = fillMissingDates(dailyNotes);

  return (
    <div className="admin-page">
      <div className="container py-4">
        <h1 className="h3 mb-4 fw-bold" style={{ color: 'var(--edura-text)' }}>Admin Dashboard</h1>
        
        {/* Tabs */}
        <ul className="nav nav-tabs mb-4 border-bottom">
          <li className="nav-item">
            <button 
              className={`nav-link border-0 border-bottom ${activeTab === 'overview' ? 'active border-primary text-primary fw-bold' : 'text-muted'}`}
              style={{ borderBottomWidth: activeTab === 'overview' ? '2px' : '0' }}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link border-0 border-bottom ${activeTab === 'requests' ? 'active border-primary text-primary fw-bold' : 'text-muted'}`}
              style={{ borderBottomWidth: activeTab === 'requests' ? '2px' : '0' }}
              onClick={() => setActiveTab('requests')}
            >
              Pending Contributions
            </button>
          </li>
        </ul>

        {error && <div className="alert alert-danger shadow-sm border-0">{error}</div>}

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Tab (Stats + Communities) */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Section */}
                <div className="row g-4 mb-4">
                  <div className="col-md-4">
                    <div className="card shadow-sm border h-100" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase fw-bold mb-2" style={{ fontSize: '0.8rem' }}>Total Users</h6>
                        <h2 className="display-6 fw-bold mb-0" style={{ color: 'var(--edura-text)' }}>{totalUsers}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow-sm border h-100" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase fw-bold mb-2" style={{ fontSize: '0.8rem' }}>Total Notes</h6>
                        <h2 className="display-6 fw-bold mb-0" style={{ color: 'var(--edura-text)' }}>{totalNotes}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card shadow-sm border h-100" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                      <div className="card-body">
                        <h6 className="text-muted text-uppercase fw-bold mb-2" style={{ fontSize: '0.8rem' }}>Total Storage Used</h6>
                        <h2 className="display-6 fw-bold mb-0" style={{ color: 'var(--edura-text)' }}>{totalStorageLabel}</h2>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                {(dailyUsers?.length > 0 || dailyNotes?.length > 0) && (
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <div className="card shadow-sm border h-100" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                        <div className="card-body pb-0">
                          <h6 className="text-muted text-uppercase fw-bold mb-3" style={{ fontSize: '0.8rem' }}>New Users (Last 30 Days)</h6>
                        </div>
                        <div style={{ height: '250px', padding: '0 10px 10px 0' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDailyUsers} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--edura-border)" />
                              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--edura-text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--edura-border)' }} />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--edura-text-muted)' }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: 'var(--edura-card-bg)', border: '1px solid var(--edura-border)', color: 'var(--edura-text)', fontSize: '0.8rem', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card shadow-sm border h-100" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                        <div className="card-body pb-0">
                          <h6 className="text-muted text-uppercase fw-bold mb-3" style={{ fontSize: '0.8rem' }}>Notes Uploaded (Last 30 Days)</h6>
                        </div>
                        <div style={{ height: '250px', padding: '0 10px 10px 0' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartDailyNotes} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--edura-border)" />
                              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--edura-text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--edura-border)' }} />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--edura-text-muted)' }} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ background: 'var(--edura-card-bg)', border: '1px solid var(--edura-border)', color: 'var(--edura-text)', fontSize: '0.8rem', borderRadius: '8px' }} />
                              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-5 border-bottom pb-4">
                  <Link to="/admin/users" className="btn btn-edura fw-bold shadow-sm">
                    Manage All Users
                  </Link>
                </div>

                {/* Community Spaces Section */}
                <div className="row g-5">
                  <div className="col-lg-7 order-2 order-lg-1">
                    <h3 className="h4 fw-bold mb-4" style={{ color: 'var(--edura-text)' }}>Community Spaces</h3>
                    {spaces.length === 0 ? <p className="text-muted">No community spaces created yet.</p> : (
                      <div className="d-flex flex-column gap-3" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '10px' }}>
                        {spaces.map(s => (
                          <div key={s._id} className="card shadow-sm border" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                            <div className="card-body d-flex justify-content-between align-items-start">
                              <div>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <h4 className="fw-bold h6 mb-0" style={{ color: 'var(--edura-text)' }}>{s.name}</h4>
                                  {s.code && <span className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-primary)' }}>{s.code}</span>}
                                  {s.category && <span className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>{s.category}</span>}
                                </div>
                                <p className="small text-muted mb-3">{s.description || 'No description provided.'}</p>
                                
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                  {(s.topics || []).slice(0, 3).map(t => (
                                    <span key={t} className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>{t}</span>
                                  ))}
                                  {s.topics?.length > 3 && <span className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text-muted)' }}>+{s.topics.length - 3}</span>}
                                </div>
                                
                                <div className="small text-muted font-monospace mb-3" style={{ fontSize: '0.75rem' }}>
                                  Icon: {s.icon} | Color: {s.color?.split('-')[1] || 'Default'} | Members: {s.membersCount}
                                </div>
                              </div>
                              <div className="d-flex flex-column gap-2 ms-3 min-w-120">
                                <button onClick={() => handleEditSpace(s)} className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-1 w-100">
                                  <Edit2 size={14} /> Edit
                                </button>
                                <button onClick={() => handleDeleteSpace(s._id)} className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center gap-1 w-100">
                                  <Trash2 size={14} /> Delete
                                </button>
                                <button 
                                  onClick={() => handleManageFiles(s._id)} 
                                  className={`btn btn-sm d-flex align-items-center justify-content-center gap-1 w-100 ${managingFilesSpaceId === s._id ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                >
                                  <FileText size={14} /> {managingFilesSpaceId === s._id ? 'Close Files' : 'Manage Files'}
                                </button>
                              </div>
                            </div>

                            {/* Files Section (Inline Expansion) */}
                            {managingFilesSpaceId === s._id && (
                              <div className="border-top p-3" style={{ background: 'var(--edura-bg)' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <h5 className="h6 fw-bold mb-0">Files in {s.name}</h5>
                                  <button onClick={() => setManagingFilesSpaceId(null)} className="btn btn-sm btn-light p-1">
                                    <X size={16} />
                                  </button>
                                </div>
                                
                                {loadingFiles ? (
                                  <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                                ) : communityFiles.length === 0 ? (
                                  <p className="text-muted small mb-0">No approved files in this community yet.</p>
                                ) : (
                                  <div className="list-group list-group-flush border rounded overflow-hidden">
                                    {communityFiles.map(file => (
                                      <div key={file._id} className="list-group-item d-flex justify-content-between align-items-center py-2" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)' }}>
                                        <div className="text-truncate me-3">
                                          <div className="fw-bold small" style={{ color: 'var(--edura-text)' }}>{file.title}</div>
                                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                            By {file.userId?.name || 'Unknown'} • {new Date(file.createdAt).toLocaleDateString()}
                                          </div>
                                        </div>
                                        <div className="d-flex gap-2">
                                          <a href={`/admin/view/note/${file._id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary py-0" style={{ fontSize: '0.75rem' }}>View</a>
                                          <button onClick={() => handleDeleteFile(file._id)} className="btn btn-sm btn-outline-danger py-0" style={{ fontSize: '0.75rem' }}>Delete</button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Create / Edit Form */}
                  <div className="col-lg-5 order-1 order-lg-2 mb-4 mb-lg-0">
                    <div className="card shadow-sm border sticky-top" style={{ top: '100px', background: 'var(--edura-card-bg)', borderColor: 'var(--edura-border)' }}>
                      <div className="card-body p-4">
                        <h3 className="h5 fw-bold mb-4" style={{ color: 'var(--edura-text)' }}>
                          {editingSpaceId ? 'Update Space' : 'Create New Space'}
                        </h3>
                        <form onSubmit={handleSaveSpace} className="d-flex flex-column gap-3">
                          
                          <div className="row g-3">
                            <div className="col-md-7">
                              <label className="form-label small fw-bold text-muted mb-1">Name *</label>
                              <input required value={spaceForm.name} onChange={e => setSpaceForm({...spaceForm, name: e.target.value})} className="form-control form-control-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }} placeholder="e.g. GATE CSE" />
                            </div>
                            <div className="col-md-5">
                              <label className="form-label small fw-bold text-muted mb-1">Code</label>
                              <input value={spaceForm.code} onChange={e => setSpaceForm({...spaceForm, code: e.target.value})} className="form-control form-control-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }} placeholder="e.g. CS-GATE" />
                            </div>
                          </div>

                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-bold text-muted mb-1">Category</label>
                              <div className="d-flex gap-2">
                                <select value={spaceForm.category} onChange={e => setSpaceForm({...spaceForm, category: e.target.value})} className="form-select form-select-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>
                                  {Array.from(new Set(['General', ...spaces.map(s => s.category).filter(Boolean), ...dbCategories.map(c => c.name)])).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <button type="button" onClick={handleCreateCategory} className="btn btn-sm btn-outline-primary" title="Add Category">
                                  +
                                </button>
                                {spaceForm.category !== 'General' && (
                                  <button type="button" onClick={handleDeleteCategory} className="btn btn-sm btn-outline-danger" title="Delete Category">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-bold text-muted mb-1">Icon</label>
                              <select value={spaceForm.icon} onChange={e => setSpaceForm({...spaceForm, icon: e.target.value})} className="form-select form-select-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>
                                {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="form-label small fw-bold text-muted mb-1">Color Theme</label>
                            <div className="d-flex align-items-center gap-2">
                              <select value={spaceForm.color} onChange={e => setSpaceForm({...spaceForm, color: e.target.value})} className="form-select form-select-sm flex-grow-1" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>
                                {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                              <div className="rounded" style={{ width: '32px', height: '32px', flexShrink: 0, background: ADMIN_COLOR_MAP[spaceForm.color] || 'linear-gradient(135deg, #4f46e5, #9333ea)' }}></div>
                            </div>
                          </div>

                          <div>
                            <label className="form-label small fw-bold text-muted mb-1">Topics (comma separated)</label>
                            <textarea value={spaceForm.topics} onChange={e => setSpaceForm({...spaceForm, topics: e.target.value})} className="form-control form-control-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }} placeholder="Algorithms, Data Structures..." rows={2} />
                          </div>

                          <div>
                            <label className="form-label small fw-bold text-muted mb-1">Tags (comma separated)</label>
                            <input value={spaceForm.tags} onChange={e => setSpaceForm({...spaceForm, tags: e.target.value})} className="form-control form-control-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }} placeholder="gate, preparation, 2025" />
                          </div>


                          <div>
                            <label className="form-label small fw-bold text-muted mb-1">Description</label>
                            <textarea value={spaceForm.description} onChange={e => setSpaceForm({...spaceForm, description: e.target.value})} className="form-control form-control-sm" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }} rows={2} />
                          </div>
                          
                          <div className="d-flex gap-2 mt-2">
                            <button type="submit" className="btn btn-edura btn-sm flex-grow-1 fw-bold shadow-sm">
                              {editingSpaceId ? 'Update Space' : 'Create Space'}
                            </button>
                            {editingSpaceId && (
                              <button type="button" onClick={handleCancelEdit} className="btn border btn-sm flex-grow-1 fw-bold" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h3 className="h5 fw-bold mb-0" style={{ color: 'var(--edura-text)' }}>Pending Note Contributions</h3>
                  {requests.length > 0 && (
                    <div className="d-flex align-items-center gap-2">
                      <span className="small text-muted me-2">{selectedRequestIds.size} selected</span>
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={toggleSelectAllRequests}
                      >
                        {selectedRequestIds.size === requests.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button 
                        className="btn btn-sm btn-success d-flex align-items-center gap-1"
                        onClick={() => handleBulkReview('approved')}
                        disabled={selectedRequestIds.size === 0}
                      >
                        <CheckCircle size={14} /> Approve Selected
                      </button>
                      <button 
                        className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                        onClick={() => handleBulkReview('rejected')}
                        disabled={selectedRequestIds.size === 0}
                      >
                        <XCircle size={14} /> Reject Selected
                      </button>
                    </div>
                  )}
                </div>
                
                {requests.length === 0 ? <p className="text-muted">No pending contributions at the moment.</p> : (
                  <div className="d-flex flex-column gap-3">
                    {requests.map(note => (
                      <div key={note._id} className={`card shadow-sm border ${selectedRequestIds.has(note._id) ? 'border-primary' : ''}`} style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)', borderColor: 'var(--edura-border)' }}>
                        <div className="card-body d-flex flex-column flex-md-row justify-content-between gap-4">
                          <div className="d-flex gap-3">
                            <div className="pt-1">
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                                checked={selectedRequestIds.has(note._id)}
                                onChange={() => toggleSelectRequest(note._id)}
                              />
                            </div>
                            <div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span className="badge bg-warning text-edura border border-warning">PENDING</span>
                              <span className="small text-muted">Submitted by <span className="fw-bold" style={{ color: 'var(--edura-text)' }}>{note.userId?.name || 'Unknown User'}</span></span>
                            </div>
                            <h4 className="h6 fw-bold mb-1" style={{ color: 'var(--edura-text)' }}>{note.title}</h4>
                            <p className="small text-muted mb-3 line-clamp-2">{note.description || 'No description'}</p>
                            
                            <div className="d-flex align-items-center gap-2 small">
                              <span className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>Space: {note.communitySpaceId?.name}</span>
                              <span className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>Topic: {note.communityTopic}</span>
                            </div>
                          </div>
                        </div>
                          <div className="d-flex flex-md-column gap-2 min-w-120">
                            <a 
                              href={`/admin/view/note/${note._id}`}
                              target="_blank" rel="noreferrer"
                              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
                            >
                              View File
                            </a>
                            <button 
                              onClick={() => handleReviewRequest(note._id, 'approved')}
                              className="btn btn-sm btn-success d-flex align-items-center justify-content-center gap-1"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button 
                              onClick={() => handleReviewRequest(note._id, 'rejected')}
                              className="btn btn-sm btn-danger d-flex align-items-center justify-content-center gap-1"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
