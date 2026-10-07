/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * core-set.mjs — the ratified core set (hds#254) projected onto the surfaces
 * consumers read (hds#374, ADR-031).
 *
 * The names come from scripts/lib/core-components.mjs and nowhere else. This
 * module turns them into the manifest `core` flag; the README block, the
 * llms.txt section and the consumer SKILL.md section are rendered from that
 * flag, so each surface is a projection that a test compares byte for byte.
 *
 * `core` is not the manifest `tier` (ADR-006): five core components are
 * `tier: pattern`, and not every `tier: primitive` component is core.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_COMPONENTS } from './core-components.mjs';

/**
 * Writes `core: true` on each spec named in `names` and removes `core` from
 * every other spec. The flag is always re-added as the last key so a regen
 * never reorders a spec. Mutates `specs`.
 *
 * A core name with no spec is returned rather than thrown, so the generator
 * still runs on a partial tree (the figma-link test's mini-root); on the real
 * tree scripts/__tests__/core-set.test.mjs and `check-contract-coverage
 * --enforce` (pre-commit) fail on it.
 *
 * @param {Record<string, Record<string, unknown>>} specs manifest.componentSpecs
 * @param {readonly string[]} [names]
 * @returns {string[]} core names that have no spec
 */
export function applyCoreFlag(specs, names = CORE_COMPONENTS) {
  const core = new Set(names);
  for (const [name, spec] of Object.entries(specs)) {
    delete spec.core;
    if (core.has(name)) spec.core = true;
  }
  return names.filter((name) => !specs[name]);
}

// ── The data every surface renders ───────────────────────────────────────────
export const CORE_SET_BLOCK = 'core-set';

const byName = (a, b) => a.localeCompare(b);

/**
 * The flagged specs grouped by manifest category: categories and names sorted.
 * @param {Record<string, { core?: boolean, category?: string }>} specs
 * @returns {{ category: string, names: string[] }[]}
 */
export function coreByCategory(specs) {
  const groups = new Map();
  for (const [name, spec] of Object.entries(specs)) {
    if (spec?.core !== true) continue;
    const category = spec.category || 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(name);
  }
  return [...groups.keys()]
    .sort(byName)
    .map((category) => ({ category, names: groups.get(category).sort(byName) }));
}

/** Component modules `src/patterns.ts` re-exports (`app/components/<module>`), in file order. */
export function patternModules(patternsSource) {
  return [...patternsSource.matchAll(/^export \* from '\.\/app\/components\/([^']+)'/gm)].map(
    (m) => m[1],
  );
}

const pascal = (module) =>
  module
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/**
 * One public name per `/patterns` module: the spec whose name is the module's
 * PascalCase (`activity-feed` → `ActivityFeed`), else the only spec in the
 * file (`image-lightbox` → `Lightbox`). Sorted. Throws when neither resolves,
 * so a renamed or split module cannot silently drop out of the README.
 */
export function patternModuleNames(modules, specs) {
  return modules
    .map((module) => {
      const inFile = Object.entries(specs)
        .filter(
          ([, spec]) => spec?.filePath?.replace(/\.tsx?$/, '') === `src/app/components/${module}`,
        )
        .map(([name]) => name);
      if (inFile.includes(pascal(module))) return pascal(module);
      if (inFile.length === 1) return inFile[0];
      throw new Error(
        `src/patterns.ts re-exports app/components/${module}, but the manifest has ` +
          `${inFile.length ? `several specs in it (${inFile.join(', ')}) and none named ${pascal(module)}` : 'no spec in it'}. ` +
          'Name the module after its main component, or regenerate the manifest (pnpm manifest:generate).',
      );
    })
    .sort(byName);
}

/**
 * Reads the two sources: the manifest (`core` flags, and which specs are
 * deprecated) and `src/patterns.ts` (the `/patterns` modules).
 * @param {string} root repo root
 */
export function collectCoreSet(root) {
  const manifest = JSON.parse(readFileSync(join(root, 'public', 'hds-manifest.json'), 'utf8'));
  const specs = manifest.componentSpecs ?? {};
  const modules = patternModules(readFileSync(join(root, 'src', 'patterns.ts'), 'utf8'));
  return {
    core: coreByCategory(specs),
    patterns: patternModuleNames(modules, specs),
    deprecated: deprecatedSpecs(specs),
  };
}

