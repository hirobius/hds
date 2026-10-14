#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * eval-refs — the design-refs pipeline (eval/refs/README.md).
 *
 * Adrian saves images he likes to Drive "Design Refs". A nightly Claude run
 * (eval/refs/RUNBOOK.md) rebuilds each new one with only the current HDS
 * package, scores it, logs every gap, and turns gaps that recur across refs
 * into proposals he approves, rejects or defers from a phone board. This CLI
 * is the deterministic half: it never calls a model and never touches Drive.
 * The judgement (the rebuild, the rubric, the proposal text) is the agent's;
 * the checks, the clustering, the scale and blast-radius facts, the measured
 * fidelity, the index and the board are here.
 *
 * Pure logic: scripts/lib/refs/*.mjs. Live stages: scripts/lib/consistency/.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { liveStages } from './lib/consistency/live-stages.mjs';
import { evaluateScan } from './lib/axe-gate.mjs';
import { failedStages, trimBuildLog } from './lib/consistency/live-plan.mjs';
import { formatChecks } from './lib/explorations/gates.mjs';
import { findUsages } from './lib/refs/blast.mjs';
import { buildReviewBoard } from './lib/refs/board.mjs';
import { latestDecisions, newBoardDecisions, validateDecisions } from './lib/refs/decisions.mjs';
import { COMPARE_WIDTH, compareImages, fidelityFlags } from './lib/refs/fidelity.mjs';
import { clusterGaps } from './lib/refs/gaps.mjs';
import { renderIndex } from './lib/refs/index-md.mjs';
import { validateProposal } from './lib/refs/proposal.mjs';
import { SCAFFOLD_MARK, judgeRef, listRefs, readRef } from './lib/refs/ref.mjs';
import { assessValue, readScale } from './lib/refs/scale.mjs';
import {
  DEFAULT_THRESHOLD,
  PATHS,
  REF_ID,
  SURFACES,
  THEMES,
  VIEWPORTS,
  VIEWPORT_WIDTHS,
  refDate,
} from './lib/refs/spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (p) => path.join(ROOT, p);

const HELP = `Usage: node scripts/eval-refs.mjs <mode>   (pnpm eval:refs -- <mode>)

Source only (no network, no browser):
  --check                  Gate every ref under eval/refs/refs/ (ref.json, 0 lint violations,
                           gaps.json, card.md, PII), decisions.json, every proposal against
                           the current candidates, and that INDEX.md is fresh. Exit 1 on a
                           failure, with file and reason.
  --scaffold <ref-id> --drive-id <id> --name <file name> --surface <s> --viewport <390|1280>
             [--theme light|dark] [--title <text>]
                           Create eval/refs/refs/<ref-id>/ with ref.json, an empty gaps.json,
                           a card.md outline and a src/App.tsx stub. Refuses an existing ref.
  --vocab                  Every gap id in use (eval/refs/gap-ids.json and every ref's log),
                           with how many refs hit it. Read it before naming a gap.
  --candidates [--json]    Cluster every gap log: candidates (threshold or more refs, not
                           decided), logged outliers and decided ones, with scale facts for
                           token gaps that carry a "want".
  --scale <scale> <px>     Where <px> would sit on a token scale (primitive.space, primitive.size,
                           primitive.radius, primitive.typography.size) and how risky it is.
  --blast <token-path>     Tokens that alias it and files under src/ that read it.
  --index [--write]        Print INDEX.md, or write it.
  --merge-decisions <file> Append the review board's new decisions to decisions.json. <file> is
                           the board's "decisions" collection as JSON: [{ id, decision, reason,
                           decidedAt }] (ArtifactData list output, flattened).
  --diff <dir-a> <dir-b>   Pixel-diff every PNG the two directories share (renders before and
                           after a change): the visual diff of existing pages for a proposal.
  --board <out.html>       Build the review board page from the proposals, with the images
                           under reports/refs/ inlined (needs Chromium to scale them).

Live (needs the npm registry and Chromium; PLAYWRIGHT_BROWSERS_PATH, /opt/pw-browsers remotely):
  --render <ref-id>... | --render --all [--record] [--skip-build] [--out <dir>]
                           Pack the library, build each rebuild in the template, render it
                           full page at its viewport and theme, axe-scan it, and when the
                           original is cached under reports/refs/sources/<ref-id>.<ext>,
                           measure structure and palette against it. PNGs go to
                           reports/refs/renders/ (or <out>). --record writes the measured
                           pair and the HDS version into each ref.json.

  --help                   Show this help.

Exit codes: 0 pass, 1 a check failed (named), 2 usage, input or environment error.
`;

function fail(message) {
  console.error(`eval-refs: ${message}\n\nRun with --help for usage.`);
  process.exit(2);
}

function parse(argv) {
  const args = argv.filter((a) => a !== '--');
  const o = { mode: null, values: [], flags: {} };
  const MODES = [
    '--check',
    '--scaffold',
    '--vocab',
    '--candidates',
    '--scale',
    '--blast',
    '--index',
    '--merge-decisions',
    '--diff',
    '--board',
    '--render',
    '--help',
    '-h',
  ];
  const VALUED = ['--drive-id', '--name', '--surface', '--viewport', '--theme', '--title', '--out'];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (MODES.includes(a)) {
      if (o.mode) fail(`pick one mode (got ${o.mode} and ${a})`);
      o.mode = a === '-h' ? '--help' : a;
    } else if (VALUED.includes(a)) {
      const v = args[i + 1];
      if (v === undefined || v.startsWith('--')) fail(`${a} needs a value`);
      o.flags[a.slice(2)] = v;
      i += 1;
    } else if (['--write', '--json', '--record', '--skip-build', '--all'].includes(a)) {
      o.flags[a.slice(2)] = true;
    } else if (a.startsWith('--')) fail(`unknown argument ${a}`);
    else o.values.push(a);
  }
  return o;
}

function readJsonFile(rel, fallback) {
  const file = at(rel);
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return fail(`${rel} is not valid JSON (${err.message})`);
  }
}

function config() {
  const c = readJsonFile(PATHS.config, {});
  const threshold = c.threshold ?? DEFAULT_THRESHOLD;
  if (!Number.isInteger(threshold) || threshold < 2)
    fail(`${PATHS.config}: threshold must be a whole number of 2 or more`);
  return { ...c, threshold };
}

const tokens = () => readJsonFile('hirobius.tokens.json', {});

/** Every ref, read and judged. */
function loadRefs() {
  const { ids, ignored } = listRefs(at(PATHS.refs));
  const refs = ids.map((id) => readRef(at(PATHS.refs), id));
  return { refs, ignored };
}

