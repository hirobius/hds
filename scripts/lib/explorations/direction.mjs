/** @internal — pure helpers for the design-explorations spec set (hds#628). */
/**
 * One direction of one screen, as it sits on disk:
 *
 *   runs/<date>/<screen>-<A|B|C>/
 *     src/App.tsx (+ any files under src/)   what the harness builds
 *     rationale.md                           one line
 *     refs.json                              the tenant, the 21st searches, the links and what was taken
 *     bend-log.json                          C only: each lint violation it accepts + the system change that would make it legal
 *     gaps.json                              the gap log
 *
 * This module reads that layout and validates the files that are not gap logs
 * (those are in gaps.mjs). Everything but `readTenants`, `listDirections` and
 * `readDirection` is pure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import hds from '../../eslint-plugin-hds/index.mjs';
import { parseDirectionId, screenOrder } from './spec.mjs';

/** What the harness's violation scan reports. */
export const SCANNER_KINDS = ['hex', 'colour-fn', 'px', 'raw-control', 'custom-css', 'tailwind'];

/**
 * The lint plugin's error rules (its `recommended` config), which the gate runs
 * beside the scan (plugin-lint.mjs). Read from the plugin, so a rule it adds or
 * promotes to error is gated without an edit here.
 */
export const PLUGIN_KINDS = Object.entries(
  Object.assign({}, ...hds.configs.recommended.map((c) => c.rules)),
)
  .filter(([, level]) => level === 'error')
  .map(([id]) => id)
  .sort();

/** Every violation a C bend may name, plus the DESIGN.md rules no tool can see. */
export const BEND_KINDS = [...SCANNER_KINDS, ...PLUGIN_KINDS, 'design-rule'];

const BEND_KEYS = {
  scanner: { required: ['kind', 'file', 'match', 'why', 'change'], optional: [] },
  rule: { required: ['kind', 'rule', 'why', 'change'], optional: ['file'] },
};

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Problems with the contents of one bend-log.json. A bend is either a scanner
 * violation the code contains (`kind` is a scan kind or a lint plugin rule, named by `file`
 * and the exact `match`), or a DESIGN.md rule the code bends that no scanner can
 * see (`kind: 'design-rule'`, named by `rule`: gradients, glass and glow). Both
 * say why, and what system change would make the bend legal.
 * @returns {{ ok:boolean, problems:string[], bends:object[] }}
 */
export function validateBendLog(log) {
  if (!Array.isArray(log)) {
    return { ok: false, problems: ['a bend log must be an array (use [] for none)'], bends: [] };
  }
  const problems = [];
  log.forEach((b, i) => {
    const at = `bend ${i + 1}`;
    if (!b || typeof b !== 'object' || Array.isArray(b)) {
      problems.push(`${at}: must be an object`);
      return;
    }
    if (!BEND_KINDS.includes(b.kind)) {
      problems.push(`${at}: kind "${b.kind}" is not one of ${BEND_KINDS.join(', ')}`);
      return;
    }
    const spec = BEND_KEYS[b.kind === 'design-rule' ? 'rule' : 'scanner'];
    for (const k of spec.required) {
      if (b[k] === undefined) problems.push(`${at}: missing ${k}`);
      else if (!isText(b[k])) problems.push(`${at}: ${k} must be a non-empty string`);
    }
    for (const k of Object.keys(b)) {
      if (![...spec.required, ...spec.optional].includes(k)) {
        problems.push(`${at}: unexpected key ${k}`);
      }
    }
  });
  return { ok: problems.length === 0, problems, bends: problems.length === 0 ? log : [] };
}

const hitKey = (h) => `${h.kind}\u0000${h.file}\u0000${h.match}`;

/**
 * Split violations by whether a bend accepts them. A bend covers every
 * occurrence of its text in its file, whatever the line, because lines move as
 * a direction is edited. A scanner bend that matches nothing is stale: the log
 * must say what the code does.
 * @param {{kind:string,file:string,line:number,match:string}[]} hits
 * @param {object[]} bends valid bends
 */