/**
 * The public specs still exported with a `deprecated` notice, sorted, each with
 * the release that removes it (`removeIn`, when the spec names one).
 * @param {Record<string, { hidden?: boolean, deprecated?: string, removeIn?: string }>} specs
 * @returns {{ name: string, removeIn?: string }[]}
 */
export function deprecatedSpecs(specs) {
  return Object.entries(specs)
    .filter(([, spec]) => spec?.deprecated && !spec.hidden)
    .map(([name, spec]) => ({ name, ...(spec.removeIn ? { removeIn: spec.removeIn } : {}) }))
    .sort((a, b) => byName(a.name, b.name));
}

// ── README ───────────────────────────────────────────────────────────────────
const code = (names) => names.map((n) => `\`${n}\``).join(', ');

/** The markdown inside `<!-- auto:start:core-set -->` in README.md. */
export function renderCoreSetBlock({ core, patterns, deprecated = [] }) {
  const coreCount = core.reduce((n, group) => n + group.names.length, 0);
  const deprecatedNote = deprecated.length
    ? ` Deprecated, exported only until removed: ${deprecated
        .map(({ name, removeIn }) => `\`${name}\`${removeIn ? ` (removed in ${removeIn})` : ''}`)
        .join(', ')}.`
    : '';
  return [
    `**${coreCount}** components are the core set: the brand-neutral, composable surface every HDS screen is built from, and the part of the system that has to be excellent. Import them from the package root; each carries \`core: true\` in \`public/hds-manifest.json\`.`,
    '',
    ...renderCoreSetByCategory(core),
    '',
    `**${patterns.length}** pattern modules ship from \`@hirobius/design-system/patterns\`, and only from there: composed surfaces that assume a product (page shells, forms, code blocks, page sections), built from the core set. One name per module; its parts and props types come with it.`,
    '',
    code(patterns),
    '',
    `The package root also exports the rest of the allow-list (compound parts, and the components outside the core set; the [consumer skill](skills/hds-consumer/SKILL.md) lists them by category): reach for the core set first. 0.20.0 removed the root re-exports of the pattern modules, the docs internals and 13 components that fold into a survivor ([MIGRATIONS.md](MIGRATIONS.md#0200-removals-2026-10-01)).${deprecatedNote}`,
    '',
    `Every component's disposition (core, pattern, fold or internal) is in the [architecture doc](docs/hds-architecture-2026-09-18.html), ratified 2026-09-26 in [hds#254](https://github.com/hirobius/hds/issues/254); [ADR-031](docs/adr/031-core-set-and-dispositions.md) records the decision and what has changed since.`,
  ].join('\n');
}

/** Problems with README.md's core-set block: empty when it is the generated block. */
export function findCoreSetDrift(readme, data) {
  const start = `<!-- auto:start:${CORE_SET_BLOCK} -->`;
  const end = `<!-- auto:end:${CORE_SET_BLOCK} -->`;
  const from = readme.indexOf(start);
  const to = readme.indexOf(end);
  if (from === -1 || to < from) return [`README.md is missing the ${start} … ${end} markers.`];
  const current = readme.slice(from + start.length, to);
  return current === `\n\n${renderCoreSetBlock(data)}\n\n`
    ? []
    : [
        'README.md "What belongs in the system" differs from its sources (scripts/lib/core-components.mjs, src/patterns.ts, the manifest). Run: pnpm readme:counts',
      ];
}

// ── llms.txt and the consumer SKILL.md ───────────────────────────────────────
/** llms.txt "## Core set" body lines: one `- Name (Category)` per core component. */
export function renderCoreSetLines(core) {
  return core.flatMap(({ category, names }) => names.map((name) => `- ${name} (${category})`));
}

/** One `- **Category:** \`A\`, \`B\`` bullet per category (README block and SKILL.md "## Core set"). */
export function renderCoreSetByCategory(core) {
  return core.map(({ category, names }) => `- **${category}:** ${code(names)}`);
}
