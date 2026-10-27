#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * count-consumer-usage.mjs (hds#316)
 *
 * Generates the numbers in README.md's "In use" section:
 *   - files in a consumer app that import from `@hirobius/design-system`
 *     (root or the `/patterns`, `/form`, `/mui`… component subpaths; `/cn`,
 *     `/tokens`, `/manifest`, `/contexts`, `/brand` are not component imports)
 *   - distinct imported names that are components in public/hds-manifest.json
 *
 * Measurement source: `--root <dir>` or $OPS_ROOT (a checkout of the consumer's
 * `main`; the measured commit is recorded). With neither the committed snapshot
 * (docs/data/consumer-usage.json) is used as-is, so CI and fresh clones still
 * regenerate the README block deterministically. When a consumer is measured
 * the snapshot is rewritten. A root that is not a git checkout (a
 * `git archive` export, say) needs `--commit <sha>` to name what was measured.
 *
 * Scope (hds#390): only `<root>/src` counts as usage; the consumer's scripts,
 * tests outside src/ and fixtures do not ship. Barrel aliases resolve to their
 * target through the `export { X as Y }` lines of src/index.ts and the `Hds*`
 * aliases 0.20.0 removed (codemods/hds-prefix.mjs), so an import of
 * `HdsCheckbox` counts as `Checkbox`. Line-start imports in
 * `<root>/scripts` are the code examples in the consumer's generation prompts
 * (ops page-clone.mjs and video-clone.mjs): they are recorded as
 * `promptContracts`, the components generated code is told to import, and are
 * not counted as usage.
 *
 * `consumers` (product apps vs token-level sites) is a declared, hand-kept
 * figure: source-scanning cannot tell a site that only imports tokens.css. It is
 * not printed in the README until a human sets `consumersConfirmed` to true;
 * `consumersConfirmedAt` is the day they did. public/hds-stats.json (ops#681) repeats
 * the split with that file as its source and that day.
 *
 * Monthly ledger (hds#658): `--root <clone> --history [--ref origin/main]
 * [--consumer <id>]` samples the consumer once per UTC month from 2026-07
 * (scripts/lib/consumer-history.mjs) and replaces that consumer's entry in the
 * snapshot's `history[]`, copying in the latest consistency-harness ledger
 * entry. docs/ADOPTION.md (hds#659) renders `history[]`; without `--history`
 * the committed history is untouched.
 *
 * Run: pnpm consumer:usage
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENAMES as HDS_PREFIX_RENAMES } from '../codemods/hds-prefix.mjs';
import {
  assertTagsCurrent,
  latestHarnessEntry,
  measureHistory,
  readHdsTags,
  upsertHistory,
} from './lib/consumer-history.mjs';
import { runGenerator } from './lib/generated-check.mjs';

export const IN_USE_BLOCK = 'consumer-usage';
export const ADOPTION_BLOCK = 'adoption-history';
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.vercel',
  'coverage',
]);
const EXTS = /\.(tsx?|jsx?|mjs|cjs|mts|cts)$/;
const NON_COMPONENT_SUBPATHS = new Set(['cn', 'tokens', 'manifest', 'contexts', 'brand']);
const IMPORT_RE =
  /^import(?:\s+type)?\s*\{([^}]*)\}\s*from\s*['"]@hirobius\/design-system(?:\/([\w-]+))?['"]/gm;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTS.test(full)) yield full;
  }
}

/**
 * The `export { X as Y } from …` aliases of a barrel, as Y → X. A
 * `default as Y` re-export names no component and is left out.
 *
 * @param {string} indexSource src/index.ts text
 * @returns {Map<string, string>}
 */
export function parseRootAliases(indexSource) {
  const aliases = new Map();
  for (const m of String(indexSource).matchAll(/^export\s*\{([^}]*)\}\s*from\s*['"]/gm)) {
    for (const spec of m[1].split(',')) {
      const parts = spec
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/);
      if (parts.length === 2 && parts[0] !== 'default') aliases.set(parts[1].trim(), parts[0]);
    }
  }
  return aliases;
}

/**
 * Aliases a consumer may still import: the barrel's own `export { X as Y }`
 * lines plus the `Hds*` aliases 0.20.0 removed (hds#389), read from the
 * hds-prefix codemod that rewrites them. A consumer pinned below 0.20 still
 * imports `HdsCheckbox`, and that is a use of `Checkbox`.
 *
 * @param {string} indexSource src/index.ts text
 * @returns {Map<string, string>}
 */
export function consumerAliases(indexSource) {
  return new Map([...Object.entries(HDS_PREFIX_RENAMES), ...parseRootAliases(indexSource)]);
}

/** Files under `dir` that import components from the package, and the names they import. */
function collectImports(dir, componentNames, aliases) {
  const files = new Set();
  const names = new Set();
  for (const file of walk(dir)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('@hirobius/design-system')) continue;
    for (const m of src.matchAll(IMPORT_RE)) {
      if (m[2] && NON_COMPONENT_SUBPATHS.has(m[2])) continue;
      files.add(file);
      for (const spec of m[1].split(',')) {
        const imported = spec
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        const name = aliases.get(imported) ?? imported;
        if (componentNames.has(name)) names.add(name);
      }
    }
  }
  return { files, names };
}

/** @returns {{ files: number, components: number }} */
export function countConsumerUsage(root, componentNames, aliases = new Map()) {
  const { files, names } = collectImports(root, componentNames, aliases);
  return { files: files.size, components: names.size };
}

/**
 * Measures one consumer checkout: usage under `<root>/src`, plus the
 * components its generation prompts in `<root>/scripts` name.
 *
 * @param {string} root
 * @param {Set<string>} componentNames
 * @param {Map<string, string>} aliases alias → target, from parseRootAliases
 */
export function measureConsumer(root, componentNames, aliases = new Map()) {
  const srcDir = join(root, 'src');
  if (!existsSync(srcDir)) throw new Error(`consumer:usage: ${srcDir} does not exist.`);
  const usage = collectImports(srcDir, componentNames, aliases);
  const scriptsDir = join(root, 'scripts');
  const prompts = existsSync(scriptsDir)
    ? collectImports(scriptsDir, componentNames, aliases)
    : { files: new Set(), names: new Set() };
  const sorted = (set) => [...set].sort();
  return {
    files: usage.files.size,
    components: usage.names.size,
    names: sorted(usage.names),
    promptContracts: {
      files: sorted([...prompts.files].map((f) => relative(root, f).replace(/\\/g, '/'))),
      components: sorted(prompts.names),
    },
  };
}

/** Pads table rows to equal column widths, the way Prettier formats markdown tables. */
function alignTable(rows) {
  const widths = rows[0].map((_, i) => Math.max(3, ...rows.map((r) => r[i].length)));
  const line = (r) => `| ${r.map((c, i) => c.padEnd(widths[i])).join(' | ')} |`;
  const rule = `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`;
  return [line(rows[0]), rule, ...rows.slice(1).map(line)];
}

/** Markdown placed between the generated-block markers (starts and ends with a blank line). */
export function renderInUseBlock(s) {
  const shots = [
    '[![Audit page of the product app](docs/images/product-app-audit.png)](docs/images/product-app-audit.png)',
    '',
    '',
  ];
  const measured = `**${s.files}** of its source files import from \`@hirobius/design-system\`, using **${s.components}** distinct components. The screenshot below is a page of that app, rendered from its \`main\` branch.`;
  if (!s.consumersConfirmed) {
    return [
      '',
      `One internal operations dashboard is the only verified component-level consumer: ${measured}`,
      '',
      'Other consumers: the split into product apps and token-level sites is not yet confirmed, so it is not stated here.',
      '',
      ...shots,
    ].join('\n');
  }
  const role =
    s.consumers.productApps === 1
      ? 'the only product app that uses components'
      : `one of ${s.consumers.productApps} product apps that use components`;
  return [
    '',
    `An internal operations dashboard is ${role}: ${measured}`,
    '',
    ...alignTable([
      ['Consumer kind', 'Count', 'How it uses HDS'],
      ['Product apps', String(s.consumers.productApps), 'Components and tokens'],
      [
        'Token-level sites',
        String(s.consumers.tokenLevelSites),
        'Tokens and CSS only, no component imports',
      ],
    ]),
    '',
    'Month-by-month adoption in each product app, one row per measured commit: [docs/ADOPTION.md](docs/ADOPTION.md).',
    '',
    ...shots,
  ].join('\n');
}

/** The README with its "In use" block rendered from `snapshot`: what `--check` compares. */
export function readmeWithUsage(readme, snapshot) {
  return replaceBlock(readme, IN_USE_BLOCK, renderInUseBlock(snapshot), 'README.md');
}

/** docs/ADOPTION.md with its ledger block rendered from `snapshot`. */
export function adoptionWithHistory(doc, snapshot) {
  return replaceBlock(doc, ADOPTION_BLOCK, renderAdoptionBlock(snapshot), 'docs/ADOPTION.md');
}

/** `text` (the contents of `file`) with its `auto:start/end:<name>` block replaced by `block`. */
export function replaceBlock(text, name, block, file = 'the file') {
  const start = `<!-- auto:start:${name} -->`;
  const end = `<!-- auto:end:${name} -->`;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to === -1 || to < from)
    throw new Error(`${file} is missing the ${start} … ${end} markers.`);
  return `${text.slice(0, from)}${start}\n${block}${text.slice(to)}`;
}

const short = (sha) => `\`${sha.slice(0, 7)}\``;
const cell = (v) => (v === null || v === undefined ? 'n/a' : String(v));
const sumControls = (c) => (c ? Object.values(c).reduce((a, b) => a + b, 0) : null);

/**
 * The docs/ADOPTION.md ledger (hds#659): a pure function of the snapshot. It
 * reads no clock, git or live ledger, so a new month or an eval commit never
 * turns `--check` red. Apps appear by label, commits as short shas, private
 * issue refs in code spans; no repository is named or linked.
 */
export function renderAdoptionBlock(s) {
  const out = [
    '',
    'Numbers only. Each product app is measured from its `main` branch, one row per calendar month in UTC: the last first-parent commit before the month ended (the current month is the branch tip when it was measured). Files and components count `src/` imports of `@hirobius/design-system`, as in the README; raw controls are lowercase `<button>`, `<input>`, `<select>`, `<textarea>` and `<table>` tags in `src/**/*.tsx`; the HDS release is the highest one tagged by the month end. `n/a` means the commit had no `src/`.',
    '',
    'Re-measure from a full clone: `node scripts/count-consumer-usage.mjs --root <clone> --history --consumer <id>`.',
    '',
  ];
  for (const app of s.consumers.apps) {
    out.push(`### ${app.label}`, '');
    const entry = (s.history ?? []).find((h) => h.consumer === app.id);
    if (!entry || entry.rows.length === 0) {
      out.push('Not measured yet.', '');
      continue;
    }
    out.push(
      ...alignTable([
        ['Month', 'Commit', 'Files', 'Components', 'Raw controls', 'HDS range', 'HDS release'],
        ...entry.rows.map((r) => [
          r.month,
          short(r.commit),
          cell(r.files),
          cell(r.components),
          cell(sumControls(r.rawControls)),
          cell(r.versionRange),
          cell(r.hdsVersion),
        ]),
      ]),
      '',
    );
  }
  const d = s.deprecationCycle;
  if (d) {
    const app = s.consumers.apps.find((a) => a.id === d.consumer);
    out.push(
      '### Deprecation cycle',
      '',
      ...alignTable([
        ['Change', 'App', 'Status', 'Commit', 'Tracked in'],
        [
          d.change,
          app ? app.label : d.consumer,
          d.appliedAt ? `applied ${d.appliedAt}` : 'not yet applied',
          d.commit ? short(d.commit) : 'n/a',
          d.trackedIn ? `\`${d.trackedIn}\`` : 'n/a',
        ],
      ]),
      '',
    );
  }
  const c = s.consistency;
  if (c) {
    const m = c.measured;
    out.push(
      '### Consistency harness',
      '',
      'The latest `source: "harness"` entry of `eval/consistency/ledger.json`, copied when the ledger was measured.',
      '',
      ...alignTable([
        ['Date', 'Package', 'HDS commit', 'Builds', 'Violations', 'Axe', 'Min Jaccard', 'Pass'],
        [
          c.date,
          c.packageVersion,
          c.commit ? short(c.commit) : 'n/a',
          `${m.builds.passing} of ${m.builds.of}`,
          cell(m.violations),
          cell(m.axe),
          cell(m.jaccardMin),
          c.pass ? 'yes' : 'no',
        ],
      ]),
      '',
    );
  }
  return `${out.join('\n')}\n`;
}

/** The fields of a harness ledger entry the adoption doc shows. */
export function consistencySummary(entry) {
  if (!entry) return null;
  const { date, packageVersion, commit, measured, pass } = entry;
  return { date, packageVersion, commit, measured, pass };
}

const argValue = (flag, fallback = null) =>
  process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : fallback;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const snapshotPath = join(REPO, 'docs/data/consumer-usage.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const check = process.argv.includes('--check');
  // `--check` measures nothing and writes nothing: it compares README.md and
  // docs/ADOPTION.md with the committed snapshot rendered today. (The snapshot
  // itself is measured from the consumer repo, which `--root` does; that part
  // cannot be checked here.)
  const root = check
    ? null
    : [argValue('--root'), process.env.OPS_ROOT].find((p) => p && existsSync(p));
  const manifest = () => JSON.parse(readFileSync(join(REPO, 'public/hds-manifest.json'), 'utf8'));
  const aliases = () => consumerAliases(readFileSync(join(REPO, 'src/index.ts'), 'utf8'));
  if (!check && process.argv.includes('--history') && !root)
    throw new Error(
      'consumer:usage --history needs --root <full clone of the consumer> (or OPS_ROOT).',
    );
  if (root && process.argv.includes('--history')) {
    const consumer = argValue('--consumer', 'hirobius/ops');
    if (!snapshot.consumers.apps.some((a) => a.id === consumer))
      throw new Error(
        `consumer:usage --history: '${consumer}' is not in consumers.apps of docs/data/consumer-usage.json.`,
      );
    const hdsTags = readHdsTags(REPO);
    assertTagsCurrent(
      hdsTags,
      JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version,
    );
    const names = new Set(Object.keys(manifest().componentSpecs));
    const al = aliases();
    const entry = measureHistory({
      root,
      ref: argValue('--ref', 'origin/main'),
      consumer,
      hdsTags,
      measure: (dir) => measureConsumer(dir, names, al),
    });
    snapshot.history = upsertHistory(snapshot.history, entry);
    // A ledger with no harness run keeps the last one copied, not a blank.
    snapshot.consistency =
      consistencySummary(
        latestHarnessEntry(
          JSON.parse(readFileSync(join(REPO, 'eval/consistency/ledger.json'), 'utf8')),
        ),
      ) ?? snapshot.consistency;
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(`consumer:usage --history measured ${consumer}: ${entry.rows.length} months`);
  } else if (root) {
    const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
    Object.assign(snapshot, {
      ...measureConsumer(root, new Set(Object.keys(manifest().componentSpecs)), aliases()),
      scope: 'src',
    });
    const argCommit = argValue('--commit');
    if (argCommit) {
      // A `git archive` export of the consumer's main has no .git to ask.
      if (!/^[0-9a-f]{40}$/.test(argCommit))
        throw new Error(
          `consumer:usage: --commit takes a full 40-character sha, got '${argCommit}'.`,
        );
      snapshot.commit = argCommit;
    } else {
      snapshot.commit = git('rev-parse', 'HEAD');
      const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
      if (branch !== 'main')
        console.warn(
          `consumer:usage: ${root} is on '${branch}', not main; the README says "main", so measure a main checkout before committing.`,
        );
    }
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(
      `consumer:usage measured ${root}@${snapshot.commit.slice(0, 7)}: ${snapshot.files} files, ${snapshot.components} components`,
    );
  } else if (!check) {
    console.log('consumer:usage: no --root or OPS_ROOT given, using the committed snapshot');
  }
  const read = (rel) => readFileSync(join(REPO, rel), 'utf8');
  await runGenerator({
    root: REPO,
    outputs: {
      'README.md': readmeWithUsage(read('README.md'), snapshot),
      'docs/ADOPTION.md': adoptionWithHistory(read('docs/ADOPTION.md'), snapshot),
    },
    label: 'count-consumer-usage',
    fix: 'pnpm consumer:usage',
  });
}
