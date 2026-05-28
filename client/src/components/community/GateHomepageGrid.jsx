import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Compass, Check, Users, FileText, Sparkles } from 'lucide-react';
import CommunityIcon from './CommunityIcon';

// Hardcoded default categories are removed; categories are now dynamically derived from spaces

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
          <div className="d-flex align-items-end justify-content-end position-relative" style={{ height: '80px', background: getColor(space.color) }}>
            <span className="badge border m-3 fw-normal" style={{ background: 'var(--edura-card-bg)', color: 'var(--edura-text)' }}>
              {space.category || 'General'}
            </span>
          </div>

          <div className="card-body p-4 pt-0 d-flex flex-column flex-grow-1 position-relative">
            {/* The overlapping icon */}
            <div 
              className="position-absolute top-0 start-0 ms-4 translate-middle-y d-flex align-items-center justify-content-center rounded-3 shadow-sm border border-edura" 
              style={{ width: '56px', height: '56px', background: 'var(--edura-bg)', zIndex: 10 }}
            >
              <CommunityIcon name={space.icon} size={28} style={{ color: getColor(space.color) }} />
            </div>

            <div className="d-flex flex-wrap justify-content-between align-items-start mb-2 gap-2 mt-4 pt-2">
              <h3 className="h6 fw-bold mb-0 text-break" style={{ color: 'var(--edura-text)', paddingRight: '0.5rem' }}>{space.name}</h3>
              {isJoined && (
                <span className="badge bg-success bg-opacity-10 text-success border border-success d-flex align-items-center gap-1 flex-shrink-0">
                  <Check size={10} strokeWidth={3} /> Member
                </span>
              )}
            </div>
            
            <p className="small mb-4 flex-grow-1 mt-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--edura-text-muted)' }}>
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
                className={`btn btn-sm fw-semibold px-3 rounded ${
                  isJoined 
                    ? 'btn-outline-secondary' 
                    : 'btn-outline-primary'
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
      
      <div className="mb-5 text-center text-md-start">
        <h1 className="display-5 mb-3 text-edura" style={{ fontWeight: 700 }}>
          Community Spaces
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
            className="form-control border-0 py-2 bg-transparent shadow-none community-search-input"
            style={{ fontFamily: 'var(--edura-font)' }}
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
              className={`btn btn-sm fw-medium px-3 py-1 rounded ${
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
            <div className="d-inline-flex p-3 rounded-4 bg-edura-card shadow-sm border border-edura mb-3 text-edura-muted">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h4 className="fw-bold mb-2 text-edura">No communities found</h4>
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
