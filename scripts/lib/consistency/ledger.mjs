/** @internal — pure helpers for scripts/eval-consistency.mjs (hds#343). */
/**
 * Append-only reader and writer for eval/consistency/ledger.json.
 *
 * Layout: { $comment, thresholds, entries: [...] } with `entries` the LAST key,
 * so appending is a text splice before the closing bracket and every existing
 * byte stays identical. Entries are never edited or removed by this module.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { judgeMeasured } from './evaluate.mjs';

export const SOURCES = ['review', 'harness'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{7,40}$/;
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const num = (n) => String(Number(n.toFixed(4)));

export function readLedger(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function latestEntry(ledger) {
  return ledger.entries.length ? ledger.entries[ledger.entries.length - 1] : null;
}

function validateThresholds(t, at) {
  const p = [];
  if (!t || typeof t !== 'object') return [`${at}: thresholds missing`];
  if (!isNum(t.builds?.min) || !isNum(t.builds?.of))
    p.push(`${at}: thresholds.builds needs min and of`);
  if (!isNum(t.violations?.max)) p.push(`${at}: thresholds.violations.max missing`);
  if (!isNum(t.axe?.max)) p.push(`${at}: thresholds.axe.max missing`);
  if (!isNum(t.jaccard?.min)) p.push(`${at}: thresholds.jaccard.min missing`);
  if (!isNum(t.lightDiff?.max)) p.push(`${at}: thresholds.lightDiff.max missing`);
  return p;
}

/** Problems with one entry (empty when valid). */
export function validateEntry(e, at = 'entry') {
  const p = [];
  if (!e || typeof e !== 'object') return [`${at}: not an object`];
  if (typeof e.date !== 'string' || !DATE_RE.test(e.date)) p.push(`${at}: date must be YYYY-MM-DD`);
  if (!SOURCES.includes(e.source)) p.push(`${at}: source must be one of ${SOURCES.join(', ')}`);
  if (typeof e.packageVersion !== 'string' || !e.packageVersion)
    p.push(`${at}: packageVersion missing`);
  const harness = e.source === 'harness';
  if (e.tarballSha256 === null) {
    if (harness) p.push(`${at}: tarballSha256 is required for a harness run`);
  } else if (typeof e.tarballSha256 !== 'string' || !SHA256_RE.test(e.tarballSha256)) {
    p.push(`${at}: tarballSha256 must be a 64-char hex string or null`);
  }
  if (e.commit === null) {
    if (harness) p.push(`${at}: commit is required for a harness run`);
  } else if (typeof e.commit !== 'string' || !COMMIT_RE.test(e.commit)) {
    p.push(`${at}: commit must be a git sha or null`);
  }
  if (!Array.isArray(e.apps) || !e.apps.length || e.apps.some((a) => typeof a !== 'string')) {
    p.push(`${at}: apps must be a non-empty array of ids`);
  }
  const m = e.measured;
  if (!m || typeof m !== 'object') {
    p.push(`${at}: measured missing`);
  } else {
    if (!isNum(m.builds?.passing) || !isNum(m.builds?.of))
      p.push(`${at}: measured.builds needs passing and of`);
    for (const k of ['violations', 'axe', 'jaccardMin', 'lightDiffMax']) {
      if (!isNum(m[k])) p.push(`${at}: measured.${k} must be a number`);
    }
    const d = e.detail;
    if (d?.jaccard && isNum(m.jaccardMin) && Math.min(...d.jaccard) !== m.jaccardMin) {
      p.push(`${at}: measured.jaccardMin disagrees with detail.jaccard`);
    }
    if (d?.lightDiff && isNum(m.lightDiffMax) && Math.max(...d.lightDiff) !== m.lightDiffMax) {
      p.push(`${at}: measured.lightDiffMax disagrees with detail.lightDiff`);
    }
  }
  const tp = validateThresholds(e.thresholds, at);
  p.push(...tp);
  if (typeof e.pass !== 'boolean') {
    p.push(`${at}: pass must be a boolean`);
  } else if (m && !tp.length && p.length === 0) {
    const judged = judgeMeasured(m, e.thresholds);
    if (e.pass !== judged.pass) {
      p.push(`${at}: pass is ${e.pass} but the measured figures judge ${judged.pass}`);
    }
  }
  return p;
}

export function validateLedger(ledger) {
  const p = [];
  if (!ledger || typeof ledger !== 'object') return ['ledger is not an object'];
  p.push(...validateThresholds(ledger.thresholds, 'ledger'));
  if (!Array.isArray(ledger.entries)) return [...p, 'entries must be an array'];
  const keys = Object.keys(ledger);
  if (keys[keys.length - 1] !== 'entries')
    p.push('entries must be the last key (append-only splice)');
  let prev = '';
  ledger.entries.forEach((e, i) => {
    p.push(...validateEntry(e, `entries[${i}]`));
    if (e?.date && e.date < prev) p.push(`entries[${i}]: dated before the previous entry`);
    prev = e?.date ?? prev;
  });
  return p;
}

/**
 * Append one entry without rewriting anything already in the file.
 * Throws (and writes nothing) if the entry is invalid, dated before the latest
 * entry, or carries thresholds other than the ones currently in force.
 */
export function appendEntry(file, entry) {
  const text = readFileSync(file, 'utf8');
  const ledger = JSON.parse(text);
  const problems = validateEntry(entry, 'new entry');
  if (problems.length) throw new Error(problems.join('; '));
  if (JSON.stringify(entry.thresholds) !== JSON.stringify(ledger.thresholds)) {
    throw new Error('new entry: thresholds differ from the thresholds in force in the ledger');
  }
  const last = latestEntry(ledger);
  if (last && entry.date < last.date) {
    throw new Error(`new entry: dated ${entry.date}, before the latest entry (${last.date})`);
  }
  const body = JSON.stringify(entry, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  const close = text.lastIndexOf('\n  ]');
  if (close === -1) throw new Error('ledger.json: cannot find the end of the entries array');
  const head = text.slice(0, close);
  const tail = text.slice(close);
  const sep = head.trimEnd().endsWith('[') ? '\n' : ',\n';
  writeFileSync(file, `${head}${sep}${body}${tail}`);
}

/** The one line printed by --summary and pasted into README. */
export function summaryLine(e) {
  const m = e.measured;
  return (
    `Agent consistency ${e.date} (${e.source}, design-system ${e.packageVersion}): ` +
    `${e.pass ? 'PASS' : 'FAIL'} - builds ${m.builds.passing}/${m.builds.of}, ` +
    `violations ${m.violations}, axe ${m.axe}, ` +
    `Jaccard min ${num(m.jaccardMin)} (limit >= ${num(e.thresholds.jaccard.min)}), ` +
    `light diff max ${num(m.lightDiffMax)}% (limit <= ${num(e.thresholds.lightDiff.max)}%)`
  );
}

/** The `consistency` object root status.json carries. */
export function consistencyFromEntry(e) {
  return {
    date: e.date,
    source: e.source,
    pass: e.pass,
    jaccardMin: e.measured.jaccardMin,
    lightDiffMax: e.measured.lightDiffMax,
  };
}
