// Parsing and scoring logic for the UGC NET Score Calculator.
// Ported from the standalone prototype; operates purely on strings/DOM
// parsing with no side effects, so it can be unit-tested independently
// of the page/components.

function textOf(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

// MHT/MHTML support — browsers' "Webpage, Single File" save option (often the
// default in Chrome/Edge's Save dialog) produces a MIME multipart archive
// instead of plain HTML. We transparently unwrap that into the underlying
// HTML before handing it to DOMParser.

function looksLikeMht(text) {
  const head = text.slice(0, 2000);
  return /boundary\s*=/i.test(head) && /^\s*(MIME-Version:|Content-Type:\s*multipart\/related|From:)/im.test(head);
}

function bytesToUtf8String(binaryStr) {
  try {
    return decodeURIComponent(escape(binaryStr));
  } catch {
    return binaryStr;
  }
}

function decodeQuotedPrintable(str) {
  const withoutSoftBreaks = str.replace(/=\r?\n/g, '');
  const bytes = withoutSoftBreaks.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return bytesToUtf8String(bytes);
}

function decodeBase64(str) {
  try {
    return bytesToUtf8String(atob(str.replace(/\s+/g, '')));
  } catch {
    return '';
  }
}

function extractHtmlFromMht(text) {
  const boundaryMatch = text.match(/boundary\s*=\s*"?([^"\r\n;]+)"?/i);
  if (!boundaryMatch) return text;
  const boundary = boundaryMatch[1].trim();
  const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp('--' + escaped + '(?:--)?\\r?\\n'));

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || !/^content-/im.test(trimmed)) continue;
    const headerEnd = trimmed.search(/\r?\n\r?\n/);
    if (headerEnd === -1) continue;
    const headers = trimmed.slice(0, headerEnd);
    const body = trimmed.slice(headerEnd).replace(/^\r?\n\r?\n/, '');

    if (/Content-Type:\s*text\/html/i.test(headers)) {
      const encodingMatch = headers.match(/Content-Transfer-Encoding:\s*([^\r\n;]+)/i);
      const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : '7bit';

      if (encoding === 'quoted-printable') return decodeQuotedPrintable(body);
      if (encoding === 'base64') return decodeBase64(body);
      return body; // 7bit / 8bit / binary — already plain text
    }

    // Nested multipart (e.g. multipart/related wrapping a multipart/alternative,
    // which some non-Chrome MHT savers produce) — recurse using the sub-part's
    // own boundary rather than assuming the html part is always top-level.
    if (/Content-Type:\s*multipart\//i.test(headers) && /boundary\s*=/i.test(headers)) {
      const rejoined = headers + '\r\n\r\n' + body;
      const nested = extractHtmlFromMht(rejoined);
      if (nested !== rejoined) return nested;
    }
  }
  return text; // no text/html part found; fall back to raw input
}

function preprocessSourceHtml(rawText) {
  return looksLikeMht(rawText) ? extractHtmlFromMht(rawText) : rawText;
}

export function parseResponseSheet(rawHtml) {
  const html = preprocessSourceHtml(rawHtml);
  const doc = new DOMParser().parseFromString(html, 'text/html');

  let examTitle = '';
  const candidate = {};
  const infoPnl = doc.querySelector('.main-info-pnl');
  if (infoPnl) {
    examTitle = textOf(infoPnl.querySelector('strong'));
    infoPnl.querySelectorAll('table tr').forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 2) {
        const k = textOf(tds[0]);
        const v = textOf(tds[1]);
        if (k) candidate[k] = v;
      }
    });
  }

  const questions = [];
  const duplicateQuestionIds = [];
  const seenQuestionIds = new Set();
  const sectionContainers = doc.querySelectorAll('.section-cntnr');
  const containers = sectionContainers.length ? Array.from(sectionContainers) : [doc.body];

  containers.forEach((container) => {
    const lblEl = container.querySelector
      ? container.querySelector('.section-lbl .bold, .section-lbl b, .section-lbl')
      : null;
    const sectionName = lblEl ? textOf(lblEl).replace(/^Section\s*:?\s*/i, '') : 'General';

    const qPanels = container.querySelectorAll ? container.querySelectorAll('.question-pnl') : [];
    qPanels.forEach((panel) => {
      const menuTbl = panel.querySelector('.menu-tbl');
      if (!menuTbl) return;
      const kv = {};
      const options = {};
      menuTbl.querySelectorAll('tr').forEach((tr) => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 2) {
          const k = textOf(tds[0]).replace(/\s*:\s*$/, '').trim();
          const v = textOf(tds[1]);
          const optMatch = k.match(/^Option\s+(\d+)\s+ID$/i);
          if (optMatch) {
            options[optMatch[1]] = v;
          } else {
            kv[k] = v;
          }
        }
      });
      const qid = kv['Question ID'];
      if (!qid) return;
      // A duplicated Question ID (saved-page glitch, a section rendered
      // twice, MHT corruption) would otherwise be scored twice with no
      // indication anything was off — keep only the first occurrence and
      // report the rest so the UI can warn about it.
      if (seenQuestionIds.has(qid)) {
        duplicateQuestionIds.push(qid);
        return;
      }
      seenQuestionIds.add(qid);
      const chosen = kv['Chosen Option'] || kv['Given Answer'] || '';
      questions.push({
        section: sectionName,
        questionId: qid,
        questionType: kv['Question Type'] || '',
        options,
        status: kv['Status'] || '',
        chosenOptionNo: chosen,
        chosenOptionId: chosen && options[chosen] ? options[chosen] : null,
      });
    });
  });

  return { examTitle, candidate, questions, duplicateQuestionIds };
}