/** The valid gaps of every ref whose gap log validates, and each ref's surface. */
function corpus(refs) {
  const gaps = [];
  const surfaces = {};
  const meta = {};
  for (const r of refs) {
    if (r.meta.value && typeof r.meta.value === 'object') {
      surfaces[r.id] = r.meta.value.surface;
      meta[r.id] = r.meta.value;
    }
    if (Array.isArray(r.gaps.value))
      gaps.push(...r.gaps.value.filter((g) => g && g.ref === r.id && g.id));
  }
  return { gaps, surfaces, meta };
}

function decisions() {
  const list = readJsonFile(PATHS.decisions, []);
  return { list, ...validateDecisions(list) };
}

function clusters(refs, cfg, decided) {
  const { gaps, surfaces } = corpus(refs);
  const out = clusterGaps(gaps, { threshold: cfg.threshold, decisions: decided, surfaces });
  const t = tokens();
  for (const g of out.candidates) {
    if (g.want) g.scaleFacts = assessValue(readScale(t, g.want.scale), g.want.median);
  }
  return out;
}

function indexText(refs, cfg, decided) {
  const valid = refs.filter((r) => judgeRef(r).pass);
  const rows = valid.map((r) => ({
    id: r.id,
    meta: r.meta.value,
    gapIds: [...new Set(r.gaps.value.map((g) => g.id))],
    card: r.card.text,
  }));
  return renderIndex(rows, clusters(valid, cfg, decided), { threshold: cfg.threshold });
}