export function matchBends(hits, bends) {
  const scanner = bends.filter((b) => b.kind !== 'design-rule');
  const accepted = new Set(scanner.map(hitKey));
  const seen = new Set(hits.map(hitKey));
  return {
    listed: hits.filter((h) => accepted.has(hitKey(h))),
    unlisted: hits.filter((h) => !accepted.has(hitKey(h))),
    stale: scanner.filter((b) => !seen.has(hitKey(b))),
  };
}

const RATIONALE_MAX = 240;

/** Problems with rationale.md: one non-empty line, short enough to sit under a board tab. */
export function validateRationale(text) {
  const lines = String(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return ['rationale.md is empty'];
  if (lines.length > 1) return [`rationale.md must be one line, found ${lines.length}`];
  if (lines[0].length > RATIONALE_MAX) {
    return [`rationale.md is ${lines[0].length} characters; keep it to ${RATIONALE_MAX} or fewer`];
  }
  return [];
}

/** The 21st MCP's read-only tools; any other tool changes or deletes something on the account. */
export const SEARCH_TOOLS = ['search', 'get_inspiration', 'get_theme', 'get_component'];

/**
 * Problems with refs.json. `tenant` is the demo tenant the harness applies when
 * it renders the direction (`null` is the HDS default): A is Faithful, so it
 * renders at the default; B pushes tokens through a tenant overlay, so it must
 * declare one; C may do either. Only a tenant with `"demo": true` is accepted:
 * a client tenant never reaches a board.
 * @param {unknown} data parsed file contents
 * @param {{ letter:string, tenants:Record<string,{demo:boolean}> }} ctx
 * @returns {{ ok:boolean, problems:string[], tenant:string|null }}
 */
export function validateRefs(data, { letter, tenants }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, problems: ['refs.json must be an object'], tenant: null };
  }
  const problems = [];
  for (const k of Object.keys(data)) {
    if (!['tenant', 'searches', 'refs'].includes(k)) problems.push(`unexpected key ${k}`);
  }

  let tenant = null;
  if (data.tenant !== undefined && data.tenant !== null) {
    if (typeof data.tenant !== 'string') {
      problems.push('tenant must be a tenant slug or null');
    } else if (!(data.tenant in tenants)) {
      problems.push(`tenant "${data.tenant}": there is no tenant "${data.tenant}" under tenants/`);
    } else if (tenants[data.tenant].demo !== true) {
      problems.push(
        `tenant "${data.tenant}" is not a demo tenant; only a tenant with "demo": true in its metadata.json may be rendered on a board`,
      );
    } else {
      tenant = data.tenant;
    }
  }
  if (letter === 'A' && data.tenant) {
    problems.push('direction A renders at the HDS default; set tenant to null');
  }
  if (letter === 'B' && !data.tenant) {
    problems.push(
      'direction B must declare a demo tenant: it pushes tokens through a tenant overlay',
    );
  }

  if (!Array.isArray(data.searches)) {
    problems.push(data.searches === undefined ? 'missing searches' : 'searches must be an array');
  } else {
    data.searches.forEach((s, i) => {
      const at = `search ${i + 1}`;
      if (!s || typeof s !== 'object') return problems.push(`${at}: must be an object`);
      if (!SEARCH_TOOLS.includes(s.tool)) {
        problems.push(`${at}: tool "${s.tool}" is not one of ${SEARCH_TOOLS.join(', ')}`);
      }
      if (!isText(s.query)) problems.push(`${at}: query must be a non-empty string`);
      if (s.tool === 'get_component' && !isText(s.reason)) {
        problems.push(
          `${at}: a get_component call needs a reason (why the preview was not enough)`,
        );
      }
      for (const k of Object.keys(s)) {
        if (!['tool', 'query', 'reason'].includes(k)) problems.push(`${at}: unexpected key ${k}`);
      }
    });
  }

  if (!Array.isArray(data.refs)) {
    problems.push(data.refs === undefined ? 'missing refs' : 'refs must be an array');
  } else {
    data.refs.forEach((r, i) => {
      const at = `ref ${i + 1}`;
      if (!r || typeof r !== 'object') return problems.push(`${at}: must be an object`);
      let https = false;
      try {
        https = new URL(r.url).protocol === 'https:';
      } catch {
        https = false;
      }
      if (!https) problems.push(`${at}: url must be an https URL`);
      if (!isText(r.took)) problems.push(`${at}: took must be a non-empty string`);
      for (const k of Object.keys(r)) {
        if (!['url', 'took'].includes(k)) problems.push(`${at}: unexpected key ${k}`);
      }
    });
  }
  return { ok: problems.length === 0, problems, tenant };
}

