import { useRef, useState } from 'react';

function Dropzone({ id, label, hint, fileName, error, dragging, onDrag, onFile }) {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    onDrag(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      className={`sc-dropzone${dragging ? ' sc-dropzone-drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); onDrag(true); }}
      onDragLeave={(e) => { e.preventDefault(); onDrag(false); }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept=".html,.htm,.mht,.mhtml"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
      <div className="fw-semibold small mb-1" style={{ color: 'var(--edura-text)' }}>{label}</div>
      <div className="small" style={{ color: 'var(--edura-text-muted)' }}>{hint}</div>
      {fileName && <div className={`sc-dropzone-filename${error ? ' sc-err' : ''}`}>{error ? 'Could not read file' : `✓ ${fileName}`}</div>}
    </div>
  );
}

export default function UploadPanel({ onCalculate, onReset, error }) {
  const [responseText, setResponseText] = useState(null);
  const [keyText, setKeyText] = useState(null);
  const [responseName, setResponseName] = useState('');
  const [keyName, setKeyName] = useState('');
  const [responseError, setResponseError] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [dragResponse, setDragResponse] = useState(false);
  const [dragKey, setDragKey] = useState(false);
  const [marksCorrect, setMarksCorrect] = useState(2);
  const [marksWrong, setMarksWrong] = useState(0);
  const [bonusDropped, setBonusDropped] = useState(true);

  const readFile = (file, setText, setName, setErr) => {
    const reader = new FileReader();
    reader.onload = (e) => { setText(e.target.result); setName(file.name); setErr(false); };
    reader.onerror = () => { setErr(true); };
    reader.readAsText(file);
  };

  const canCalculate = !!(responseText && keyText);

  const handleCalculate = () => {
    if (!canCalculate) return;
    onCalculate({
      responseText,
      keyText,
      opts: {
        marksCorrect: parseFloat(marksCorrect) || 0,
        marksWrong: parseFloat(marksWrong) || 0,
        bonusDropped,
      },
    });
  };

  const handleReset = () => {
    setResponseText(null); setKeyText(null);
    setResponseName(''); setKeyName('');
    setResponseError(false); setKeyError(false);
    onReset();
  };

  return (
    <div className="edura-card p-4">
      <h2 className="h6 fw-bold mb-1" style={{ color: 'var(--edura-text)' }}>1. Upload your files</h2>
      <p className="small mb-3" style={{ color: 'var(--edura-text-muted)' }}>
        Open your Response Sheet and Answer Key pages on the NTA/NIC portal and save each as a webpage
        (Ctrl/Cmd+S) — either "Webpage, HTML only" (.html) or "Webpage, Single File" (.mht/.mhtml) work.
        Everything is processed locally in your browser — nothing is uploaded anywhere.
      </p>

      <div className="row g-3">
        <div className="col-md-6">
          <Dropzone
            id="sc-file-response"
            label="📄 Response Sheet"
            hint="Click or drag your saved Response Sheet .html or .mht file here"
            fileName={responseName}
            error={responseError}
            dragging={dragResponse}
            onDrag={setDragResponse}
            onFile={(f) => readFile(f, setResponseText, setResponseName, setResponseError)}
          />
        </div>
        <div className="col-md-6">
          <Dropzone
            id="sc-file-key"
            label="🔑 Answer Key"
            hint="Click or drag your saved (Final/Challenge) Answer Key .html or .mht file here"
            fileName={keyName}
            error={keyError}
            dragging={dragKey}
            onDrag={setDragKey}
            onFile={(f) => readFile(f, setKeyText, setKeyName, setKeyError)}
          />
        </div>
      </div>

      <details className="mt-3">
        <summary className="small fw-semibold" style={{ color: 'var(--edura-text-muted)', cursor: 'pointer' }}>
          Advanced: marking scheme
        </summary>
        <div className="row g-3 mt-1">
          <div className="col-6 col-md-4">
            <label className="form-label small mb-1">Marks for each correct answer</label>
            <input type="number" className="form-control form-control-sm" step="0.5" value={marksCorrect} onChange={(e) => setMarksCorrect(e.target.value)} />
          </div>
          <div className="col-6 col-md-4">
            <label className="form-label small mb-1">Marks deducted for each wrong answer</label>
            <input type="number" className="form-control form-control-sm" step="0.5" min="0" value={marksWrong} onChange={(e) => setMarksWrong(e.target.value)} />
          </div>
          <div className="col-12 col-md-4 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="sc-bonus-dropped" checked={bonusDropped} onChange={(e) => setBonusDropped(e.target.checked)} />
              <label className="form-check-label small" htmlFor="sc-bonus-dropped">
                Give full marks for questions dropped from the key
              </label>
            </div>
          </div>
        </div>
      </details>

      <div className="d-flex align-items-center gap-2 flex-wrap mt-3">
        <button type="button" className="btn btn-edura btn-sm" disabled={!canCalculate} onClick={handleCalculate}>
          Calculate Score
        </button>
        <button type="button" className="btn btn-outline-secondary btn-sm no-print" onClick={handleReset}>
          Reset
        </button>
      </div>

      {error && (
        <div className="sc-pill sc-critical mt-3 d-block w-100 text-start p-2" style={{ whiteSpace: 'pre-line', borderRadius: 'var(--edura-radius-sm)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
