import React, { useState } from 'react';
import { BookMarked, ChevronRight, Trash2, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

interface GateNoteListProps {
  sections: { id: string; title: string; notes: any[] }[];
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  handleSelectNote: (note: any) => void;
  viewMode?: 'grid' | 'list';
  currentUser?: any;
  refreshSpaces?: () => void;
}

export default function GateNoteList({
  sections,
  bookmarks,
  toggleBookmark,
  handleSelectNote,
  viewMode = 'grid',
  currentUser,
  refreshSpaces
}: GateNoteListProps) {
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [votesMap, setVotesMap] = useState<Record<string, { score: number; userVote: number }>>({}); 

  const getScore = (note: any) => {
    if (votesMap[note._id || note.id]) return votesMap[note._id || note.id].score;
    return (note.votes || []).reduce((s: number, v: any) => s + v.value, 0);
  };

  const getUserVote = (note: any) => {
    if (votesMap[note._id || note.id]) return votesMap[note._id || note.id].userVote;
    if (!currentUser || !note.votes) return 0;
    const v = note.votes.find((v: any) => (v.userId?._id || v.userId) === currentUser._id);
    return v ? v.value : 0;
  };

  const handleVote = async (e: React.MouseEvent, noteId: string, value: number) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      const res = await api('/community-spaces/vote', { method: 'POST', body: JSON.stringify({ noteId, value }), headers: { 'Content-Type': 'application/json' } });
      setVotesMap(prev => ({ ...prev, [noteId]: { score: (res as any).score, userVote: (res as any).userVote } }));
    } catch (err) { console.error('Vote failed:', err); }
  };

  const handleRemove = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this file from the community? It will still be available in your personal Manage space.")) return;
    
    setRemovingId(noteId);
    try {
      await api(`/notes/${noteId}/uncontribute`, { method: 'PUT' });
      if (refreshSpaces) refreshSpaces();
    } catch (err) {
      console.error(err);
      alert("Failed to remove note.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="d-flex flex-column gap-5">
      {sections.map((section) => (
        <section key={section.id} id={section.id} style={{ scrollMarginTop: '6rem' }}>
          <div className="d-flex align-items-center mb-4">
            {section.id === 'bookmarks' && <BookMarked size={20} className="me-2 text-primary" />}
            <h3 className="h5 fw-bold mb-0" style={{ color: 'var(--edura-text)' }}>{section.title}</h3>
            <div className="flex-grow-1 ms-4 border-top"></div>
          </div>
          
          <div className={viewMode === 'grid' ? "row g-4" : "d-flex flex-column gap-3"}>
            {section.notes.map((note: any) => (
              <div key={note.id || note._id} className={viewMode === 'grid' ? "col-12 col-md-6 col-lg-4" : "col-12"}>
                <div 
                  className={`card shadow-sm border-0 h-100 p-4 cursor-pointer position-relative ${viewMode === 'list' ? 'd-flex flex-column flex-md-row align-items-md-center gap-4' : 'd-flex flex-column'}`}
                  style={{ background: 'var(--edura-card-bg)' }}
                  onClick={() => handleSelectNote(note)}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(note.id || note._id as string);
                    }}
                    className={`position-absolute top-0 end-0 mt-3 me-3 p-2 rounded-circle border-0 transition-colors d-flex align-items-center justify-content-center ${
                      bookmarks.includes(note.id || note._id as string) 
                        ? "bg-primary text-white" 
                        : "btn btn-outline-secondary p-1"
                    }`}
                    style={{ width: '32px', height: '32px', zIndex: 2 }}
                  >
                    <BookMarked size={16} />
                  </button>

                  <div className={viewMode === 'list' ? 'flex-grow-1 min-w-0 pr-5' : 'flex-grow-1 min-w-0'}>
                    <h4 className="fw-bold mb-2 h6 pe-4 transition-colors text-truncate" style={{ color: 'var(--edura-text)' }}>
                      {note.title}
                    </h4>
                    <p className={`small mb-4 text-truncate ${viewMode === 'list' ? 'mb-0' : 'line-clamp-2'}`} style={{ color: 'var(--edura-text-muted)' }}>
                      {note.description || "No description provided."}
                    </p>
                  </div>
                  
                  <div className={`${viewMode === 'list' ? 'd-flex flex-wrap align-items-center justify-content-between gap-3 ms-md-auto flex-shrink-0 mt-3 mt-md-0 border-top border-md-0 pt-3 pt-md-0 w-100 w-md-auto' : 'mt-auto pt-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2'}`}>
                    {(note as any).userId ? (
                      <div 
                        className="d-flex align-items-center gap-2 cursor-pointer transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          const id = typeof (note as any).userId === 'string' ? (note as any).userId : (note as any).userId._id;
                          if (id) navigate(`/profile/${id}`);
                        }}
                        style={{ opacity: 0.9 }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '0.9'}
                      >
                        <img 
                          src={(note as any).userId.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'} 
                          alt="avatar" 
                          className="rounded-circle border"
                          style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                          onError={(e) => e.currentTarget.src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                        />
                        <span className="small fw-medium" style={{ color: 'var(--edura-text)' }}>
                          {(note as any).userId.name || 'User'}
                        </span>
                      </div>
                    ) : (
                      <span className="small" style={{ color: 'var(--edura-text-muted)' }}>
                        {note.status === 'pending' ? 'Pending' : 'Approved'}
                      </span>
                    )}
                    
                    <div className="d-flex align-items-center gap-3 ms-auto">
                      {currentUser && (note as any).userId && (
                        (typeof (note as any).userId === 'string' ? (note as any).userId : (note as any).userId._id) === currentUser._id
                      ) && (
                        <button 
                          onClick={(e) => handleRemove(e, note.id || note._id)}
                          disabled={removingId === (note.id || note._id)}
                          className="btn btn-sm btn-outline-danger border-0 d-flex align-items-center p-1 px-2 transition-colors"
                          title="Remove from Community"
                        >
                          {removingId === (note.id || note._id) ? <Loader2 size={14} className="spinner-border spinner-border-sm" /> : <Trash2 size={14} />}
                          <span className="small ms-1 d-none d-sm-inline">Remove</span>
                        </button>
                      )}
                      
                      <div className="d-flex align-items-center gap-1 me-2">
                        <button
                          className={`btn btn-sm p-1 border-0 ${getUserVote(note) === 1 ? 'text-success' : 'text-muted'}`}
                          onClick={(e) => handleVote(e, note._id || note.id, getUserVote(note) === 1 ? 0 : 1)}
                          title="Upvote"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <span className="small fw-bold" style={{ minWidth: '20px', textAlign: 'center', color: getScore(note) > 0 ? 'var(--edura-primary)' : getScore(note) < 0 ? '#dc3545' : 'var(--edura-text-muted)' }}>
                          {getScore(note)}
                        </span>
                        <button
                          className={`btn btn-sm p-1 border-0 ${getUserVote(note) === -1 ? 'text-danger' : 'text-muted'}`}
                          onClick={(e) => handleVote(e, note._id || note.id, getUserVote(note) === -1 ? 0 : -1)}
                          title="Downvote"
                        >
                          <ThumbsDown size={14} />
                        </button>
                      </div>

                      <button 
                        className="btn btn-sm btn-edura d-flex align-items-center px-3 flex-shrink-0 text-nowrap"
                        onClick={(e) => { e.stopPropagation(); handleSelectNote(note); }}
                      >
                        View <ChevronRight size={14} className="ms-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
