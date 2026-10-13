#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * generate-consumer-skill.mjs
 *
 * Compiles the consumer-facing agent skill (agentskills SKILL.md) from sources
 * that already exist; it is a projection, never a new source of truth:
 *   - public/hds-manifest.json      componentSpecs (name, description, category, and the
 *                                   hds#374 `core` flag for the "Core set" section)
 *   - src/index.ts                  which component modules the root barrel re-exports
 *   - src/patterns.ts               which modules `/patterns` exports (its own list:
 *                                   0.20.0 removed them from the root, hds#389)
 *   - package.json `exports`        the import subpaths
 *   - scripts/lib/layout-recipe.mjs the screen layout recipe (shared with llms.txt)
 *   - docs/CONSUMING.md             the do/don't rules and the lint install line
 *
 * Output: skills/hds-consumer/SKILL.md (installable with
 * `npx skills add hirobius/hds --skill hds-consumer`).
 *
 * Usage:
 *   node scripts/generate-consumer-skill.mjs                   write the file
 *   node scripts/generate-consumer-skill.mjs --check           exit 1 on any byte difference
 *   node scripts/generate-consumer-skill.mjs --root <dir> ...  read and write a copy of the tree (tests)
 *
 * The output is deterministic (sorted, no dates) so --check compares exact bytes.
 * scripts/lib/generated-check.mjs (runGenerator) owns the write and the check.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { layoutRecipeSteps, layoutNegativeRules } from './lib/layout-recipe.mjs';
import { coreByCategory, renderCoreSetByCategory } from './lib/core-set.mjs';
import { rootFromArgv, runGenerator } from './lib/generated-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SKILL_PATH = 'skills/hds-consumer/SKILL.md';

/** Copied verbatim from docs/CONSUMING.md section 11 (a test pins the match). */
export const LINT_INSTALL_LINE =
  'pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hds#path:/scripts/eslint-plugin-hds"';

const PKG = '@hirobius/design-system';
const PATTERNS = `${PKG}/patterns`;

/** Component modules re-exported by a barrel, e.g. `app/components/alert`. */
function barrelModules(barrelSource) {
  const modules = new Set();
  for (const line of barrelSource.split('\n')) {
    const m = /^export \* from '\.\/(app\/components\/[^']+)'/.exec(line);
    if (m) modules.add(m[1]);
  }
  return modules;
}

const moduleOf = (filePath) => filePath.replace(/^src\//, '').replace(/\.(tsx?|jsx?)$/, '');

const ABBREVIATION = /(?:e\.g|i\.e|etc|vs)\.$/i;

export function firstSentence(text = '') {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  const end = /[.!?](?=\s|$)/g;
  let m;
  while ((m = end.exec(flat))) {
    const upTo = flat.slice(0, m.index + 1);
    if (!ABBREVIATION.test(upTo)) return upTo;
  }
  return flat;
}

/**
 * The documented components a barrel exports, grouped by category. Reads every
 * componentSpecs entry, not only componentInventory, so template-tier components
 * such as `ErrorPattern` are listed too.
 */
function allowList(manifest, barrelSource) {
  const modules = barrelModules(barrelSource);
  const groups = new Map();
  for (const name of Object.keys(manifest.componentSpecs ?? {})) {
    const spec = manifest.componentSpecs[name];
    // Deprecated specs stay importable until their removeIn release, but the
    // skill stops advertising them (hds#390).
    if (!spec || spec.hidden || spec.deprecated || !spec.filePath) continue;
    if (!modules.has(moduleOf(spec.filePath))) continue;
    const category = spec.category || 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ name, line: firstSentence(spec.description) });
  }
  const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return [...groups.keys()].sort(byName).map((category) => {
    const items = groups.get(category).sort((a, b) => byName(a.name, b.name));
    return [
      `### ${category}`,
      '',
      ...items.map((i) => (i.line ? `- \`${i.name}\` — ${i.line}` : `- \`${i.name}\``)),
    ].join('\n');
  });
}

/** The "## Core set" section (hds#374), or nothing when no spec carries `core: true`. */
function coreSetSection(manifest) {
  const core = coreByCategory(manifest.componentSpecs ?? {});
  const count = core.reduce((n, group) => n + group.names.length, 0);
  if (count === 0) return [];
  return [
    '## Core set',
    '',
    `The ${count} components of the ratified core set (\`core: true\` in the manifest): brand-neutral and composable. Compose a screen from these first; reach for the rest of the allow-list, or \`${PKG}/patterns\` for composed product surfaces, only when none fits.`,
    '',
    ...renderCoreSetByCategory(core),
    '',
  ];
}

