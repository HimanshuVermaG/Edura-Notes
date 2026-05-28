import React, { useState, useMemo } from 'react';
import { ArrowLeft, Users, Check, AlertCircle, PlusCircle, BookOpen, Sparkles, Grid, List as ListIcon } from 'lucide-react';
import CommunityIcon from './CommunityIcon';
import GateNoteList from './GateNoteList';

// Map the admin color value (Tailwind-style) to solid academic colors
const COLOR_MAP = {
  'from-indigo-600 to-purple-600': '#1e40af', // Navy Blue
  'from-amber-500 to-orange-600': '#b45309', // Amber Dark
  'from-violet-500 to-indigo-600': '#4338ca', // Indigo
  'from-emerald-500 to-teal-600': '#0f766e', // Teal
  'from-slate-700 to-slate-900': '#334155', // Slate
};
const DEFAULT_COLOR = '#1e40af';

function getColor(color) {
  return COLOR_MAP[color] || DEFAULT_COLOR;
}

export default function GateCommunityDetail({ 
  space, 
  onBack, 
  isJoined, 
  toggleJoinSpace, 
  onContribute,
  bookmarks,
  toggleBookmark,
  handleSelectNote,
  currentUser,
  refreshSpaces
}) {

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('edura_community_view_mode') || 'grid';
  });

  React.useEffect(() => {
    localStorage.setItem('edura_community_view_mode', viewMode);
  }, [viewMode]);

  // Process topics into sections, prepending a Bookmarks section if there are any
  const sections = useMemo(() => {
    if (!space || !space.topics) return [];
    
    // Gather all notes in this space
    const allNotes = [];
    space.topics.forEach(t => {
      if (t.notes) allNotes.push(...t.notes);
    });

    const parsedSections = [];

    space.topics.forEach(topic => {
      if (topic.notes && topic.notes.length > 0) {
        parsedSections.push({
          id: `topic-${topic.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          title: topic.title,
          notes: topic.notes
        });
      }
    });

    return parsedSections;
  }, [space, bookmarks]);

  return (
    <div className="container py-4" style={{ color: 'var(--edura-text)' }}>
      
      {/* Breadcrumbs */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={onBack}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
          >
            <ArrowLeft size={16} /> All Spaces
          </button>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="small font-monospace text-uppercase d-none d-sm-block me-2" style={{ color: 'var(--edura-text-muted)' }}>
            Browsing • {space.category || 'General'}
          </div>
          
          <div className="btn-group shadow-sm border rounded overflow-hidden" style={{ borderColor: 'var(--edura-border)', background: 'var(--edura-bg)' }}>
            <button 
              onClick={() => setViewMode('grid')}
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary border-0 text-edura'}`}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary border-0 text-edura'}`}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Header Banner - Plain */}
      <div className="card shadow-sm border mb-5 overflow-hidden" style={{ background: 'var(--edura-card-bg)', borderColor: 'var(--edura-border)' }}>
        <div className="card-body p-4 p-md-5 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4" style={{ background: getColor(space.color) }}>
          <div className="d-flex align-items-center gap-4">
            <div className="d-flex align-items-center justify-content-center rounded border shadow-sm" style={{ width: '80px', height: '80px', background: 'var(--edura-bg)' }}>
              <CommunityIcon name={space.icon} size={36} style={{ color: getColor(space.color) }} />
            </div>
            <div>
              <h2 className="display-6 fw-bold mb-2" style={{ color: '#fff' }}>
                {space.name}
              </h2>
              <div className="d-flex align-items-center gap-3 small" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <span>{space.category || 'General'} Space</span>
                <span>•</span>
                <span className="d-flex align-items-center gap-1">
                  <Users size={14} />
                  {space.membersCount + (isJoined ? 1 : 0)} members
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleJoinSpace(space.id)}
            className={`btn fw-semibold px-4 rounded shadow-sm ${
              isJoined 
                ? 'btn-outline-secondary bg-edura-card text-edura border-edura'
                : 'btn-primary'
            }`}
          >
            {isJoined ? (
              <span className="d-flex align-items-center gap-2">
                <Check size={16} strokeWidth={3} /> Joined
              </span>
            ) : '+ Join Space'}
          </button>
        </div>

        {/* Description & Tags */}
        <div className="card-footer border-top p-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4" style={{ background: 'var(--edura-card-bg)' }}>
          <p className="small mb-0" style={{ maxWidth: '800px', lineHeight: '1.6', color: 'var(--edura-text)' }}>
            {space.description || 'No description available for this community.'}
          </p>
          <div className="d-flex flex-wrap gap-2">
            {space.tags && space.tags.map(t => (
              <span key={t} className="badge border" style={{ background: 'var(--edura-bg)', color: 'var(--edura-text)' }}>
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content (2 Columns) */}
      <div className="row g-5">
        
        {/* Left Column: Guidelines & Actions */}
        <div className="col-12 col-lg-3">
          <div className="d-flex flex-column gap-4">
            

            {/* Table of Contents Sidebar */}
            {sections.length > 0 && (
              <div className="card shadow-sm border p-4 mb-4" style={{ background: 'var(--edura-card-bg)', borderColor: 'var(--edura-border)', position: 'sticky', top: '2rem' }}>
                <h4 className="small fw-bold mb-3 text-uppercase" style={{ color: 'var(--edura-text-muted)' }}>Topics</h4>
                <div className="d-flex flex-column gap-3">
                  {sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => {
                        const el = document.getElementById(section.id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="btn btn-link text-start text-decoration-none p-0 fw-medium transition-colors d-flex align-items-center gap-2"
                      style={{ color: 'var(--edura-text)', fontSize: '0.9rem' }}
                    >
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--edura-text-muted)' }}></div>
                      {section.title}
                      <span className="ms-auto small badge bg-edura-card text-edura border border-edura rounded-pill">{section.notes.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contribute Action */}
            <div className="card shadow-sm border-0 p-4 border-primary border-opacity-25" style={{ borderLeft: '4px solid #0d6efd', background: 'var(--edura-card-bg)' }}>
              <h4 className="small fw-bold mb-2" style={{ color: 'var(--edura-text)' }}>Have something to share?</h4>
              <p className="small mb-4" style={{ fontSize: '0.8rem', color: 'var(--edura-text-muted)' }}>
                Publish a note, summarize a topic, or share helpful resources with the community.
              </p>
              <button
                onClick={() => {
                  if (!isJoined) toggleJoinSpace(space.id);
                  onContribute();
                }}
                className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
              >
                <PlusCircle size={16} /> Contribute Existing Note
              </button>
              {!isJoined && (
                <p className="text-center text-muted mt-2 fst-italic mb-0" style={{ fontSize: '0.7rem' }}>
                  *Will automatically join space.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Feed (Topics & Notes) */}
        <div className="col-12 col-lg-9">
          {/* Render GateNoteList with the sections */}
          {sections.length > 0 ? (
            <GateNoteList 
              sections={sections}
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              handleSelectNote={handleSelectNote}
              viewMode={viewMode}
              currentUser={currentUser}
              refreshSpaces={refreshSpaces}
            />
          ) : (
            <div className="card shadow-sm border-0 py-5 text-center" style={{ background: 'var(--edura-card-bg)' }}>
              <p className="mb-0" style={{ color: 'var(--edura-text-muted)' }}>No resources have been shared in this space yet.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