export function parseAnswerKey(rawHtml) {
  const html = preprocessSourceHtml(rawHtml);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  const map = {};
  let found = false;

  tables.forEach((table) => {
    if (found) return;
    const headerRow = table.querySelector('tr');
    if (!headerRow) return;
    const headerCells = headerRow.querySelectorAll('th,td');
    if (!headerCells.length) return;
    const headers = Array.from(headerCells).map((c) => textOf(c).toLowerCase());

    const qIdx = headers.findIndex((h) => h.indexOf('question id') !== -1);
    const ansIdx = headers.findIndex(
      (h) => h.indexOf('correct option') !== -1 || h.indexOf('key/answer') !== -1 || h.indexOf('answer key') !== -1
    );
    const secIdx = headers.findIndex((h) => h.indexOf('section') !== -1 || h.indexOf('subject') !== -1);
    if (qIdx === -1 || ansIdx === -1) return;

    const rows = table.querySelectorAll('tr');
    let any = false;
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (!cells.length || cells.length <= Math.max(qIdx, ansIdx)) continue;
      const qid = textOf(cells[qIdx]);
      const ansText = textOf(cells[ansIdx]);
      if (!qid || !ansText) continue;
      const ids = ansText.split(/[\s,;]+/).filter(Boolean);
      map[qid] = { ids, section: secIdx !== -1 ? textOf(cells[secIdx]) : '' };
      any = true;
    }
    if (any) found = true;
  });

  return { map, found };
}

export function computeScore(responseData, keyData, opts) {
  const { marksCorrect, marksWrong, bonusDropped } = opts;

  const rows = [];
  const totals = { correct: 0, wrong: 0, unattempted: 0, dropped: 0, score: 0, maxScore: 0 };
  const sections = {};

  responseData.questions.forEach((q, idx) => {
    const sec = sections[q.section] || (sections[q.section] = { questions: 0, correct: 0, wrong: 0, unattempted: 0, marks: 0 });
    sec.questions++;
    totals.maxScore += marksCorrect;

    const keyEntry = keyData.map[q.questionId];
    let result;
    let marks = 0;
    let correctDisplay = '—';

    if (!keyEntry) {
      result = 'dropped';
      totals.dropped++;
      if (bonusDropped) marks = marksCorrect;
      sec.marks += marks;
    } else {
      const correctNos = Object.keys(q.options).filter((no) => keyEntry.ids.indexOf(q.options[no]) !== -1);
      correctDisplay = correctNos.length ? correctNos.join(' / ') : keyEntry.ids.join(' / ');

      if (!q.chosenOptionId) {
        result = 'unattempted';
        totals.unattempted++;
        sec.unattempted++;
      } else if (keyEntry.ids.indexOf(q.chosenOptionId) !== -1) {
        result = 'correct';
        marks = marksCorrect;
        totals.correct++;
        sec.correct++;
      } else {
        result = 'wrong';
        marks = -Math.abs(marksWrong);
        totals.wrong++;
        sec.wrong++;
      }
      sec.marks += marks;
    }

    totals.score += marks;
    rows.push({
      no: idx + 1,
      section: q.section,
      questionId: q.questionId,
      yourAnswer: q.chosenOptionNo || '—',
      correctAnswer: correctDisplay,
      result,
      marks,
    });
  });

  return { rows, totals, sections };
}