function readProposals() {
  const dir = at(PATHS.proposals);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const id = f.replace(/\.json$/, '');
      try {
        return {
          id,
          file: `${PATHS.proposals}/${f}`,
          value: JSON.parse(readFileSync(path.join(dir, f), 'utf8')),
        };
      } catch (err) {
        return { id, file: `${PATHS.proposals}/${f}`, error: err.message };
      }
    });
}

function check() {
  const cfg = config();
  const { refs, ignored } = loadRefs();
  let failed = false;
  const line = (s) => console.log(s);
  if (ignored.length) {
    failed = true;
    line(`FAIL layout: not a ref id (YYYY-MM-DD-slug): ${ignored.join(', ')}`);
  }
  for (const r of refs) {
    const j = judgeRef(r);
    if (!j.pass) failed = true;
    for (const l of formatChecks(
      r.id,
      j.checks.filter((c) => c.status === 'fail'),
    ))
      line(l);
  }
  const d = decisions();
  if (!d.ok) {
    failed = true;
    line('FAIL decisions.json:');
    for (const p of d.problems) line(`    ${p}`);
  }
  const decided = d.ok ? d.decisions : [];
  const valid = refs.filter((r) => judgeRef(r).pass);
  const c = clusters(valid, cfg, decided);
  const byId = new Map(c.candidates.map((g) => [g.id, g]));
  const latest = latestDecisions(decided);
  for (const p of readProposals()) {
    // a decided proposal stays on disk as the record; it is checked again only once it resurfaces
    if (latest.has(p.id) && !byId.has(p.id)) continue;
    const problems = p.error
      ? [`not valid JSON (${p.error})`]
      : validateProposal(p.value, {
          id: p.id,
          candidate: byId.get(p.id) ?? null,
          threshold: cfg.threshold,
          refIds: refs.map((r) => r.id),
        });
    if (problems.length) {
      failed = true;
      line(`FAIL proposal ${p.file}:`);
      for (const x of problems) line(`    ${x}`);
    }
  }
  const committed = existsSync(at(PATHS.index)) ? readFileSync(at(PATHS.index), 'utf8') : null;
  if (committed !== indexText(refs, cfg, decided)) {
    failed = true;
    line(`FAIL index: ${PATHS.index} is stale; run pnpm eval:refs -- --index --write`);
  }
  line(
    failed
      ? 'RESULT: FAIL'
      : `RESULT: PASS (${refs.length} ref${refs.length === 1 ? '' : 's'}, ${c.candidates.length} candidate${c.candidates.length === 1 ? '' : 's'}, ${decided.length} decision${decided.length === 1 ? '' : 's'})`,
  );
  process.exit(failed ? 1 : 0);
}

