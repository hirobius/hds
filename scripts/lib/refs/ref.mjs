/** @internal — helpers for the design-refs pipeline (eval/refs/README.md). */
/**
 * One ref, as it sits on disk:
 *
 *   eval/refs/refs/<ref-id>/
 *     ref.json      what the image is (Drive id, surface, viewport, theme) and its fidelity
 *     src/App.tsx   the rebuild: the current HDS package only, 0 lint violations
 *     gaps.json     what the rebuild could not match, and why
 *     card.md       the text card build agents read instead of the image
 *
 * The image never enters the repository (it is public): ref.json keeps the
 * Drive file id, and the image is cached under reports/refs/sources/ (gitignored).
 *
 * `listRefs` and `readRef` read the disk; everything else is pure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { scanApp } from '../consistency/violations.mjs';
import { lintWithPlugin, mergeLintHits } from '../explorations/plugin-lint.mjs';
import { scanText } from '../explorations/pii.mjs';
import { rubricScore } from './fidelity.mjs';
import { validateRefGapLog } from './gaps.mjs';
import { REF_ID, SURFACES, THEMES, VIEWPORT_WIDTHS, refDate } from './spec.mjs';

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|css)$/i;
const TEXT_FILE = /\.(?:[cm]?[jt]sx?|css|json|md)$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TITLE_MAX = 80;
const CARD_MAX_LINES = 30;
export const CARD_SECTIONS = ['What works', 'Closest tokens', 'Gaps'];
/** The comment `--scaffold` leaves in the stub App.tsx; a ref that still has it is not rebuilt yet. */
export const SCAFFOLD_MARK = 'eval-refs scaffold';

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isUnit = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

/**
 * Problems with ref.json. `fidelity` is null until the ref is scored; once
 * scored, `score` must be what the rubric adds up to (the CLI writes
 * `structure`, `palette` and `measuredAt`).
 * @returns {string[]}
 */
export function validateRefMeta(meta, refId) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta))
    return ['ref.json must be an object'];
  const problems = [];
  const allowed = ['id', 'title', 'surface', 'viewport', 'theme', 'source', 'fidelity', 'tags'];
  for (const k of Object.keys(meta)) if (!allowed.includes(k)) problems.push(`unexpected key ${k}`);
  if (meta.id !== refId) problems.push(`id "${meta.id}" must match its directory (${refId})`);
  if (!isText(meta.title)) problems.push('title must be a non-empty string');
  else if (meta.title.length > TITLE_MAX)
    problems.push(`title must be ${TITLE_MAX} characters or fewer`);
  if (!SURFACES.includes(meta.surface))
    problems.push(`surface must be one of ${SURFACES.join(', ')}`);
  if (!VIEWPORT_WIDTHS.includes(meta.viewport)) {
    problems.push(`viewport must be one of ${VIEWPORT_WIDTHS.join(', ')}`);
  }
  if (!THEMES.includes(meta.theme)) problems.push(`theme must be one of ${THEMES.join(', ')}`);

  const s = meta.source;
  if (!s || typeof s !== 'object' || Array.isArray(s)) problems.push('source must be an object');
  else {
    for (const k of Object.keys(s))
      if (!['drive', 'addedAt'].includes(k)) problems.push(`source has unexpected key ${k}`);
    if (
      !s.drive ||
      typeof s.drive !== 'object' ||
      !isText(s.drive.fileId) ||
      !isText(s.drive.name)
    ) {
      problems.push('source.drive must be { fileId, name }');
    } else {
      for (const k of Object.keys(s.drive))
        if (!['fileId', 'name'].includes(k)) problems.push(`source.drive has unexpected key ${k}`);
    }
    if (typeof s.addedAt !== 'string' || !DATE.test(s.addedAt)) {
      problems.push('source.addedAt must be a date (YYYY-MM-DD)');
    } else if (REF_ID.test(refId) && refDate(refId) !== s.addedAt) {
      problems.push(
        `source.addedAt ${s.addedAt} must match the date in the ref id (${refDate(refId)})`,
      );
    }
  }

  if (meta.fidelity !== null && meta.fidelity !== undefined) {
    const f = meta.fidelity;
    if (typeof f !== 'object' || Array.isArray(f))
      problems.push('fidelity must be an object or null');
    else {
      const fk = ['rubric', 'score', 'structure', 'palette', 'measuredAt', 'hds', 'notes'];
      for (const k of Object.keys(f))
        if (!fk.includes(k)) problems.push(`fidelity has unexpected key ${k}`);
      const r = rubricScore(f.rubric);
      problems.push(...r.problems.map((p) => `fidelity.${p}`));
      if (r.ok && f.score !== r.score) {
        problems.push(`fidelity.score is ${f.score}, but the rubric adds up to ${r.score}`);
      }
      for (const k of ['structure', 'palette']) {
        if (f[k] !== undefined && !isUnit(f[k]))
          problems.push(`fidelity.${k} must be a number from 0 to 1`);
      }
      if (
        f.measuredAt !== undefined &&
        (typeof f.measuredAt !== 'string' || !DATE.test(f.measuredAt))
      ) {
        problems.push('fidelity.measuredAt must be a date (YYYY-MM-DD)');
      }
      if (f.hds !== undefined && !isText(f.hds))
        problems.push('fidelity.hds must be the HDS version the rebuild was rendered with');
      if (f.notes !== undefined && !isText(f.notes))
        problems.push('fidelity.notes must be a non-empty string');
    }
  }
  if (meta.tags !== undefined) {
    if (
      !Array.isArray(meta.tags) ||
      !meta.tags.every((t) => typeof t === 'string' && /^[a-z0-9-]+$/.test(t))
    ) {
      problems.push('tags must be an array of lowercase kebab-case words');
    }
  }
  return problems;
}