function importSection(packageExports) {
  const subpaths = Object.keys(packageExports ?? {}).filter(
    (k) => k !== '.' && k !== './package.json',
  );
  return [
    `Install \`${PKG}\`, import core components from the root barrel (\`import { Button } from '${PKG}'\`) and the pattern-tier components from \`${PATTERNS}\` (\`import { Page } from '${PATTERNS}'\`), and load one stylesheet once at the app root. Add \`import '${PKG}/fonts.css'\` only if you want the HDS brand fonts (optional; skip it to bring your own).`,
    '',
    ...(subpaths.length
      ? ['Subpath exports:', '', ...subpaths.map((k) => `- \`${PKG}/${k.replace(/^\.\//, '')}\``)]
      : []),
  ].join('\n');
}

export function buildConsumerSkill({
  manifest,
  indexSource,
  patternsSource = '',
  packageExports = {},
}) {
  const numbered = (items) => items.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const dos = [
    'Use tokens only. No raw hex or px in `style`, `className` or `Box` `sx`; the lint rules below enforce this.',
    'No inline margins on children to fake sibling spacing; the parent layout primitive owns the gap.',
    'Use an allow-listed HDS component where one exists instead of hand-rolling it.',
    'Keep app-local tokens and styles under your own `--<prefix>-*` prefix, never inside DS-owned namespaces (`--primitive-*`, `--semantic-*`, `--component-*`, `--role-*`, `--hds-*`; `data-hds`, `data-theme`, `data-tenant`).',
    'Re-theme through a tenant overlay activated with `data-tenant`, not by overriding DS tokens.',
    'Route gaps upstream: a missing component or token is an issue and PR against HDS, not a downstream patch.',
    'Mark the HDS scope with `data-hds` on `<html>`, `<body>` or a wrapper, and on portal containers for overlays that render into `document.body`.',
  ];
  const finalSteps = [
    `Add the lint plugin: \`${LINT_INSTALL_LINE}\`.`,
    'Enable `@hirobius/eslint-plugin-hds` with its `recommended` config, run ESLint, and fix every error before reporting done.',
  ];

  return (
    [
      '---',
      'name: hds-consumer',
      `description: "Use when building or editing UI in an app that consumes ${PKG}: which components you may import, how to lay out a screen, and the lint step to finish with."`,
      '---',
      '',
      '<!-- Generated by scripts/generate-consumer-skill.mjs from public/hds-manifest.json. Do not hand-edit: pnpm check:consumer-skill -->',
      '',
      '# HDS consumer skill',
      '',
      '## Install and import',
      '',
      importSection(packageExports),
      '',
      ...coreSetSection(manifest),
      '## Allow-list: components you may import',
      '',
      `Components you may import from \`${PKG}\`. Providers, hooks and helpers documented in \`docs/CONSUMING.md\` (for example \`HdsThemeProvider\`, \`useHdsTheme\`, \`cn\`) are also public. If a need is not covered, route it upstream instead of hand-rolling it.`,
      '',
      allowList(manifest, indexSource).join('\n\n'),
      '',
      `## Patterns: import from \`${PATTERNS}\``,
      '',
      `The pattern-tier components (screen shells, page sections, feeds, rails, pickers) are not in the root barrel: import them from the subpath, for example \`import { Page } from '${PATTERNS}'\`.`,
      '',
      allowList(manifest, patternsSource).join('\n\n'),
      '',
      '## How to lay out a screen',
      '',
      numbered(layoutRecipeSteps),
      '',
      'Never:',
      '',
      layoutNegativeRules.map((r) => `- ${r}`).join('\n'),
      '',
      "## Do and don't",
      '',
      dos.map((d) => `- ${d}`).join('\n'),
      '',
      '## Steps',
      '',
      'Finish every task with the last step below.',
      '',
      numbered([
        `Compose the screen from the allow-list and the \`${PATTERNS}\` list, using the layout recipe.`,
        'Style with tokens only.',
        ...finalSteps,
      ]),
    ].join('\n') + '\n'
  );
}

async function main() {
  const root = rootFromArgv(ROOT);
  const read = (rel) => readFileSync(join(root, rel), 'utf8');
  const content = buildConsumerSkill({
    manifest: JSON.parse(read('public/hds-manifest.json')),
    indexSource: read('src/index.ts'),
    patternsSource: read('src/patterns.ts'),
    packageExports: JSON.parse(read('package.json')).exports,
  });
  await runGenerator({
    root,
    outputs: { [SKILL_PATH]: content },
    label: 'consumer skill',
    fix: 'pnpm skill:generate (do not hand-edit)',
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