function scaffold(values, flags) {
  const [id] = values;
  if (!id || !REF_ID.test(id)) fail('--scaffold needs a ref id: YYYY-MM-DD-kebab-slug');
  const dir = path.join(at(PATHS.refs), id);
  if (existsSync(dir)) fail(`${PATHS.refs}/${id} already exists`);
  for (const k of ['drive-id', 'name', 'surface', 'viewport'])
    if (!flags[k]) fail(`--scaffold needs --${k}`);
  if (!SURFACES.includes(flags.surface)) fail(`--surface must be one of ${SURFACES.join(', ')}`);
  const viewport = Number(flags.viewport);
  if (!VIEWPORT_WIDTHS.includes(viewport))
    fail(`--viewport must be one of ${VIEWPORT_WIDTHS.join(', ')}`);
  const theme = flags.theme ?? 'light';
  if (!THEMES.includes(theme)) fail(`--theme must be one of ${THEMES.join(', ')}`);
  const title = flags.title ?? id.slice(11).replace(/-/g, ' ');
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  const meta = {
    id,
    title: title[0].toUpperCase() + title.slice(1),
    surface: flags.surface,
    viewport,
    theme,
    source: { drive: { fileId: flags['drive-id'], name: flags.name }, addedAt: refDate(id) },
    fidelity: null,
  };
  writeFileSync(path.join(dir, 'ref.json'), `${JSON.stringify(meta, null, 2)}\n`);
  writeFileSync(path.join(dir, 'gaps.json'), '[]\n');
  writeFileSync(
    path.join(dir, 'card.md'),
    `# ${meta.title}\n\n${meta.surface} · ${viewport} ${theme} · fidelity not scored\n\n## What works\n\n- \n\n## Closest tokens\n\n- \n\n## Gaps\n\n- None\n`,
  );
  writeFileSync(
    path.join(dir, 'src/App.tsx'),
    `import { Stack, Text } from '@hirobius/design-system';\n\n// ${SCAFFOLD_MARK}: replace this stub with the rebuild.\nexport default function App() {\n  return (\n    <Stack gap="normal">\n      <Text variant="title">Rebuild in progress</Text>\n    </Stack>\n  );\n}\n`,
  );
  console.log(`created ${PATHS.refs}/${id}/ (ref.json, gaps.json, card.md, src/App.tsx)`);
}

function vocab() {
  const seeded = readJsonFile(PATHS.vocab, { ids: [] }).ids ?? [];
  const { refs } = loadRefs();
  const { gaps } = corpus(refs);
  const counts = new Map();
  for (const g of gaps) {
    if (!counts.has(g.id)) counts.set(g.id, { refs: new Set(), kind: g.kind, needed: g.needed });
    counts.get(g.id).refs.add(g.ref);
  }
  const rows = new Map(
    seeded.map((s) => [s.id, { id: s.id, kind: s.kind, summary: s.summary, refs: 0 }]),
  );
  for (const [id, c] of counts) {
    const row = rows.get(id) ?? { id, kind: c.kind, summary: c.needed, refs: 0 };
    row.refs = c.refs.size;
    rows.set(id, row);
  }
  const list = [...rows.values()].sort((a, b) => b.refs - a.refs || a.id.localeCompare(b.id));
  for (const r of list)
    console.log(`${r.id}  ${r.kind}  ${r.refs} ref${r.refs === 1 ? '' : 's'}  ${r.summary}`);
}

function candidates(flags) {
  const cfg = config();
  const { refs } = loadRefs();
  const d = decisions();
  if (!d.ok) fail(`${PATHS.decisions} is invalid: ${d.problems[0]}`);
  const c = clusters(
    refs.filter((r) => judgeRef(r).pass),
    cfg,
    d.decisions,
  );
  if (flags.json) {
    console.log(JSON.stringify({ threshold: cfg.threshold, ...c }, null, 2));
    return;
  }
  console.log(`candidates (${c.candidates.length}), threshold ${cfg.threshold} refs:`);
  for (const g of c.candidates) {
    console.log(
      `  ${g.id}  ${g.kind}  ${g.refCount} refs (${g.refs.join(', ')})  ${g.state}${g.driftRisk ? '  DRIFT: no app or dashboard ref' : ''}`,
    );
    console.log(`    needed: ${g.needed}`);
    for (const m of g.measured) console.log(`    measured: ${m}`);
    if (g.scaleFacts)
      console.log(
        `    scale ${g.want.scale}: ${g.scaleFacts.position}, ${g.scaleFacts.px}px, risk ${g.scaleFacts.risk}; ${g.scaleFacts.notes.join('; ')}`,
      );
  }
  console.log(
    `logged below the threshold (${c.logged.length}): ${c.logged.map((g) => `${g.id} ${g.refCount}`).join(', ') || 'none'}`,
  );
  console.log(
    `decided (${c.suppressed.length}): ${c.suppressed.map((g) => `${g.id} ${g.state}`).join(', ') || 'none'}`,
  );
}