/**
 * Problems with card.md: a title line, then the three sections in order, short
 * enough to read in a glance, text only, and naming every gap the log has.
 * @param {string} text
 * @param {string[]} gapIds the ids in the ref's gaps.json
 */
export function validateCard(text, gapIds = []) {
  const problems = [];
  const lines = String(text).split('\n');
  const filled = lines.filter((l) => l.trim());
  if (!filled[0]?.startsWith('# ')) problems.push('card.md must start with a "# <title>" line');
  if (filled.length > CARD_MAX_LINES) {
    problems.push(
      `card.md is ${filled.length} lines; keep it to ${CARD_MAX_LINES} so it reads at a glance`,
    );
  }
  const headings = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3).trim());
  const want = CARD_SECTIONS.join(' / ');
  if (headings.join(' / ') !== want) problems.push(`card.md sections must be exactly: ${want}`);
  if (/!\[/.test(text) || /<img/i.test(text)) problems.push('card.md is text only: no images');
  if (lines.some((l) => /^\s*[-*]\s*$/.test(l)))
    problems.push('card.md has an empty bullet: fill it in or remove it');
  const gapsSection = String(text).split(/^## Gaps\s*$/m)[1] ?? '';
  for (const id of gapIds) {
    if (!gapsSection.includes(`\`${id}\``))
      problems.push(`card.md "Gaps" must name \`${id}\` (it is in gaps.json)`);
  }
  if (gapIds.length === 0 && gapsSection && !/none/i.test(gapsSection)) {
    problems.push('card.md "Gaps" must say "None" when gaps.json is empty');
  }
  return problems;
}

function readJson(file) {
  if (!existsSync(file)) return { present: false };
  try {
    return { present: true, value: JSON.parse(readFileSync(file, 'utf8')) };
  } catch (err) {
    return { present: true, error: err.message };
  }
}

function readTree(dir, base, out) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) readTree(full, base, out);
    else if (TEXT_FILE.test(name))
      out[path.relative(base, full).split(path.sep).join('/')] = readFileSync(full, 'utf8');
  }
}

/** Ref ids under the refs directory, and any directory that is not one. */
export function listRefs(refsDir) {
  if (!existsSync(refsDir)) return { ids: [], ignored: [] };
  const ids = [];
  const ignored = [];
  for (const name of readdirSync(refsDir).sort()) {
    if (!statSync(path.join(refsDir, name)).isDirectory()) continue;
    (REF_ID.test(name) ? ids : ignored).push(name);
  }
  return { ids, ignored };
}

