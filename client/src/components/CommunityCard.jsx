import { Link } from 'react-router-dom';

export default function CommunityCard({ community }) {
  const { _id, name, description, coverUrl, fileCount } = community ?? {};
  return (
    <div className="community-card h-100 d-flex flex-column">
      <div className="community-card-cover">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="community-card-cover-img" />
        ) : (
          <div className="community-card-cover-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        )}
      </div>
      <div className="community-card-body flex-grow-1 d-flex flex-column p-3">
        <h3 className="community-card-title mb-1">{name}</h3>
        <p className="community-card-desc small mb-2 flex-grow-1" title={description}>
          {description ? (description.length > 75 ? description.slice(0, 75) + '…' : description) : 'No description.'}
        </p>
        <div className="community-card-stats small mb-2" style={{ color: 'var(--edura-text-muted)' }}>
          <span>{fileCount ?? 0} resources</span>
        </div>
        <Link to={`/community/${_id}`} className="btn btn-sm btn-primary mt-auto" style={{ borderRadius: '8px' }}>
          Enter Community →
        </Link>
      </div>
    </div>
  );
}
