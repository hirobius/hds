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
 * target through the `export { X as Y }` lines of src/index.ts, so an import
 * of the deprecated `HdsCheckbox` counts as `Checkbox`. Line-start imports in
 * `<root>/scripts` are the code examples in the consumer's generation prompts
 * (ops page-clone.mjs and video-clone.mjs): they are recorded as
 * `promptContracts`, the components generated code is told to import, and are
 * not counted as usage.
 *
 * `consumers` (product apps vs token-level sites) is a declared, hand-kept
 * figure: source-scanning cannot tell a site that only imports tokens.css. It is
 * not printed in the README until a human sets `consumersConfirmed` to true.
 *
 * Run: pnpm consumer:usage
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const IN_USE_BLOCK = 'consumer-usage';
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
    '[![Ops library page](docs/images/ops-library.png)](docs/images/ops-library.png)',
    '',
    '[![Ops fleet audit page](docs/images/ops-fleet-audit.png)](docs/images/ops-fleet-audit.png)',
    '',
    '',
  ];
  const measured = `**${s.files}** of its source files import from \`@hirobius/design-system\`, using **${s.components}** distinct components. The two screenshots below are Ops pages rendered from its \`main\` (measured at commit \`${s.commit.slice(0, 7)}\`).`;
  if (!s.consumersConfirmed) {
    return [
      '',
      `The Ops dashboard (\`hirobius/ops\`) is the only verified component-level consumer: ${measured}`,
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
    `The Ops dashboard (\`hirobius/ops\`) is ${role}: ${measured}`,
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
    ...shots,
  ].join('\n');
}

export function replaceInUseBlock(readme, block) {
  const start = `<!-- auto:start:${IN_USE_BLOCK} -->`;
  const end = `<!-- auto:end:${IN_USE_BLOCK} -->`;
  const from = readme.indexOf(start);
  const to = readme.indexOf(end);
  if (from === -1 || to === -1 || to < from)
    throw new Error(`README.md is missing the ${start} … ${end} markers.`);
  return `${readme.slice(0, from)}${start}\n${block}${readme.slice(to)}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const snapshotPath = join(REPO, 'docs/data/consumer-usage.json');
  const argRoot = process.argv.includes('--root')
    ? process.argv[process.argv.indexOf('--root') + 1]
    : null;
  const argCommit = process.argv.includes('--commit')
    ? process.argv[process.argv.indexOf('--commit') + 1]
    : null;
  const root = [argRoot, process.env.OPS_ROOT].find((p) => p && existsSync(p));
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  if (root) {
    const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();
    const manifest = JSON.parse(readFileSync(join(REPO, 'public/hds-manifest.json'), 'utf8'));
    const aliases = parseRootAliases(readFileSync(join(REPO, 'src/index.ts'), 'utf8'));
    Object.assign(snapshot, {
      ...measureConsumer(root, new Set(Object.keys(manifest.componentSpecs)), aliases),
      scope: 'src',
    });
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
  } else {
    console.log('consumer:usage: no --root or OPS_ROOT given, using the committed snapshot');
  }
  const readmePath = join(REPO, 'README.md');
  writeFileSync(
    readmePath,
    replaceInUseBlock(readFileSync(readmePath, 'utf8'), renderInUseBlock(snapshot)),
  );
}