export function readRef(refsDir, id) {
  const dir = path.join(refsDir, id);
  const texts = {};
  readTree(dir, dir, texts);
  const files = Object.fromEntries(
    Object.entries(texts).filter(([rel]) => rel.startsWith('src/') && SOURCE_FILE.test(rel)),
  );
  const card = path.join(dir, 'card.md');
  return {
    id,
    dir,
    files,
    texts,
    meta: readJson(path.join(dir, 'ref.json')),
    gaps: readJson(path.join(dir, 'gaps.json')),
    card: existsSync(card)
      ? { present: true, text: readFileSync(card, 'utf8') }
      : { present: false },
  };
}

const check = (name, problems, text) => ({
  name,
  status: problems.length === 0 ? 'pass' : 'fail',
  text:
    problems.length === 0 ? text : `${problems.length} problem${problems.length === 1 ? '' : 's'}`,
  detail: problems,
});

/**
 * Judge one ref from its files: meta, lint (0 violations: a rebuild uses the
 * system as it is), gap log, card and PII. Building, rendering and axe are the
 * live half (the CLI's --render).
 * @param {ReturnType<typeof readRef>} ref
 * @param {{ denylist?:string[] }} [ctx]
 */
export function judgeRef(ref, { denylist = [] } = {}) {
  const metaProblems = [];
  if (!REF_ID.test(ref.id)) metaProblems.push(`"${ref.id}" is not a ref id (YYYY-MM-DD-slug)`);
  if (!ref.meta.present) metaProblems.push('ref.json is missing');
  else if (ref.meta.error) metaProblems.push(`ref.json is not valid JSON (${ref.meta.error})`);
  else {
    metaProblems.push(...validateRefMeta(ref.meta.value, ref.id).map((p) => `ref.json: ${p}`));
    if (ref.meta.value && typeof ref.meta.value === 'object' && !ref.meta.value.fidelity) {
      metaProblems.push(
        'ref.json: fidelity is not scored yet (fill fidelity.rubric and score, then --render --record)',
      );
    }
  }

  const hits = ref.files['src/App.tsx']
    ? mergeLintHits(scanApp(ref.files), lintWithPlugin(ref.files))
    : [];
  const lintProblems = ref.files['src/App.tsx']
    ? hits.map((h) => `${h.file}:${h.line} ${h.kind} ${h.match}`)
    : ['src/App.tsx is missing'];
  if (Object.values(ref.files).some((t) => t.includes(SCAFFOLD_MARK))) {
    lintProblems.push('src/App.tsx is still the scaffold stub: rebuild the image');
  }

  const gapProblems = [];
  let gapIds = [];
  if (!ref.gaps.present)
    gapProblems.push('gaps.json is missing; write [] when the rebuild needed nothing');
  else if (ref.gaps.error) gapProblems.push(`gaps.json is not valid JSON (${ref.gaps.error})`);
  else {
    const r = validateRefGapLog(ref.gaps.value, ref.id);
    gapProblems.push(...r.problems);
    if (r.ok) gapIds = [...new Set(r.gaps.map((g) => g.id))];
  }

  const cardProblems = ref.card.present
    ? validateCard(ref.card.text, gapIds)
    : ['card.md is missing'];

  const pii = Object.entries(ref.texts).flatMap(([file, text]) =>
    scanText(text, { file, denylist }),
  );

  const checks = [
    check('meta', metaProblems, 'ref.json is valid'),
    check('lint', lintProblems, '0 violations'),
    check('gaps', gapProblems, `${gapIds.length} gap id${gapIds.length === 1 ? '' : 's'}`),
    check('card', cardProblems, 'card.md is valid'),
    check(
      'pii',
      pii.map((f) => `${f.file}:${f.line} ${f.kind} ${f.match}`),
      'nothing that looks like real personal data',
    ),
  ];
  return { id: ref.id, pass: checks.every((c) => c.status === 'pass'), checks };
}