function scale(values) {
  const [scalePath, px] = values;
  if (!scalePath || !Number(px))
    fail('--scale needs a scale path and a px value, e.g. --scale primitive.space 160');
  const steps = readScale(tokens(), scalePath);
  console.log(
    JSON.stringify(
      { scale: scalePath, steps, assessment: assessValue(steps, Number(px)) },
      null,
      2,
    ),
  );
}

function blast(values) {
  if (!values[0]) fail('--blast needs a token path, e.g. --blast primitive.space.32');
  console.log(JSON.stringify(findUsages(ROOT, tokens(), values[0]), null, 2));
}

function index(flags) {
  const cfg = config();
  const { refs } = loadRefs();
  const d = decisions();
  if (!d.ok) fail(`${PATHS.decisions} is invalid: ${d.problems[0]}`);
  const text = indexText(refs, cfg, d.decisions);
  if (flags.write) {
    writeFileSync(at(PATHS.index), text);
    console.log(`wrote ${PATHS.index}`);
  } else process.stdout.write(text);
}

function mergeDecisions(values) {
  const file = values[0];
  if (!file) fail('--merge-decisions needs the board export file');
  let board;
  try {
    board = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
  } catch (err) {
    return fail(`${file} is not readable JSON (${err.message})`);
  }
  if (!Array.isArray(board))
    fail(`${file} must be an array of { id, decision, reason, decidedAt }`);
  const cfg = config();
  const d = decisions();
  if (!d.ok) fail(`${PATHS.decisions} is invalid: ${d.problems[0]}`);
  const { refs } = loadRefs();
  const { gaps, surfaces } = corpus(refs);
  const all = clusterGaps(gaps, { threshold: cfg.threshold, decisions: [], surfaces });
  const refCounts = Object.fromEntries(
    [...all.candidates, ...all.logged].map((g) => [g.id, g.refCount]),
  );
  const { entries, problems } = newBoardDecisions(d.decisions, board, refCounts);
  for (const p of problems) console.log(`SKIP ${p}`);
  if (entries.length) {
    writeFileSync(at(PATHS.decisions), `${JSON.stringify([...d.list, ...entries], null, 2)}\n`);
  }
  for (const e of entries)
    console.log(`recorded ${e.decision} ${e.proposal}${e.reason ? ` (${e.reason})` : ''}`);
  console.log(`${entries.length} new decision${entries.length === 1 ? '' : 's'}`);
  process.exit(problems.length ? 1 : 0);
}

function diff(values) {
  const [a, b] = values.map((v) => (v ? path.resolve(v) : v));
  if (!a || !b || !existsSync(a) || !existsSync(b))
    fail('--diff needs two existing directories of PNGs');
  const shared = readdirSync(a)
    .filter((f) => f.endsWith('.png') && existsSync(path.join(b, f)))
    .sort();
  if (shared.length === 0) fail('the two directories share no PNG file names');
  return import('./lib/consistency/pixeldiff.mjs').then(({ diffPng }) => {
    const rows = shared.map((f) => ({
      file: f,
      ...diffPng(readFileSync(path.join(a, f)), readFileSync(path.join(b, f))),
    }));
    for (const r of rows)
      console.log(
        `${r.file}  ${r.diffPct.toFixed(2)}% of pixels differ (${r.inkedDiffPct.toFixed(2)}% of inked)`,
      );
    const changed = rows.filter((r) => r.diffPixels > 0).length;
    console.log(`${changed} of ${rows.length} page${rows.length === 1 ? '' : 's'} changed`);
  });
}

/** The cached original of a ref: reports/refs/sources/<ref-id>.<ext>. */
function sourceFile(id) {
  const dir = at(PATHS.sources);
  if (!existsSync(dir)) return null;
  const f = readdirSync(dir).find((n) => n.startsWith(`${id}.`));
  return f ? path.join(dir, f) : null;
}

