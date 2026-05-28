import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

export default function ContributeModal({ isOpen, onClose, selectedSubject }) {
  const [userNotes, setUserNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');

  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchNotes = async () => {
        setLoadingNotes(true);
        try {
          // Fetch up to 100 notes
          const res = await api('/notes?limit=100');
          setUserNotes(res.notes || []);
        } catch (err) {
          console.error('Failed to load notes', err);
        } finally {
          setLoadingNotes(false);
        }
      };
      fetchNotes();

      // Reset form
      setSelectedNoteId('');
      setTitle('');
      setDescription('');
      setTopic('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  // Auto-fill title/description when a note is selected
  useEffect(() => {
    if (selectedNoteId) {
      const note = userNotes.find(n => n._id === selectedNoteId);
      if (note) {
        setTitle(note.title || '');
        setDescription(note.description || '');
      }
    }
  }, [selectedNoteId, userNotes]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !selectedNoteId) return;

    setLoading(true);
    setError('');

    try {
      await api(`/notes/${selectedNoteId}/contribute`, {
        method: 'PUT',
        body: JSON.stringify({
          communitySpaceId: selectedSubject.id,
          communityTopic: topic,
          title,
          description
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      setSuccess(true);

    } catch (err) {
      setError(err.message || 'Failed to submit note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)' }}>
            <div className="modal-header border-bottom d-flex justify-content-between align-items-center" style={{ background: 'var(--edura-bg)' }}>
              <h5 className="modal-title d-flex align-items-center gap-2 mb-0">
                <Upload className="text-primary" size={20} />
                Contribute Note
              </h5>
              <button type="button" className="btn btn-outline-secondary rounded-circle p-2 border-0" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="p-5 text-center">
                <div className="d-flex align-items-center justify-content-center mx-auto mb-4 bg-success bg-opacity-10 text-success rounded-circle" style={{ width: '64px', height: '64px' }}>
                  <Upload size={32} />
                </div>
                <h3 className="h5 fw-bold mb-2" style={{ color: 'var(--edura-text)' }}>File Submitted!</h3>
                <p className="small mb-4" style={{ color: 'var(--edura-text-muted)' }}>Your note has been sent for review to {selectedSubject?.name} and is pending admin approval.</p>
                <button className="btn btn-primary px-4" onClick={onClose}>Okay, Wait</button>
              </div>
            ) : (
              <div className="modal-body p-4">
                {error && <div className="alert alert-danger p-2 small">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold" style={{ color: 'var(--edura-text)' }}>Select Note from Manage Space *</label>
                    <select
                      className="form-select border"
                      style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      required
                      disabled={loadingNotes}
                    >
                      <option value="" disabled className="text-muted">
                        {loadingNotes ? 'Loading your notes...' : 'Select a Note'}
                      </option>
                      {userNotes.filter(n => !n.communitySpaceId).map((n) => (
                        <option key={n._id} value={n._id} style={{ color: 'var(--edura-text)' }}>
                          {n.title}
                        </option>
                      ))}
                    </select>
                    {!loadingNotes && userNotes.filter(n => !n.communitySpaceId).length === 0 && (
                      <div className="form-text text-danger small mt-1">
                        You don't have any un-contributed notes. Please upload a file in the Manage page first.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold" style={{ color: 'var(--edura-text)' }}>Title *</label>
                    <input
                      type="text"
                      className="form-control border"
                      style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}
                      value={title || ''}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Trees and Graphs Overview"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold" style={{ color: 'var(--edura-text)' }}>Topic</label>
                    <select
                      className="form-select border"
                      style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}
                      value={topic || ''}
                      onChange={(e) => setTopic(e.target.value)}
                      required
                    >
                      <option value="" disabled className="text-muted">Select a Topic</option>
                      {selectedSubject?.topics?.map((t, idx) => (
                        <option key={idx} value={t.title || t} style={{ color: 'var(--edura-text)' }}>{t.title || t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold" style={{ color: 'var(--edura-text)' }}>Description (Optional)</label>
                    <textarea
                      className="form-control border"
                      style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}
                      rows="2"
                      value={description || ''}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief summary..."
                    ></textarea>
                  </div>

                  <div className="d-grid mt-4">
                    <button type="submit" className="btn btn-primary d-flex align-items-center justify-content-center gap-2" disabled={loading}>
                      {loading && <Loader2 className="spinner-border spinner-border-sm" size={16} />}
                      {loading ? 'Submitting...' : 'Submit for Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
