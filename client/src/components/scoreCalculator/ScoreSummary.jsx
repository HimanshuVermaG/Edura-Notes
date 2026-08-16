export default function ScoreSummary({ totals }) {
  const attempted = totals.correct + totals.wrong;
  const accuracy = attempted ? Math.round((totals.correct / attempted) * 1000) / 10 : 0;

  const tiles = [
    { cls: 'sc-accent', num: `${totals.score} / ${totals.maxScore}`, lbl: 'Score' },
    { cls: 'sc-good', num: totals.correct, lbl: 'Correct' },
    { cls: 'sc-critical', num: totals.wrong, lbl: 'Incorrect' },
    { cls: 'sc-muted', num: totals.unattempted, lbl: 'Unattempted' },
    { cls: 'sc-accent', num: `${accuracy}%`, lbl: 'Accuracy (attempted)' },
  ];
  if (totals.dropped) tiles.push({ cls: 'sc-muted', num: totals.dropped, lbl: 'Dropped / no key' });

  const segments = [
    { key: 'correct', label: 'Correct', value: totals.correct, color: 'var(--sc-good)' },
    { key: 'wrong', label: 'Incorrect', value: totals.wrong, color: 'var(--sc-critical)' },
    { key: 'unattempted', label: 'Unattempted', value: totals.unattempted, color: 'var(--edura-text-muted)' },
  ];
  if (totals.dropped) segments.push({ key: 'dropped', label: 'Dropped', value: totals.dropped, color: 'var(--sc-warning)' });
  const totalQuestions = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  return (
    <div className="edura-card p-4">
      <h2 className="h6 fw-bold mb-3" style={{ color: 'var(--edura-text)' }}>Score Summary</h2>
      <div className="row g-3">
        {tiles.map((t) => (
          <div className="col-6 col-md-4 col-lg" key={t.lbl}>
            <div className={`sc-stat-tile ${t.cls}`}>
              <div className="sc-stat-num">{t.num}</div>
              <div className="sc-stat-lbl">{t.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="sc-breakdown-bar" role="img" aria-label="Score breakdown by result">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className="sc-segment"
              style={{ width: `${(seg.value / totalQuestions) * 100}%`, background: seg.color }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))}
        </div>
        <div className="sc-breakdown-legend">
          {segments.map((seg) => (
            <span className="sc-legend-item" key={seg.key}>
              <span className="sc-legend-swatch" style={{ background: seg.color }} />
              {seg.label}
              <span className="sc-legend-count">{seg.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