async function board(values) {
  const out = values[0];
  if (!out) fail('--board needs an output file, e.g. reports/refs/board.html');
  const cfg = config();
  const { refs } = loadRefs();
  const d = decisions();
  if (!d.ok) fail(`${PATHS.decisions} is invalid: ${d.problems[0]}`);
  const valid = refs.filter((r) => judgeRef(r).pass);
  const c = clusters(valid, cfg, d.decisions);
  const byId = new Map(c.candidates.map((g) => [g.id, g]));
  const { meta } = corpus(refs);
  const open = readProposals().filter((p) => p.value && byId.has(p.id));
  const { mimeFor, scaleImage } = await import('./lib/refs/image.mjs');
  const { launch } = await import('./lib/consistency/browser.mjs');
  const browser = await launch();
  const thumb = async (file) => {
    if (!file || !existsSync(file)) return undefined;
    try {
      return await scaleImage(browser, readFileSync(file), mimeFor(file), {
        width: 360,
        out: 'jpeg',
      });
    } catch (err) {
      console.log(`warning: ${path.relative(ROOT, file)}: ${err.message}`);
      return undefined;
    }
  };
  try {
    const proposals = [];
    for (const p of open) {
      const images = {};
      for (const ref of new Set(p.value.evidence?.refs ?? [])) {
        images[ref] = {
          source: await thumb(sourceFile(ref)),
          before: await thumb(path.join(at(PATHS.renders), `${ref}.png`)),
          after: await thumb(path.join(at(PATHS.reports), 'proposals', p.id, `${ref}.png`)),
        };
      }
      const refMeta = Object.fromEntries(
        Object.entries(meta).map(([k, v]) => [k, { title: v.title, surface: v.surface }]),
      );
      proposals.push({ proposal: p.value, candidate: byId.get(p.id), images, refMeta });
    }
    const latest = [...latestDecisions(d.decisions).values()];
    const page = buildReviewBoard({
      generatedAt: new Date().toISOString().slice(0, 10),
      threshold: cfg.threshold,
      refTotal: refs.length,
      proposals,
      decided: latest,
      logged: c.logged.map((g) => ({
        id: g.id,
        kind: g.kind,
        refCount: g.refCount,
        needed: g.needed,
      })),
    });
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    writeFileSync(path.resolve(out), page);
    const mb = Buffer.byteLength(page) / (1024 * 1024);
    console.log(
      `wrote ${out} (${proposals.length} open proposal${proposals.length === 1 ? '' : 's'}, ${mb.toFixed(1)} MB)`,
    );
    if (mb > 15) fail('the board is over 15 MB; an Artifact page may not pass 16 MB');
  } finally {
    await browser.close();
  }
}