/** `{ slug: { demo } }` for every tenant under tenantsDir, skipping `_`-prefixed directories. */
export function readTenants(tenantsDir) {
  const out = {};
  if (!existsSync(tenantsDir)) return out;
  for (const name of readdirSync(tenantsDir).sort()) {
    if (name.startsWith('_')) continue;
    try {
      const meta = JSON.parse(readFileSync(path.join(tenantsDir, name, 'metadata.json'), 'utf8'));
      out[meta.slug ?? name] = { demo: meta.demo === true };
    } catch {
      // no readable metadata: not a tenant the gates can vouch for
    }
  }
  return out;
}

/** The directions under a run directory, in the order of the hds#628 table; and what it ignored. */
export function listDirections(runDir) {
  const ids = [];
  const ignored = [];
  for (const name of readdirSync(runDir).sort()) {
    if (!statSync(path.join(runDir, name)).isDirectory()) continue;
    if (parseDirectionId(name)) ids.push(name);
    else ignored.push(name);
  }
  ids.sort((a, b) => {
    const pa = parseDirectionId(a);
    const pb = parseDirectionId(b);
    return screenOrder(pa.screen) - screenOrder(pb.screen) || pa.letter.localeCompare(pb.letter);
  });
  return { ids, ignored };
}

// What the consistency harness reads from an app's src/ (scripts/eval-consistency.mjs).
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|html?|css|scss|sass|less)$/i;
const TEXT_FILE = /\.(?:json|md|mdx|txt|[cm]?[jt]sx?|html?|css|scss|sass|less|svg|csv|ya?ml)$/i;

function readTextTree(dir, base, out) {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) readTextTree(full, base, out);
    else if (TEXT_FILE.test(name)) {
      out[path.relative(base, full).split(path.sep).join('/')] = readFileSync(full, 'utf8');
    }
  }
}

function readJson(file) {
  if (!existsSync(file)) return { present: false };
  const text = readFileSync(file, 'utf8');
  try {
    return { present: true, value: JSON.parse(text) };
  } catch (err) {
    return { present: true, error: err.message };
  }
}

/**
 * Read one direction from disk.
 * @returns {{ id:string, screen:string, letter:string, dir:string,
 *   files:Record<string,string>, texts:Record<string,string>,
 *   meta:{ rationale:object, refs:object, bendLog:object, gaps:object } }}
 *   `files` is what the harness scans (src/ sources); `texts` is every text file
 *   in the direction, which is what would be published, and what the PII check reads.
 */
export function readDirection(runDir, id) {
  const parsed = parseDirectionId(id);
  if (!parsed) throw new Error(`${id} is not a direction id (<screen>-<A|B|C>)`);
  const dir = path.join(runDir, id);
  const texts = {};
  readTextTree(dir, dir, texts);
  const files = Object.fromEntries(
    Object.entries(texts).filter(([rel]) => rel.startsWith('src/') && SOURCE_FILE.test(rel)),
  );
  const rationale = path.join(dir, 'rationale.md');
  return {
    id,
    screen: parsed.screen,
    letter: parsed.letter,
    dir,
    files,
    texts,
    meta: {
      rationale: existsSync(rationale)
        ? { present: true, text: readFileSync(rationale, 'utf8') }
        : { present: false },
      refs: readJson(path.join(dir, 'refs.json')),
      bendLog: readJson(path.join(dir, 'bend-log.json')),
      gaps: readJson(path.join(dir, 'gaps.json')),
    },
  };
}
