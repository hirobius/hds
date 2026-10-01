#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-ledger-0.20.mjs — writes upgrade/releases/0.20.0.json, the first
 * release ledger (hds#447), so it can be rebuilt and checked rather than
 * hand-kept.
 *
 * 0.20.0 shipped before the ledger existed, so its record is assembled after
 * the fact (`backfilled: true`) from four committed sources:
 *
 *   1. The snapshot diff 0.19.1 -> 0.20.0 (docs/api/releases, ./diff.mjs):
 *      every export that left an entry, every runtime dependency dropped.
 *   2. codemods/removed-0.20.json: which removed names have no survivor
 *      (`removed`) and which fold into one (`folded`, with the survivor).
 *   3. RENAMES in codemods/hds-prefix.mjs: the six Hds* aliases (`renamed`).
 *   4. CHANGELOG.md's 0.20.0 section: how things look and behave, and what is
 *      deprecated. Each such step cites its line as of the release.
 *
 * A name that left the root for /patterns is `moved`. Every fact the diff
 * finds must land in a step, and a name no source classifies stops the build,
 * so the ledger cannot quietly miss a change. CSS facts (classes, variables)
 * join in hds#449.
 *
 *   node scripts/upgrade/build-ledger-0.20.mjs           # write the ledger
 *   node scripts/upgrade/build-ledger-0.20.mjs --check   # exit 1 if it is stale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENAMES } from '../../codemods/hds-prefix.mjs';
import { diffSnapshots } from './diff.mjs';
import { formatJson } from './format.mjs';
import {
  FACTS_NEEDING_A_STEP,
  assembleRelease,
  changelogSource,
  uncoveredFacts,
} from './ledger.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(REPO, 'upgrade/releases/0.20.0.json');

const VERSION = '0.20.0';
const PREVIOUS = '0.19.1';
/** npm published 0.20.0 at 2026-10-01T17:02:05Z. */
const DATE = '2026-10-01';
const SUMMARY =
  'Pattern components move to /patterns; deprecated, lab and folded components, Hds* aliases and 7 runtime deps are removed.';

const PACKAGE = '@hirobius/design-system';
const ROOT = PACKAGE;
const PATTERNS = `${PACKAGE}/patterns`;
const DIFF = `snapshot diff ${PREVIOUS}..${VERSION}`;

const MOVE_CODEMOD = 'hds-patterns-subpath';
const RENAME_CODEMOD = 'hds-prefix';
/** Folded names whose codemod rewrites every use (TileGridProps stays manual). */
const FOLD_CODEMODS = { NotFoundPattern: 'hds-not-found-pattern', TileGrid: 'hds-tile-grid' };

const specifier = (entry) => (entry === '.' ? PACKAGE : `${PACKAGE}/${entry.slice(2)}`);
const uses = (from, ...names) => ({ from, names });
const auto = (codemod) => ({ codemod, args: [] });

/**
 * Look, behavior and deprecation steps from CHANGELOG.md's 0.20.0 section.
 * `needle` is text unique within the section; the step cites its line.
 */
const PROSE = [
  {
    kind: 'look',
    subject: 'Button-pressed',
    impact: 'look',
    needle: 'c506c3b:',
    plain:
      'A pressed Button now tints only its fill with a 5% overlay, white in dark mode, instead of dimming the whole control, and the press no longer animates.',
    detect: { imports: [uses(ROOT, 'Button')], jsx: ['Button'] },
  },
  {
    kind: 'look',
    subject: 'Box-sx-scale-names',
    impact: 'look',
    needle: '9f9d143:',
    plain:
      "Box sx spacing given as a t-shirt name such as 'md' now applies that spacing, where before it applied none.",
    detect: { imports: [uses(ROOT, 'Box')], jsx: ['Box'] },
  },
  {
    kind: 'look',
    subject: 'Input-prefix-slot',
    impact: 'look',
    needle: '`Input` takes the native date and time types',
    plain:
      "A string passed to Input's prefix prop now shows as text inside the field, where before it went to the input element as an attribute.",
    detect: { imports: [uses(ROOT, 'Input')], regex: ['<Input\\b[^>]*\\sprefix='] },
  },
  {
    kind: 'look',
    subject: 'Tooltip-shadow',
    impact: 'look',
    needle: '`Tooltip` casts `shadow-floating`',
    plain:
      'Tooltip now casts the floating shadow that popovers and menus use instead of the dialog shadow.',
    detect: { imports: [uses(ROOT, 'Tooltip')], jsx: ['Tooltip'] },
  },
  {
    kind: 'look',
    subject: 'AssetImg-expand-label',
    impact: 'look',
    needle: "**AssetImg's expand pill",
    plain:
      "AssetImg's expand label now uses the on-accent text color, so it stays readable in dark mode.",
    detect: {
      imports: [uses(ROOT, 'AssetImg'), uses(PATTERNS, 'AssetImg')],
      jsx: ['AssetImg'],
    },
  },
  {
    kind: 'look',
    subject: 'Table-sort-hover',
    impact: 'look',
    needle: "`Table`'s sortable header button now has hover feedback",
    plain: 'A sortable Table header now fades its label to the muted color on hover.',
    detect: { imports: [uses(ROOT, 'Table')], jsx: ['Table'] },
  },
  {
    kind: 'look',
    subject: 'Input-padding',
    impact: 'look',
    needle: '01183dc: `Input` now pads each side',
    plain:
      'Input keeps its inner padding beside icons, the clear button and the spinner, so long text no longer runs under them.',
    detect: { imports: [uses(ROOT, 'Input')], jsx: ['Input'] },
  },
  {
    kind: 'behavior',
    subject: 'Card-selectable-keys',
    impact: 'behavior',
    needle: '**Card.** New `selectable`',
    plain:
      'Card selectable, which replaces SelectableCard, toggles on click or Space only, so code or tests that press Enter to toggle it must press Space instead.',
    detect: { imports: [uses(ROOT, 'SelectableCard')], jsx: ['SelectableCard'] },
  },
  {
    kind: 'behavior',
    subject: 'Button-iconOnly-label',
    impact: 'behavior',
    needle: '**Button.** `iconOnly` now uses',
    plain:
      'An icon-only Button now takes its accessible name from label, unless it has an aria-label.',
    detect: { jsx: ['Button'], regex: ['\\biconOnly\\b'] },
  },
  {
    kind: 'behavior',
    subject: 'Select-Combobox-overlay-names',
    impact: 'behavior',
    needle: 'c148051:',
    plain:
      'The open Select list and the Combobox popup now carry an accessible name, so tests that find them by role and name may need the new name.',
    detect: { imports: [uses(ROOT, 'Select', 'Combobox')], jsx: ['Select', 'Combobox'] },
  },
  {
    kind: 'behavior',
    subject: 'Select-Combobox-accessible-names',
    impact: 'behavior',
    needle: 'cde9ffe:',
    plain:
      'Combobox options now report their real position, and a Select with showLabel={false} is named by its label and value, so tests that find them by role and name may need updating.',
    detect: { imports: [uses(ROOT, 'Select', 'Combobox')], jsx: ['Select', 'Combobox'] },
  },
  {
    kind: 'behavior',
    subject: 'pattern-rows-Stack',
    impact: 'behavior',
    needle: '**PageHeader, FormActions, DataTableSection and DestructiveSection:**',
    plain:
      'The rows inside PageHeader, FormActions, DataTableSection and DestructiveSection now carry data-hds-component="Stack" instead of "Cluster", so selectors and tests that look for Cluster there must change.',
    detect: { regex: ['hds-component=\\W{0,2}Cluster'] },
  },
  {
    kind: 'behavior',
    subject: 'manifest-health',
    impact: 'behavior',
    needle: 'drops the top-level `health` field',
    plain: 'The manifest no longer has a health field, so manifest.health is now undefined.',
    detect: { regex: ['(?:design-system/manifest|hds-manifest\\.json)[\\s\\S]*\\.health\\b'] },
  },
  {
    kind: 'deprecated',
    subject: 'StatusDot',
    impact: 'none',
    removeIn: '0.21.0',
    needle: '**`StatusDot` is deprecated for',
    plain:
      'StatusDot still works but is removed in 0.21.0; use Badge dot with the same tone, size and label, and move any style prop to a wrapper or a className first.',
    detect: { imports: [uses(ROOT, 'StatusDot')], jsx: ['StatusDot'] },
  },
  {
    kind: 'deprecated',
    subject: 'StatusDotProps',
    impact: 'none',
    removeIn: '0.21.0',
    needle: '**`StatusDot` is deprecated for',
    plain: 'StatusDotProps is removed in 0.21.0; use BadgeProps instead.',
    detect: { imports: [uses(ROOT, 'StatusDotProps')] },
  },
  {
    kind: 'deprecated',
    subject: 'hds.density',
    impact: 'none',
    removeIn: '1.0.0',
    needle: '`hds.density.*` is deprecated',
    plain:
      'hds.density still works but is deprecated; use hds.semantic.space.scale one step down, so density.sm becomes scale.xs.',
    detect: { regex: ['\\bhds\\.density\\b'] },
  },
  {
    kind: 'deprecated',
    subject: 'Box-sx-layout-names',
    impact: 'none',
    removeIn: '1.0.0',
    needle: "Box's deprecated `'tight'`",
    plain:
      "Box sx spacing names 'tight', 'normal', 'inset' and 'spacious' still work but are deprecated, and a development build warns once for each; use 'sm' to 'xl' instead.",
    detect: {
      jsx: ['Box'],
      regex: ['\\bsx=\\{\\{[^}]*[\'"](?:tight|normal|inset|spacious)[\'"]'],
    },
  },
];

function readJson(repo, file) {
  return JSON.parse(readFileSync(join(repo, file), 'utf8'));
}

/** One step per name that left an entry, classified by the sources above. */
function nameSteps(facts, removedData, next) {
  const noSurvivor = new Set(Object.values(removedData.modules).flat());
  const survivors = new Map(Object.values(removedData.replaced ?? {}).flatMap(Object.entries));
  // A *Variants helper whose module still exports its component went private.
  const keptModule = new Map(
    Object.entries(removedData.modules).flatMap(([file, names]) => {
      const module = file.replace(/\.tsx?$/, '');
      const kept = Object.values(next.entries['.'] ?? {}).includes(module);
      return names.map((name) => [name, kept]);
    }),
  );

  const byName = new Map();
  for (const fact of facts) {
    if (fact.kind !== 'removed' && fact.kind !== 'moved') continue;
    if (!byName.has(fact.name)) byName.set(fact.name, []);
    byName.get(fact.name).push(fact);
  }

  const steps = [];
  for (const [name, left] of byName) {
    const from = left.map((fact) => (fact.kind === 'moved' ? fact.from : fact.entry));
    const common = {
      detect: { imports: from.map((entry) => uses(specifier(entry), name)) },
      facts: left.map((fact) => fact.id),
    };
    const step = (kind, plain, source, extra = {}) =>
      steps.push({
        id: `${VERSION}/${kind}/${name}`,
        kind,
        impact: 'breaking',
        plain,
        ...extra,
        ...common,
        source,
      });

    if (
      left.every((fact) => fact.kind === 'moved' && fact.from === '.' && fact.to === './patterns')
    ) {
      step(
        'moved',
        `${name} is no longer exported from the package root; import it from ${PATTERNS} instead.`,
        DIFF,
        { auto: auto(MOVE_CODEMOD) },
      );
    } else if (Object.hasOwn(RENAMES, name)) {
      step(
        'renamed',
        `${name} is removed from the package root; use ${RENAMES[name]}, the same component under its bare name.`,
        'codemods/hds-prefix.mjs',
        { auto: auto(RENAME_CODEMOD) },
      );
    } else if (survivors.has(name)) {
      step(
        'folded',
        `${name} is removed; use ${survivors.get(name)} instead.`,
        'codemods/removed-0.20.json',
        FOLD_CODEMODS[name] ? { auto: auto(FOLD_CODEMODS[name]) } : {},
      );
    } else if (noSurvivor.has(name)) {
      step(
        'removed',
        keptModule.get(name)
          ? `${name} is no longer exported, so style its component through the component's props instead.`
          : `${name} is removed with no drop-in replacement, so rewrite or delete the code that imports it.`,
        'codemods/removed-0.20.json',
      );
    } else {
      throw new Error(
        `${name} left ${from.join(', ')} in ${VERSION}, but no source classifies it: add it to codemods/removed-0.20.json`,
      );
    }
  }
  return steps;
}

function dependencySteps(facts) {
  return facts
    .filter((fact) => fact.kind === 'dependency-removed')
    .map((fact) => ({
      id: `${VERSION}/dependency/${fact.name}`,
      kind: 'dependency',
      impact: 'breaking',
      plain: `HDS no longer installs ${fact.name}, so add it to your own dependencies if your code imports it.`,
      range: fact.range,
      detect: { bareImports: [fact.name] },
      facts: [fact.id],
      source: DIFF,
    }));
}

function proseSteps(changelog) {
  return PROSE.map(({ kind, subject, needle, ...rest }) => ({
    id: `${VERSION}/${kind}/${subject}`,
    kind,
    ...rest,
    backfilled: true,
    source: changelogSource(changelog, VERSION, needle),
  }));
}

/** The 0.20.0 ledger, built from the committed sources. */
export function buildLedger020({ repo = REPO } = {}) {
  const prev = readJson(repo, `docs/api/releases/${PREVIOUS}.json`);
  const next = readJson(repo, `docs/api/releases/${VERSION}.json`);
  const facts = diffSnapshots(prev, next);
  const unhandled = facts.filter(
    (fact) =>
      FACTS_NEEDING_A_STEP.includes(fact.kind) &&
      !['removed', 'moved', 'dependency-removed'].includes(fact.kind),
  );
  if (unhandled.length > 0) {
    throw new Error(`no ${VERSION} step for: ${unhandled.map((fact) => fact.id).join(', ')}`);
  }

  const release = assembleRelease({
    version: VERSION,
    previous: PREVIOUS,
    date: DATE,
    summary: SUMMARY,
    backfilled: true,
    steps: [
      ...nameSteps(facts, readJson(repo, 'codemods/removed-0.20.json'), next),
      ...dependencySteps(facts),
      ...proseSteps(readFileSync(join(repo, 'CHANGELOG.md'), 'utf8')),
    ],
  });
  const missed = uncoveredFacts(facts, release.steps);
  if (missed.length > 0) {
    throw new Error(`facts with no step: ${missed.map((fact) => fact.id).join(', ')}`);
  }
  return release;
}

function main(argv) {
  if (argv.length > 1 || (argv.length === 1 && argv[0] !== '--check')) {
    console.error('usage: build-ledger-0.20.mjs [--check]');
    return 2;
  }
  const text = formatJson(buildLedger020());
  if (argv[0] === '--check') {
    if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== text) {
      console.error(
        'build-ledger-0.20.mjs: upgrade/releases/0.20.0.json is stale; run node scripts/upgrade/build-ledger-0.20.mjs',
      );
      return 1;
    }
    console.log('build-ledger-0.20.mjs: upgrade/releases/0.20.0.json is current');
    return 0;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, text);
  console.log(`build-ledger-0.20.mjs: wrote ${OUT}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
