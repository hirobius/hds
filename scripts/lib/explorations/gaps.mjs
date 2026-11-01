/** @internal — pure helpers for the design-explorations spec set (hds#628). */
/**
 * The gap log. Every direction writes one `gaps.json`: a list of the times it
 * needed something HDS lacks, escaped the system or fought a rule.
 *
 *   { screen, direction, kind: token|component|pattern|rule|bug,
 *     needed, didInstead, proposal, evidence }
 *
 * `validateGapLog` checks one file. `aggregateGaps` ranks the gaps of every
 * log by how many screens hit each one, which is what the index board shows
 * and what Adrian accepts or rejects (hds#628, user stories 14 to 16).
 *
 * Two sessions describe one gap in two ways, so a gap may carry an optional
 * `id`: a kebab-case name shared across screens (eval/explorations/gap-ids.json
 * lists the ones the spec predicts). Without an id, gaps merge on their kind
 * and their wording with case, spacing and punctuation folded.
 *
 * Pure except `collectGapLogs`, which reads a runs/ directory.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { GAP_KINDS, gapKey, rankGapGroups } from './gap-rank.mjs';
import { DIRECTION_LETTERS, SCREEN_IDS, parseDirectionId, screenOrder } from './spec.mjs';

export { GAP_KINDS, gapKey };

const REQUIRED = ['screen', 'direction', 'kind', 'needed', 'didInstead', 'proposal', 'evidence'];
const OPTIONAL = ['id'];
const TEXT = ['needed', 'didInstead', 'proposal', 'evidence'];
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Problems with the contents of one gaps.json (empty when valid).
 * @param {unknown} log parsed file contents
 * @param {{screen?:string, direction?:string}} [expected] the directory the file lives in
 * @returns {{ ok:boolean, problems:string[], gaps:object[] }}
 */
export function validateGapLog(log, expected = {}) {
  if (!Array.isArray(log)) {
    return { ok: false, problems: ['a gap log must be an array (use [] for none)'], gaps: [] };
  }
  const problems = [];
  log.forEach((g, i) => {
    const at = `gap ${i + 1}`;
    if (!g || typeof g !== 'object' || Array.isArray(g)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    const has = (k) => g[k] !== undefined;
    for (const k of REQUIRED) if (!has(k)) problems.push(`${at}: missing ${k}`);
    for (const k of Object.keys(g)) {
      if (!REQUIRED.includes(k) && !OPTIONAL.includes(k))
        problems.push(`${at}: unexpected key ${k}`);
    }
    for (const k of TEXT) {
      if (has(k) && (typeof g[k] !== 'string' || !g[k].trim())) {
        problems.push(`${at}: ${k} must be a non-empty string`);
      }
    }
    if (has('screen') && !SCREEN_IDS.includes(g.screen)) {
      problems.push(`${at}: screen "${g.screen}" is not one of ${SCREEN_IDS.join(', ')}`);
    }
    if (has('direction') && !DIRECTION_LETTERS.includes(g.direction)) {
      problems.push(
        `${at}: direction "${g.direction}" is not one of ${DIRECTION_LETTERS.join(', ')}`,
      );
    }
    if (has('kind') && !GAP_KINDS.includes(g.kind)) {
      problems.push(`${at}: kind "${g.kind}" is not one of ${GAP_KINDS.join(', ')}`);
    }
    if (has('id') && (typeof g.id !== 'string' || !KEBAB.test(g.id))) {
      problems.push(`${at}: id "${g.id}" must be kebab-case (letters, digits, single hyphens)`);
    }
    if (expected.screen && SCREEN_IDS.includes(g.screen) && g.screen !== expected.screen) {
      problems.push(
        `${at}: screen "${g.screen}" does not match the directory it is in (${expected.screen})`,
      );
    }
    if (
      expected.direction &&
      DIRECTION_LETTERS.includes(g.direction) &&
      g.direction !== expected.direction
    ) {
      problems.push(
        `${at}: direction "${g.direction}" does not match the directory it is in (${expected.direction})`,
      );
    }
  });
  return { ok: problems.length === 0, problems, gaps: problems.length === 0 ? log : [] };
}

/**
 * Rank gaps by how many distinct screens hit them (a screen counts once however
 * many of its directions hit it), then by total hits, then by key.
 * @param {object[]} gaps valid gap objects from any number of logs
 */
export const aggregateGaps = (gaps) =>
  rankGapGroups(gaps, {
    compareScreens: (a, b) => screenOrder(a) - screenOrder(b),
    letters: DIRECTION_LETTERS,
  });

const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;
const subdirs = (dir) =>
  readdirSync(dir)
    .sort()
    .filter((n) => statSync(path.join(dir, n)).isDirectory());

/**
 * Read every direction's gaps.json under a runs/ directory (<date>/<screen>-<A|B|C>/).
 * A direction run on two dates counts once, from the newest date. An invalid log
 * is reported and none of its gaps are ranked.
 * @returns {{ logs:{id:string,date:string,screen:string,direction:string,gaps:object[]}[], gaps:object[], problems:{id:string,date:string,problems:string[]}[] }}
 */
export function collectGapLogs(runsRoot) {
  const out = { logs: [], gaps: [], problems: [] };
  if (!existsSync(runsRoot)) return out;
  const newest = new Map();
  for (const date of subdirs(runsRoot).filter((n) => DATE_DIR.test(n))) {
    for (const id of subdirs(path.join(runsRoot, date))) {
      if (!parseDirectionId(id)) continue;
      if (!existsSync(path.join(runsRoot, date, id, 'gaps.json'))) continue;
      newest.set(id, date); // dates are walked oldest first, so the last write wins
    }
  }
  for (const id of [...newest.keys()].sort()) {
    const date = newest.get(id);
    const { screen, letter } = parseDirectionId(id);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(path.join(runsRoot, date, id, 'gaps.json'), 'utf8'));
    } catch (err) {
      out.problems.push({ id, date, problems: [`gaps.json is not valid JSON (${err.message})`] });
      continue;
    }
    const r = validateGapLog(parsed, { screen, direction: letter });
    if (!r.ok) {
      out.problems.push({ id, date, problems: r.problems });
      continue;
    }
    out.logs.push({ id, date, screen, direction: letter, gaps: r.gaps });
    out.gaps.push(...r.gaps);
  }
  return out;
}