async function render(values, flags) {
  const { refs } = loadRefs();
  const ids = flags.all ? refs.map((r) => r.id) : values;
  if (ids.length === 0) fail('--render needs ref ids or --all');
  const chosen = ids.map(
    (id) => refs.find((r) => r.id === id) ?? fail(`no ref ${id} under ${PATHS.refs}`),
  );
  const outDir = flags.out ? path.resolve(flags.out) : at(PATHS.renders);
  const log = (s) => console.log(s);
  const live = await liveStages({ root: ROOT, log });
  const { mimeFor, scaleImage } = await import('./lib/refs/image.mjs');
  let failed = false;
  try {
    const packed = await live.stages.pack({ skipBuild: Boolean(flags['skip-build']) });
    log(
      `tarball ${path.basename(packed.tarball)} (HDS ${packed.version}, commit ${packed.commit}${packed.dirty ? ', uncommitted changes' : ''})`,
    );
    mkdirSync(outDir, { recursive: true });
    for (const r of chosen) {
      const m = r.meta.value;
      if (!m || !r.files['src/App.tsx']) {
        failed = true;
        log(`FAIL ${r.id}: needs ref.json and src/App.tsx (run --check)`);
        continue;
      }
      const viewport = {
        ...VIEWPORTS[m.viewport],
        theme: m.theme,
        key: `${m.viewport}-${m.theme}`,
      };
      const app = { id: r.id, dir: r.dir, files: r.files };
      const prepared = { ...app, ...(await live.stages.prepare(app, packed)) };
      const b = await live.stages.build(prepared);
      if (b.built !== true || b.typechecked !== true) {
        failed = true;
        log(`FAIL ${r.id} builds: ${failedStages(b)}`);
        if (b.log) log(trimBuildLog(b.log));
        continue;
      }
      const shots = await live.stages.render(prepared, { viewports: [viewport] });
      const png = shots[viewport.key];
      writeFileSync(path.join(outDir, `${r.id}.png`), png);
      const scan = evaluateScan(await live.stages.axe(prepared, { viewports: [viewport] }), []);
      const axeProblems = [
        ...scan.blocking.map((x) => `${x.ruleId} (${x.impact}), ${x.nodes} nodes`),
        ...scan.errored.map((x) => `scan errored (${x.error})`),
      ];
      if (axeProblems.length) {
        failed = true;
        log(`FAIL ${r.id} axe: ${axeProblems.join('; ')}`);
      }
      const src = sourceFile(r.id);
      let measured = null;
      if (src) {
        const browser = await live.browser();
        const a = await scaleImage(browser, readFileSync(src), mimeFor(src), {
          width: COMPARE_WIDTH,
          out: 'pixels',
        });
        const bImg = await scaleImage(browser, png, 'image/png', {
          width: COMPARE_WIDTH,
          out: 'pixels',
        });
        measured = compareImages(a, bImg);
      }
      const score = m.fidelity?.score;
      log(
        `PASS ${r.id} builds and renders at ${viewport.key}` +
          (measured
            ? `; structure ${measured.structure}, palette ${measured.palette}`
            : '; no cached original, structure and palette not measured') +
          (typeof score === 'number' ? `; rubric score ${score}` : ''),
      );
      if (measured) {
        for (const f of fidelityFlags({ score, ...measured })) log(`  check ${r.id}: ${f}`);
        writeFileSync(
          path.join(outDir, `${r.id}.metrics.json`),
          `${JSON.stringify({ ref: r.id, hds: packed.version, ...measured }, null, 2)}\n`,
        );
      }
      if (flags.record && measured && m.fidelity) {
        const next = {
          ...m,
          fidelity: {
            ...m.fidelity,
            structure: measured.structure,
            palette: measured.palette,
            measuredAt: new Date().toISOString().slice(0, 10),
            hds: packed.version,
          },
        };
        writeFileSync(path.join(r.dir, 'ref.json'), `${JSON.stringify(next, null, 2)}\n`);
        log(`  recorded structure and palette in ${PATHS.refs}/${r.id}/ref.json`);
      } else if (flags.record && measured && !m.fidelity) {
        log(`  not recorded: ${r.id} has no rubric yet (fill fidelity.rubric and score first)`);
      }
    }
    log(`renders: ${path.relative(ROOT, outDir) || outDir}`);
  } finally {
    await live.close();
  }
  live.cleanup();
  log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(failed ? 1 : 0);
}

const o = parse(process.argv.slice(2));
switch (o.mode) {
  case '--help':
    process.stdout.write(HELP);
    break;
  case '--check':
    check();
    break;
  case '--scaffold':
    scaffold(o.values, o.flags);
    break;
  case '--vocab':
    vocab();
    break;
  case '--candidates':
    candidates(o.flags);
    break;
  case '--scale':
    scale(o.values);
    break;
  case '--blast':
    blast(o.values);
    break;
  case '--index':
    index(o.flags);
    break;
  case '--merge-decisions':
    mergeDecisions(o.values);
    break;
  case '--diff':
    diff(o.values).catch((err) => fail(err.message));
    break;
  case '--board':
    board(o.values).catch((err) => fail(err.message));
    break;
  case '--render':
    render(o.values, o.flags).catch((err) => {
      console.error(`\neval-refs: ${err.message}`);
      console.error('The scratch directory above was kept for inspection.');
      process.exit(2);
    });
    break;
  default:
    fail('nothing to do: pass a mode (--check, --candidates, --render, --board, ... or --help)');
}
