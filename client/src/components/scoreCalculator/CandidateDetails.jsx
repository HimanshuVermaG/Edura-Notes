export default function CandidateDetails({ candidate, examTitle }) {
  const entries = Object.entries(candidate || {});
  if (examTitle) entries.unshift(['Exam', examTitle]);
  if (!entries.length) return null;

  return (
    <div className="edura-card p-4">
      <h2 className="h6 fw-bold mb-3" style={{ color: 'var(--edura-text)' }}>Candidate Details</h2>
      <div className="row g-3">
        {entries.map(([k, v]) => (
          <div className="col-6 col-md-4 col-lg-3" key={k}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--edura-text-muted)', marginBottom: '2px' }}>
              {k}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--edura-text)' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
