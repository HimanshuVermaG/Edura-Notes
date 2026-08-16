import { useMemo, useState } from 'react';

const PILL = {
  correct: ['sc-good', 'Correct'],
  wrong: ['sc-critical', 'Incorrect'],
  unattempted: ['sc-muted', 'Unattempted'],
  dropped: ['sc-warning', 'Dropped'],
};

function exportCsv(rows) {
  const lines = [['#', 'Section', 'Question ID', 'Your Answer', 'Correct Answer', 'Result', 'Marks'].join(',')];
  rows.forEach((r) => {
    lines.push(
      [r.no, `"${r.section.replace(/"/g, '""')}"`, r.questionId, r.yourAnswer, `"${r.correctAnswer}"`, r.result, r.marks].join(',')
    );
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ugc-net-score-detail.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function QuestionDetailTable({ rows }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.result !== filter) return false;
      if (q && r.questionId.toLowerCase().indexOf(q) === -1 && r.section.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }, [rows, search, filter]);

  return (
    <div className="edura-card p-4">
      <h2 className="h6 fw-bold mb-3" style={{ color: 'var(--edura-text)' }}>Question-wise Detail</h2>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3 no-print">
        <input
          type="search"
          className="form-control form-control-sm"
          style={{ maxWidth: '220px' }}
          placeholder="Search question ID or section…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select form-select-sm" style={{ maxWidth: '180px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All results</option>
          <option value="correct">Correct</option>
          <option value="wrong">Incorrect</option>
          <option value="unattempted">Unattempted</option>
          <option value="dropped">Dropped / no key</option>
        </select>
        <button type="button" className="btn btn-outline-secondary btn-sm ms-auto" onClick={() => exportCsv(rows)}>
          Export CSV
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <div className="sc-table-scroll">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Section</th>
              <th>Question ID</th>
              <th>Your Answer</th>
              <th>Correct Answer</th>
              <th>Result</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const [pillCls, pillLbl] = PILL[r.result] || ['sc-muted', r.result];
              return (
                <tr key={r.no}>
                  <td>{r.no}</td>
                  <td>{r.section}</td>
                  <td>{r.questionId}</td>
                  <td>{r.yourAnswer}</td>
                  <td>{r.correctAnswer}</td>
                  <td><span className={`sc-pill ${pillCls}`}>{pillLbl}</span></td>
                  <td>{r.marks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
