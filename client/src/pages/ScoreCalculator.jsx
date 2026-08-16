import { useRef, useState } from 'react';
import Layout from '../components/Layout';
import UploadPanel from '../components/scoreCalculator/UploadPanel';
import CandidateDetails from '../components/scoreCalculator/CandidateDetails';
import ScoreSummary from '../components/scoreCalculator/ScoreSummary';
import SectionBreakdownTable from '../components/scoreCalculator/SectionBreakdownTable';
import QuestionDetailTable from '../components/scoreCalculator/QuestionDetailTable';
import { parseResponseSheet, parseAnswerKey, computeScore } from '../utils/scoreCalculatorEngine';

export default function ScoreCalculator() {
  const [result, setResult] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [examTitle, setExamTitle] = useState('');
  const [error, setError] = useState('');
  const resultsRef = useRef(null);

  const handleCalculate = ({ responseText, keyText, opts }) => {
    setError('');

    let responseData;
    try {
      responseData = parseResponseSheet(responseText);
    } catch {
      setError('Could not parse the Response Sheet file. Please make sure you saved the full Response Sheet page from the NTA portal as HTML.');
      return;
    }

    let keyData;
    try {
      keyData = parseAnswerKey(keyText);
    } catch {
      setError('Could not parse the Answer Key file. Please make sure you saved the full Answer Key page (with the results table) as HTML.');
      return;
    }

    if (!responseData.questions.length) {
      setError('No questions were found in the Response Sheet file. Please double-check you uploaded the correct saved HTML page.');
      return;
    }
    if (!keyData.found) {
      setError('No "Question ID" / "Correct Option" table was found in the Answer Key file. Please double-check you uploaded the correct saved HTML page.');
      return;
    }

    const computed = computeScore(responseData, keyData, opts);
    const matched = responseData.questions.length - computed.totals.dropped;
    if (matched === 0) {
      setError('None of the Question IDs in your Response Sheet matched the Answer Key. Please check that both files are from the same exam/session.');
      return;
    }

    setCandidate(responseData.candidate);
    setExamTitle(responseData.examTitle);
    setResult(computed);

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleReset = () => {
    setResult(null);
    setCandidate(null);
    setExamTitle('');
    setError('');
  };

  return (
    <Layout>
      <div className="score-calculator-page">
        <div className="mb-4">
          <h1 className="h3 fw-bold mb-1" style={{ color: 'var(--edura-text)' }}>UGC NET Score Calculator</h1>
          <p className="mb-0" style={{ color: 'var(--edura-text-muted)', maxWidth: '640px' }}>
            Upload your official Response Sheet and Answer Key (saved as HTML from the NTA portal) to get an
            instant, accurate score — works for any paper or subject.
          </p>
        </div>

        <div className="d-flex flex-column gap-3">
          <UploadPanel onCalculate={handleCalculate} onReset={handleReset} error={error} />

          {result && (
            <div ref={resultsRef} className="d-flex flex-column gap-3">
              <CandidateDetails candidate={candidate} examTitle={examTitle} />
              <ScoreSummary totals={result.totals} />
              <SectionBreakdownTable sections={result.sections} />
              <QuestionDetailTable rows={result.rows} />
            </div>
          )}
        </div>

        <p className="small text-center mt-4 no-print" style={{ color: 'var(--edura-text-muted)' }}>
          Runs entirely in your browser — your response sheet and answer key are never uploaded to a server.
        </p>
      </div>
    </Layout>
  );
}
