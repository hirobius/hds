/** @internal — helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * Read the committed design-refs data under a repository root: settings, refs,
 * the decision history, the token file, and what they add up to (the
 * clustered gaps and the index text). Shared by scripts/eval-refs.mjs and the
 * index generator, scripts/build-refs-index.mjs, so the two can never build a
 * different index. A file that is not valid JSON throws, naming it.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateDecisions } from './decisions.mjs';
import { clusterGaps } from './gaps.mjs';
import { renderIndex } from './index-md.mjs';
import { judgeRef, listRefs, readRef } from './ref.mjs';
import { assessValue, readScale } from './scale.mjs';
import { DEFAULT_THRESHOLD, PATHS } from './spec.mjs';

export function readJsonFile(root, rel, fallback) {
  const file = path.join(root, rel);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${rel} is not valid JSON (${err.message})`);
  }
}

export function readConfig(root) {
  const c = readJsonFile(root, PATHS.config, {});
  const threshold = c.threshold ?? DEFAULT_THRESHOLD;
  if (!Number.isInteger(threshold) || threshold < 2) {
    throw new Error(`${PATHS.config}: threshold must be a whole number of 2 or more`);
  }
  return { ...c, threshold };
}

export const readTokens = (root) => readJsonFile(root, 'hirobius.tokens.json', {});

/** Every ref directory, read (not judged), and any directory that is not a ref id. */
export function loadRefs(root) {
  const dir = path.join(root, PATHS.refs);
  const { ids, ignored } = listRefs(dir);
  return { refs: ids.map((id) => readRef(dir, id)), ignored };
}

/** The gaps every ref filed under its own id, each ref's surface and its ref.json. */
export function corpus(refs) {
  const gaps = [];
  const surfaces = {};
  const meta = {};
  for (const r of refs) {
    if (r.meta.value && typeof r.meta.value === 'object') {
      surfaces[r.id] = r.meta.value.surface;
      meta[r.id] = r.meta.value;
    }
    if (Array.isArray(r.gaps.value)) {
      gaps.push(...r.gaps.value.filter((g) => g && g.ref === r.id && g.id));
    }
  }
  return { gaps, surfaces, meta };
}

/** decisions.json, validated: { list, ok, problems, decisions }. */
export function readDecisions(root) {
  const list = readJsonFile(root, PATHS.decisions, []);
  return { list, ...validateDecisions(list) };
}

/** clusterGaps over the refs, with scale facts on each candidate that carries a `want`. */
export function clustersFor(refs, { threshold, decisions, tokens }) {
  const { gaps, surfaces } = corpus(refs);
  const out = clusterGaps(gaps, { threshold, decisions, surfaces });
  for (const g of out.candidates) {
    if (g.want) g.scaleFacts = assessValue(readScale(tokens, g.want.scale), g.want.median);
  }
  return out;
}

/** The refs that pass every source check. */
export const validRefs = (refs) => refs.filter((r) => judgeRef(r).pass);

/** INDEX.md as the index generator writes it, before formatting. */
export function indexText(root) {
  const cfg = readConfig(root);
  const d = readDecisions(root);
  if (!d.ok) throw new Error(`${PATHS.decisions} is invalid: ${d.problems[0]}`);
  const valid = validRefs(loadRefs(root).refs);
  const rows = valid.map((r) => ({
    id: r.id,
    meta: r.meta.value,
    gapIds: [...new Set(r.gaps.value.map((g) => g.id))],
    card: r.card.text,
  }));
  const clusters = clustersFor(valid, {
    threshold: cfg.threshold,
    decisions: d.decisions,
    tokens: readTokens(root),
  });
  return renderIndex(rows, clusters, { threshold: cfg.threshold });
}
