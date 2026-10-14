/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * A proposal: one recurring gap turned into a concrete system change, with
 * everything Adrian needs to approve, reject or defer it from his phone.
 *
 *   eval/refs/proposals/<gap-id>.json
 *
 * The CLI lists the candidates (`--candidates`); the nightly agent writes one
 * file per candidate it can back; this validator keeps the file honest
 * against the candidate it came from (same id, enough refs, every evidence
 * ref scored before and after).
 */
import { KEBAB, RECOMMENDATIONS, RISK_LEVELS } from './spec.mjs';
import { GAP_KINDS } from './gaps.mjs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN_ACTIONS = ['add', 'modify', 'remove', 'alias'];
const BLAST_LEVELS = ['none', ...RISK_LEVELS];
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isScore = (v) => Number.isInteger(v) && v >= 0 && v <= 100;

function keys(obj, allowed, at, problems) {
  for (const k of Object.keys(obj))
    if (!allowed.includes(k)) problems.push(`${at} has unexpected key ${k}`);
}

/**
 * @param {unknown} p parsed proposal file
 * @param {{ id:string, candidate?:{refs:string[]}|null, threshold:number, refIds:string[] }} ctx
 *   `candidate` is the clustered gap with this id (null when no candidate has it)
 * @returns {string[]}
 */
