export default function SectionBreakdownTable({ sections }) {
  const names = Object.keys(sections);
  if (!names.length) return null;

  return (
    <div className="edura-card p-4">
      <h2 className="h6 fw-bold mb-3" style={{ color: 'var(--edura-text)' }}>Section-wise Breakdown</h2>
      <div className="sc-table-scroll">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>Section</th>
              <th>Questions</th>
              <th>Correct</th>
              <th>Incorrect</th>
              <th>Unattempted</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            {names.map((name) => {
              const s = sections[name];
              return (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{s.questions}</td>
                  <td>{s.correct}</td>
                  <td>{s.wrong}</td>
                  <td>{s.unattempted}</td>
                  <td>{s.marks}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
