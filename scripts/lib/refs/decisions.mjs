/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * The decision history: eval/refs/decisions.json, append-only, one entry per
 * decision Adrian makes on the review board.
 *
 *   { proposal, decision: approve|reject|defer, at: YYYY-MM-DD, refCount, reason?, pr? }
 *
 * `proposal` is the gap id the proposal was built from. `refCount` is how many
 * refs backed it when it was decided, so a deferred proposal can come back
 * once the evidence grows. `reason` is required for a reject: it is what keeps
 * the same idea from being proposed again in other words. `pr` is the pull
 * request that applied an approved change. `at` is the day Adrian decided.
 * Entries are only ever appended; the last entry per proposal wins.
 */
import { DECISIONS, KEBAB } from './spec.mjs';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEYS = ['proposal', 'decision', 'at', 'refCount', 'reason', 'pr'];

/** @returns {{ ok:boolean, problems:string[], decisions:object[] }} */
export function validateDecisions(list) {
  if (!Array.isArray(list)) {
    return { ok: false, problems: ['decisions.json must be an array'], decisions: [] };
  }
  const problems = [];
  list.forEach((d, i) => {
    const at = `decision ${i + 1}`;
    if (!d || typeof d !== 'object' || Array.isArray(d)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    for (const k of Object.keys(d))
      if (!KEYS.includes(k)) problems.push(`${at}: unexpected key ${k}`);
    if (typeof d.proposal !== 'string' || !KEBAB.test(d.proposal)) {
      problems.push(`${at}: proposal must be a kebab-case gap id`);
    }
    if (!DECISIONS.includes(d.decision)) {
      problems.push(`${at}: decision must be one of ${DECISIONS.join(', ')}`);
    }
    if (typeof d.at !== 'string' || !DATE.test(d.at)) {
      problems.push(`${at}: at must be a date (YYYY-MM-DD)`);
    }
    if (!Number.isInteger(d.refCount) || d.refCount < 0) {
      problems.push(`${at}: refCount must be a whole number`);
    }
    if (d.decision === 'reject' && (typeof d.reason !== 'string' || !d.reason.trim())) {
      problems.push(`${at}: a reject needs a reason, so the idea is not proposed again`);
    }
    if (d.reason !== undefined && typeof d.reason !== 'string') {
      problems.push(`${at}: reason must be a string`);
    }
    if (
      d.pr !== undefined &&
      (typeof d.pr !== 'string' || !/^https:\/\/github\.com\//.test(d.pr))
    ) {
      problems.push(`${at}: pr must be a github.com pull request URL`);
    }
    if (d.pr !== undefined && d.decision !== 'approve') {
      problems.push(`${at}: only an approve carries a pr`);
    }
  });
  return { ok: problems.length === 0, problems, decisions: problems.length === 0 ? list : [] };
}

/** proposal id -> its newest decision. */
export function latestDecisions(list) {
  const out = new Map();
  for (const d of list) out.set(d.proposal, d);
  return out;
}

/**
 * Decisions from the review board that the history does not have yet.
 * The board stores one document per proposal ({ decision, reason, decidedAt });
 * a document whose decision and date match the newest history entry is old.
 * @param {object[]} history decisions.json entries
 * @param {{ id:string, decision:string, reason?:string, decidedAt:string }[]} board
 * @param {Record<string,number>} refCounts proposal id -> refs backing it now
 * @returns {{ entries:object[], problems:string[] }}
 */
export function newBoardDecisions(history, board, refCounts) {
  const latest = latestDecisions(history);
  const entries = [];
  const problems = [];
  for (const b of [...board].sort((x, y) =>
    String(x.decidedAt).localeCompare(String(y.decidedAt)),
  )) {
    if (!DECISIONS.includes(b.decision)) {
      problems.push(`${b.id}: decision "${b.decision}" is not one of ${DECISIONS.join(', ')}`);
      continue;
    }
    const at = String(b.decidedAt ?? '').slice(0, 10);
    if (!DATE.test(at)) {
      problems.push(`${b.id}: decidedAt "${b.decidedAt}" is not a date`);
      continue;
    }
    const prev = latest.get(b.id);
    if (prev && prev.decision === b.decision && prev.at === at) continue;
    if (b.decision === 'reject' && !(b.reason ?? '').trim()) {
      problems.push(`${b.id}: rejected without a reason; ask Adrian for one before recording it`);
      continue;
    }
    const entry = { proposal: b.id, decision: b.decision, at, refCount: refCounts[b.id] ?? 0 };
    if ((b.reason ?? '').trim()) entry.reason = b.reason.trim();
    entries.push(entry);
  }
  return { entries, problems };
}
