import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Compass, Check, Users, FileText, Sparkles } from 'lucide-react';
import CommunityIcon from './CommunityIcon';

// Hardcoded default categories are removed; categories are now dynamically derived from spaces

// Map the admin color value (Tailwind-style) to actual CSS gradients
const COLOR_MAP = {
  'from-indigo-600 to-purple-600': 'linear-gradient(135deg, #4f46e5, #9333ea)',
  'from-amber-500 to-orange-600': 'linear-gradient(135deg, #f59e0b, #ea580c)',
  'from-violet-500 to-indigo-600': 'linear-gradient(135deg, #8b5cf6, #4f46e5)',
  'from-emerald-500 to-teal-600': 'linear-gradient(135deg, #10b981, #0d9488)',
  'from-slate-700 to-slate-900': 'linear-gradient(135deg, #334155, #0f172a)',
};
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #4f46e5, #9333ea)';

function getGradient(color) {
  return COLOR_MAP[color] || DEFAULT_GRADIENT;
}

export default function GateHomepageGrid({ 
  spaces, 
  topContributors,
  searchQuery, 
  setSearchQuery, 
  selectedCategory, 
  setSelectedCategory,
  onSelectSpace,
  joinedSpaces,
  toggleJoinSpace,
  notesCountBySpace
}) {

  const filteredSpaces = useMemo(() => {
    return spaces.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some(t => t.toLowerCase().includes(q)));

      const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [spaces, searchQuery, selectedCategory]);

  const availableCategories = useMemo(() => {
    const cats = new Set(['All']);
    spaces.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [spaces]);

  const { joinedList, exploreList } = useMemo(() => {
    const joined = [];
    const explore = [];
    filteredSpaces.forEach(space => {
      if (joinedSpaces.includes(space.id)) {
        joined.push(space);
      } else {
        explore.push(space);
      }
    });
    return { joinedList: joined, exploreList: explore };
  }, [filteredSpaces, joinedSpaces]);

  const renderSpaceCard = (space) => {
    const isJoined = joinedSpaces.includes(space.id);
    const notesCount = notesCountBySpace[space.id] || 0;

    return (
      <div key={space.id} className="col-12 col-md-6 col-lg-4">
        <div 
          className="edura-card p-0 overflow-hidden border h-100 cursor-pointer d-flex flex-column"
          onClick={() => onSelectSpace(space)}
          style={{ borderColor: 'var(--edura-border)' }}
        >
          <div className="p-4 d-flex align-items-end justify-content-between position-relative border-bottom" style={{ height: '100px', background: getGradient(space.color) }}>
            <div className="position-absolute bottom-0 start-0 m-3 d-flex align-items-center justify-content-center rounded-3 shadow-sm" style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
              <CommunityIcon name={space.icon} size={24} className="text-primary" />
            </div>
            <span className="badge border position-absolute bottom-0 end-0 m-3" style={{ background: 'rgba(255,255,255,0.85)', color: '#1f2937' }}>
              {space.category || 'General'}
            </span>
          </div>

          <div className="card-body p-4 d-flex flex-column flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-2 pb-2">
              <h3 className="h6 fw-bold mb-0" style={{ color: 'var(--edura-text)' }}>{space.name}</h3>
              {isJoined && (
                <span className="badge bg-success bg-opacity-10 text-success border border-success d-flex align-items-center gap-1">
                  <Check size={10} strokeWidth={3} /> Member
                </span>
              )}
            </div>
            
            <p className="small mb-4 flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--edura-text-muted)' }}>
              {space.description || 'No description available for this community.'}
            </p>

            <div className="d-flex align-items-center justify-content-between pt-3 border-top mt-auto">
              <div className="d-flex gap-3 small font-monospace" style={{ color: 'var(--edura-text-muted)' }}>
                <span className="d-flex align-items-center gap-1">
                  <Users size={14} className="text-secondary" />
                  {space.membersCount + (isJoined ? 1 : 0)}
                </span>
                <span className="d-flex align-items-center gap-1">
                  <FileText size={14} className="text-secondary" />
                  {notesCount} {notesCount === 1 ? 'file' : 'files'}
                </span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleJoinSpace(space.id);
                }}
                className={`btn btn-sm fw-bold px-3 rounded-pill ${
                  isJoined 
                    ? 'btn-outline-secondary' 
                    : 'btn-primary'
                }`}
              >
                {isJoined ? 'Leave' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-4" style={{ color: 'var(--edura-text)' }}>
      
      {/* Hero Banner */}
      <div className="mb-5 text-center text-md-start">
        <h1 className="display-5 fw-bold mb-3" style={{ color: 'var(--edura-text)' }}>
          Explore Communities
        </h1>
        <p className="mb-0 mx-auto mx-md-0" style={{ maxWidth: '600px', color: 'var(--edura-text-muted)' }}>
          Find your niche and connect with thousands of experts and enthusiasts. Join custom spaces, share knowledge, and publish notes.
        </p>
      </div>

      {/* Toolbar (Search & Categories) */}
      <div className="card shadow-sm border-0 p-4 mb-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4" style={{ background: 'var(--edura-card-bg)', border: '1px solid var(--edura-border)' }}>
        
        <div className="input-group flex-grow-1 shadow-sm rounded overflow-hidden" style={{ maxWidth: '500px', background: 'var(--edura-bg)' }}>
          <span className="input-group-text border-0 bg-transparent">
            <Search size={16} className="text-muted" />
          </span>
          <input
            type="text"
            placeholder="Search by community name, tag, or desc..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control border-0 py-2 bg-transparent shadow-none"
            style={{ color: 'var(--edura-text)', fontFamily: 'var(--edura-font)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-sm text-muted border-0 bg-transparent shadow-none px-3"
            >
              Clear
            </button>
          )}
          <button className="btn btn-primary px-4 fw-bold shadow-none border-0">
            Search
          </button>
        </div>

        <div className="d-flex flex-wrap gap-2 pe-2" style={{ maxHeight: '90px', overflowY: 'auto' }}>
          {availableCategories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`btn btn-sm fw-bold px-3 py-1 rounded-pill ${
                selectedCategory === category
                  ? 'btn-primary shadow-sm text-white'
                  : 'btn-outline-secondary border-0'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Top Contributors Section */}
      {topContributors && topContributors.length > 0 && (
        <div className="mb-5">
          <h2 className="h4 fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--edura-text)' }}>
            <Sparkles size={20} className="text-warning" /> Top Contributors
          </h2>
          <div className="row g-4">
            {topContributors.map(contributor => (
              <div key={contributor._id} className="col-6 col-md-3">
                <Link to={`/profile/${contributor._id}`} className="text-decoration-none">
                  <div className="edura-card card border text-center p-4 h-100 d-flex flex-column align-items-center justify-content-center" style={{ background: 'var(--edura-card-bg)', borderColor: 'var(--edura-border)' }}>
                    <img 
                      src={contributor.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name)}&background=0D8ABC&color=fff`} 
                      alt={contributor.name} 
                      className="rounded-circle mb-3 object-fit-cover shadow-sm" 
                      style={{ width: '64px', height: '64px', border: '2px solid var(--edura-border)' }}
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name)}&background=0D8ABC&color=fff`; }}
                    />
                    <h6 className="fw-bold mb-1 text-truncate w-100 hover-text-primary" style={{ color: 'var(--edura-text)' }}>{contributor.name}</h6>
                    <p className="small mb-0 fw-medium" style={{ color: 'var(--edura-text-muted)' }}>
                      {contributor.contributions} {contributor.contributions === 1 ? 'Note' : 'Notes'}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Spaces */}
      {filteredSpaces.length > 0 ? (
        <>
          {joinedList.length > 0 && (
            <div className="mb-5">
              <h4 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--edura-text)' }}>
                <Check size={20} className="text-success" /> Joined Communities
              </h4>
              <div className="row g-4">
                {joinedList.map(renderSpaceCard)}
              </div>
            </div>
          )}

          {exploreList.length > 0 && (
            <div>
              <h4 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: 'var(--edura-text)' }}>
                <Compass size={20} className="text-primary" /> Discover More
              </h4>
              <div className="row g-4">
                {exploreList.map(renderSpaceCard)}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card shadow-sm border-0 py-5 text-center" style={{ maxWidth: '400px', margin: '0 auto', background: 'var(--edura-card-bg)' }}>
          <div className="card-body">
            <div className="d-inline-flex p-3 rounded-4 bg-white shadow-sm border mb-3 text-muted">
              <Compass size={32} />
            </div>
            <h3 className="h6 fw-bold mb-2" style={{ color: 'var(--edura-text)' }}>No spaces found</h3>
            <p className="small mb-4 px-4" style={{ color: 'var(--edura-text-muted)' }}>
              Try adjusting your search criteria, selecting a different category, or wait for new spaces to be added.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="btn btn-outline-secondary btn-sm px-4"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