export function validateProposal(p, { id, candidate, threshold, refIds }) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['a proposal must be an object'];
  const problems = [];
  keys(
    p,
    [
      'id',
      'title',
      'kind',
      'createdAt',
      'change',
      'evidence',
      'blastRadius',
      'consistencyRisk',
      'benefit',
      'recommendation',
      'modified',
      'rationale',
    ],
    'proposal',
    problems,
  );
  if (p.id !== id) problems.push(`id "${p.id}" must match its file name (${id})`);
  if (!KEBAB.test(String(p.id)))
    problems.push('id must be the kebab-case gap id it was built from');
  if (!isText(p.title) || p.title.length > 90)
    problems.push('title must be a non-empty string of 90 characters or fewer');
  if (!GAP_KINDS.includes(p.kind)) problems.push(`kind must be one of ${GAP_KINDS.join(', ')}`);
  if (typeof p.createdAt !== 'string' || !DATE.test(p.createdAt))
    problems.push('createdAt must be a date (YYYY-MM-DD)');
  if (!isText(p.rationale) || p.rationale.length > 240)
    problems.push('rationale must be one line of 240 characters or fewer');

  const c = p.change;
  if (!c || typeof c !== 'object' || Array.isArray(c)) problems.push('change must be an object');
  else {
    keys(c, ['summary', 'diff', 'tokens'], 'change', problems);
    if (!isText(c.summary)) problems.push('change.summary must be a non-empty string');
    if (!isText(c.diff))
      problems.push('change.diff must be the exact diff (token file or component)');
    if (p.kind === 'token' && (!Array.isArray(c.tokens) || c.tokens.length === 0)) {
      problems.push('a token proposal lists change.tokens');
    }
    if (c.tokens !== undefined) {
      if (!Array.isArray(c.tokens)) problems.push('change.tokens must be an array');
      else
        c.tokens.forEach((t, i) => {
          const at = `change.tokens[${i}]`;
          if (!t || typeof t !== 'object') return problems.push(`${at} must be an object`);
          keys(t, ['path', 'action', 'from', 'to'], at, problems);
          if (!isText(t.path)) problems.push(`${at}.path must be a token path`);
          if (!TOKEN_ACTIONS.includes(t.action))
            problems.push(`${at}.action must be one of ${TOKEN_ACTIONS.join(', ')}`);
          if (t.action !== 'remove' && !isText(t.to))
            problems.push(`${at}.to must say the new value`);
          if ((t.action === 'modify' || t.action === 'remove') && !isText(t.from)) {
            problems.push(`${at}.from must say the current value`);
          }
          return undefined;
        });
    }
  }

  const e = p.evidence;
  if (!e || typeof e !== 'object' || !Array.isArray(e.refs))
    problems.push('evidence must be { refs: [...] }');
  else {
    keys(e, ['refs', 'note'], 'evidence', problems);
    const refs = [...new Set(e.refs)];
    if (refs.length < threshold)
      problems.push(`evidence needs ${threshold} or more distinct refs, has ${refs.length}`);
    for (const r of refs)
      if (!refIds.includes(r))
        problems.push(`evidence ref ${r} does not exist under eval/refs/refs/`);
    if (candidate) {
      const missing = refs.filter((r) => !candidate.refs.includes(r));
      if (missing.length)
        problems.push(`evidence refs ${missing.join(', ')} did not log the gap ${id}`);
    } else {
      problems.push(
        `no current candidate has the id ${id} (decided, below the threshold, or renamed)`,
      );
    }
  }

  const b = p.blastRadius;
  if (!b || typeof b !== 'object' || Array.isArray(b))
    problems.push('blastRadius must be an object');
  else {
    keys(b, ['level', 'summary', 'components', 'files', 'visualDiff'], 'blastRadius', problems);
    if (!BLAST_LEVELS.includes(b.level))
      problems.push(`blastRadius.level must be one of ${BLAST_LEVELS.join(', ')}`);
    if (!isText(b.summary)) problems.push('blastRadius.summary must be a non-empty string');
    if (!Array.isArray(b.components))
      problems.push('blastRadius.components must be an array (empty for an additive change)');
    if (!Number.isInteger(b.files) || b.files < 0)
      problems.push('blastRadius.files must be a whole number');
    if (!isText(b.visualDiff))
      problems.push(
        'blastRadius.visualDiff must say what changed on existing pages, or why nothing could',
      );
  }

  const r = p.consistencyRisk;
  if (!r || typeof r !== 'object' || Array.isArray(r))
    problems.push('consistencyRisk must be an object');
  else {
    keys(r, ['level', 'summary'], 'consistencyRisk', problems);
    if (!RISK_LEVELS.includes(r.level))
      problems.push(`consistencyRisk.level must be one of ${RISK_LEVELS.join(', ')}`);
    if (!isText(r.summary)) problems.push('consistencyRisk.summary must be a non-empty string');
  }

  const g = p.benefit;
  if (!g || typeof g !== 'object' || !Array.isArray(g.perRef))
    problems.push('benefit must be { perRef: [...], summary }');
  else {
    keys(g, ['perRef', 'summary'], 'benefit', problems);
    if (!isText(g.summary)) problems.push('benefit.summary must be a non-empty string');
    const scored = new Set();
    g.perRef.forEach((row, i) => {
      const at = `benefit.perRef[${i}]`;
      if (!row || typeof row !== 'object') return problems.push(`${at} must be an object`);
      keys(row, ['ref', 'before', 'after'], at, problems);
      if (!isScore(row.before))
        problems.push(`${at}.before must be the ref's current score (0-100)`);
      if (row.after !== null && !isScore(row.after))
        problems.push(`${at}.after must be a score (0-100) or null when it could not be rebuilt`);
      scored.add(row.ref);
      return undefined;
    });
    if (e && Array.isArray(e.refs)) {
      for (const ref of new Set(e.refs))
        if (!scored.has(ref)) problems.push(`benefit.perRef has no row for evidence ref ${ref}`);
    }
  }

  if (!RECOMMENDATIONS.includes(p.recommendation)) {
    problems.push(`recommendation must be one of ${RECOMMENDATIONS.join(', ')}`);
  }
  if (p.recommendation === 'adopt-modified' && !isText(p.modified)) {
    problems.push('an adopt-modified recommendation says what it modifies (modified)');
  }
  if (p.recommendation !== 'adopt-modified' && p.modified !== undefined) {
    problems.push('modified is only for an adopt-modified recommendation');
  }
  return problems;
}

/** Mean before, mean after and the gain over the rows that have both. */
export function benefitSummary(perRef) {
  const both = perRef.filter((r) => isScore(r.before) && isScore(r.after));
  if (both.length === 0) return { before: null, after: null, gain: null, measured: 0 };
  const mean = (k) => Math.round(both.reduce((n, r) => n + r[k], 0) / both.length);
  const before = mean('before');
  const after = mean('after');
  return { before, after, gain: after - before, measured: both.length };
}
