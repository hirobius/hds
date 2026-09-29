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
 * Measurement source: `--root <dir>`, else $OPS_ROOT, else /home/user/ops when
 * it exists. With none of those the committed snapshot
 * (docs/data/consumer-usage.json) is used as-is, so CI and fresh clones still
 * regenerate the README block deterministically. When a consumer is measured
 * the snapshot is rewritten.
 *
 * `consumers` (product apps vs token-level sites) is a declared, hand-kept
 * figure: source-scanning cannot tell a site that only imports tokens.css.
 *
 * Run: pnpm consumer:usage
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

/** @returns {{ files: number, components: number }} */
export function countConsumerUsage(root, componentNames) {
  const files = new Set();
  const used = new Set();
  for (const file of walk(root)) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('@hirobius/design-system')) continue;
    for (const m of src.matchAll(IMPORT_RE)) {
      if (m[2] && NON_COMPONENT_SUBPATHS.has(m[2])) continue;
      files.add(file);
      for (const spec of m[1].split(',')) {
        const name = spec
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        if (componentNames.has(name)) used.add(name);
      }
    }
  }
  return { files: files.size, components: used.size };
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
  return [
    '',
    `The Ops dashboard (\`hirobius/ops\`) is the component-level consumer: **${s.files}** of its source files import from \`@hirobius/design-system\`, using **${s.components}** distinct components. The two screenshots below are Ops pages rendered from its \`main\`.`,
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
    '[![Ops library page](docs/images/ops-library.png)](docs/images/ops-library.png)',
    '',
    '[![Ops fleet audit page](docs/images/ops-fleet-audit.png)](docs/images/ops-fleet-audit.png)',
    '',
    '',
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
  const root = [argRoot, process.env.OPS_ROOT, '/home/user/ops'].find((p) => p && existsSync(p));
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  if (root) {
    const manifest = JSON.parse(readFileSync(join(REPO, 'public/hds-manifest.json'), 'utf8'));
    Object.assign(
      snapshot,
      countConsumerUsage(root, new Set(Object.keys(manifest.componentSpecs))),
    );
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(
      `consumer:usage measured ${root}: ${snapshot.files} files, ${snapshot.components} components`,
    );
  } else {
    console.log('consumer:usage: no consumer checkout found, using the committed snapshot');
  }
  const readmePath = join(REPO, 'README.md');
  writeFileSync(
    readmePath,
    replaceInUseBlock(readFileSync(readmePath, 'utf8'), renderInUseBlock(snapshot)),
  );
}
