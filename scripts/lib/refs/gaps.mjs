/** @internal — pure helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * The gap log of one ref, and the clustering that turns many logs into
 * candidates for a system change.
 *
 *   { ref, kind, id, needed, didInstead, proposal, evidence, measured?, nearest?, want? }
 *
 * The shape is the explorations gap log's (scripts/lib/explorations/gaps.mjs),
 * keyed by ref instead of screen and direction, with three additions a visual
 * reference needs: `measured` (what the image shows, "~160px between
 * sections"), `nearest` (the closest token the rebuild used, "space.32 = 128px")
 * and `want` (the same as a number on a token scale, so a proposal can test it
 * against the scale). `id` is required: refs are rebuilt one per session, a
 * session never sees another's wording, so clustering is by id. Reuse an id
 * from eval/refs/gap-ids.json or from an earlier ref (`pnpm eval:refs --vocab`)
 * before minting one.
 *
 * Clustering: a gap becomes a candidate only when `threshold` distinct refs
 * hit it. A rejected proposal is never a candidate again, an approved one is
 * done, and a deferred one comes back only when more refs hit it than when it
 * was deferred.
 */
import { CORE_SURFACES, KEBAB } from './spec.mjs';
import { latestDecisions } from './decisions.mjs';

export const GAP_KINDS = ['token', 'component', 'pattern', 'rule', 'bug'];

const REQUIRED = ['ref', 'kind', 'id', 'needed', 'didInstead', 'proposal', 'evidence'];
const OPTIONAL = ['measured', 'nearest', 'want'];
const TEXT = ['needed', 'didInstead', 'proposal', 'evidence', 'measured', 'nearest'];
const SCALE_PATH = /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+$/;

/**
 * Problems with the contents of one ref's gaps.json (empty when valid).
 * @param {unknown} log parsed file contents
 * @param {string} [refId] the ref the file belongs to
 * @returns {{ ok:boolean, problems:string[], gaps:object[] }}
 */
export function validateRefGapLog(log, refId) {
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
    if (has('kind') && !GAP_KINDS.includes(g.kind)) {
      problems.push(`${at}: kind "${g.kind}" is not one of ${GAP_KINDS.join(', ')}`);
    }
    if (has('id') && (typeof g.id !== 'string' || !KEBAB.test(g.id))) {
      problems.push(`${at}: id "${g.id}" must be kebab-case (letters, digits, single hyphens)`);
    }
    if (refId && has('ref') && g.ref !== refId) {
      problems.push(`${at}: ref "${g.ref}" does not match the ref it is filed under (${refId})`);
    }
    if (has('want')) {
      const w = g.want;
      if (!w || typeof w !== 'object' || Array.isArray(w)) {
        problems.push(`${at}: want must be an object { scale, px }`);
      } else {
        if (typeof w.scale !== 'string' || !SCALE_PATH.test(w.scale)) {
          problems.push(`${at}: want.scale must be a token path such as primitive.space`);
        }
        if (typeof w.px !== 'number' || !Number.isFinite(w.px) || w.px <= 0) {
          problems.push(`${at}: want.px must be a positive number`);
        }
        for (const k of Object.keys(w)) {
          if (k !== 'scale' && k !== 'px') problems.push(`${at}: want has unexpected key ${k}`);
        }
      }
    }
  });
  return { ok: problems.length === 0, problems, gaps: problems.length === 0 ? log : [] };
}

const unique = (list) => [...new Set(list)];

function median(values) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Group gaps by id across refs.
 * @param {object[]} gaps valid gap objects from any number of refs
 * @param {Record<string,string>} [surfaces] ref id -> surface
 */
export function groupGaps(gaps, surfaces = {}) {
  const ordered = [...gaps].sort((a, b) => a.ref.localeCompare(b.ref));
  const groups = new Map();
  for (const g of ordered) {
    if (!groups.has(g.id)) groups.set(g.id, []);
    groups.get(g.id).push(g);
  }
  return [...groups].map(([id, members]) => {
    const kindCounts = new Map();
    for (const m of members) kindCounts.set(m.kind, (kindCounts.get(m.kind) ?? 0) + 1);
    const kinds = GAP_KINDS.filter((k) => kindCounts.has(k));
    const kind = kinds.reduce((best, k) => (kindCounts.get(k) > kindCounts.get(best) ? k : best));
    const refs = unique(members.map((m) => m.ref));
    const wants = members.filter((m) => m.want);
    const scales = unique(wants.map((m) => m.want.scale));
    const refSurfaces = unique(refs.map((r) => surfaces[r]).filter(Boolean));
    return {
      id,
      kind,
      kinds,
      needed: members[0].needed,
      refs,
      refCount: refs.length,
      hits: members.length,
      surfaces: refSurfaces,
      // a proposal built only from marketing or editorial refs may pull HDS away from apps
      driftRisk: refSurfaces.length > 0 && !refSurfaces.some((s) => CORE_SURFACES.includes(s)),
      measured: unique(members.map((m) => m.measured).filter(Boolean)),
      nearest: unique(members.map((m) => m.nearest).filter(Boolean)),
      want:
        scales.length === 1
          ? {
              scale: scales[0],
              px: wants.map((m) => m.want.px),
              median: median(wants.map((m) => m.want.px)),
            }
          : null,
      wantScales: scales,
      proposals: unique(members.map((m) => m.proposal)),
      didInstead: unique(members.map((m) => m.didInstead)),
      evidence: members.map((m) => ({ ref: m.ref, evidence: m.evidence })),
    };
  });
}

/**
 * Split grouped gaps into candidates (recurring and not yet decided), logged
 * outliers (fewer refs than the threshold) and suppressed (decided).
 * @param {object[]} gaps valid gap objects
 * @param {{ threshold:number, decisions?:object[], surfaces?:Record<string,string> }} opts
 */
export function clusterGaps(gaps, { threshold, decisions = [], surfaces = {} }) {
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new Error(`threshold must be a positive integer, got ${threshold}`);
  }
  const latest = latestDecisions(decisions);
  const out = { candidates: [], logged: [], suppressed: [] };
  const groups = groupGaps(gaps, surfaces).sort(
    (a, b) => b.refCount - a.refCount || b.hits - a.hits || a.id.localeCompare(b.id),
  );
  for (const g of groups) {
    const d = latest.get(g.id);
    if (d?.decision === 'reject') {
      out.suppressed.push({ ...g, state: 'rejected', reason: d.reason ?? null, decidedAt: d.at });
      continue;
    }
    if (d?.decision === 'approve') {
      out.suppressed.push({ ...g, state: 'approved', reason: d.reason ?? null, decidedAt: d.at });
      continue;
    }
    if (g.refCount < threshold) {
      out.logged.push({ ...g, state: 'logged' });
      continue;
    }
    if (d?.decision === 'defer') {
      if (g.refCount > (d.refCount ?? 0)) {
        out.candidates.push({ ...g, state: 'resurfaced', deferredAt: d.at });
      } else {
        out.suppressed.push({ ...g, state: 'deferred', reason: d.reason ?? null, decidedAt: d.at });
      }
      continue;
    }
    out.candidates.push({ ...g, state: 'new' });
  }
  return out;
}
