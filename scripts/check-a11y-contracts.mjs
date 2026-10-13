#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-a11y-contracts — every interactive component states its accessibility
 * contract, and every rule the component keeps points at a test that proves it
 * (hds#520).
 *
 * The rules are `@a11y` JSDoc tags (docs/rules/REACT_COMPONENTS.md) that
 * `pnpm manifest:generate` writes to `a11yRules` on the manifest spec and to
 * component-api.json:
 *
 *   @a11y component required a11y:menu.escape-returns-focus Escape closes the menu.
 *   @a11y consumer required Give an icon-only Menu.Trigger an aria-label.
 *
 * Checks (ids appear in every message):
 *   E1-empty         an INTERACTIVE root has no a11yRules
 *   E2-owner         a rule on an INTERACTIVE root has no owner
 *   E3-untested      an owner:component rule has no testId, or its testId is not
 *                    found: a11y:<id> must be a literal in a test file with no
 *                    skip/todo and not on a `.fails(` line; gate:<id> must name a
 *                    gate in docs/guardrails/registry.json
 *   E4-unclassified a component in Overlays/Inputs/Navigation/Actions that is in
 *                    neither INTERACTIVE, PARTS nor COMPOSITE (scripts/lib/a11y-interactive.mjs)
 *   W1-orphan        an a11y:<id> in a test that no rule references
 *   W2-duplicate     two rules share an a11y:<id> (a gate:<id> may back many
 *                    rules: one gate proves one property across components)
 *
 *   node scripts/check-a11y-contracts.mjs             # lists every gap, exits 0 (report only)
 *   node scripts/check-a11y-contracts.mjs --enforce   # exits 1 on any E1-E4; pre-commit runs this (severity error)
 *
 * --manifest <path> reads another manifest and --tests <dir> another test root,
 * for the tests. The proof-of-firing harness (FIXTURE_FILE) hands a fixture
 * `{ componentSpecs, testFiles: { path: text }, gateIds }` and always enforces.
 * Reads the manifest and greps ~70 test files: no build, browser or network.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COMPOSITE, GOVERNED_CATEGORIES, INTERACTIVE, PARTS } from './lib/a11y-interactive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST = path.join(ROOT, 'public/hds-manifest.json');
const REGISTRY = path.join(ROOT, 'docs/guardrails/registry.json');
const TEST_ROOTS = ['tests/primitive-contracts', 'src/app/components', 'src/styles/__tests__'];
const TEST_FILE = /\.(test|contract\.test)\.(ts|tsx|mjs)$|(^|\/)overlay-fixtures\.tsx$/;
const TEST_ID = /a11y:[A-Za-z0-9][A-Za-z0-9_.-]*[A-Za-z0-9]/g;
const SKIPPED = /\b(?:it|test|describe)\.(?:skip|todo)\b|\bx(?:it|describe|test)\s*\(/;

/**
 * The test ids that count: every a11y:<id> literal in a file with no skipped
 * or todo test, except on a line that marks the test `.fails(`.
 *
 * @param {Array<{path: string, text: string}>} files
 * @returns {Map<string, string[]>} id to the files that prove it
 */
export function collectTestIds(files) {
  const found = new Map();
  for (const file of files) {
    if (SKIPPED.test(file.text)) continue;
    for (const line of file.text.split('\n')) {
      if (/\.fails\s*\(/.test(line)) continue;
      for (const id of line.match(TEST_ID) ?? []) {
        found.set(id, [...new Set([...(found.get(id) ?? []), file.path])]);
      }
    }
  }
  return found;
}

/**
 * @param {{
 *   specs: Record<string, any>,
 *   testFiles: Array<{path: string, text: string}>,
 *   gateIds: Iterable<string>,
 * }} input
 * @returns {{ errors: Array<{code: string, component: string, message: string}>, warnings: Array<{code: string, component: string, message: string}>, checked: number }}
 */
export function findA11yGaps({ specs, testFiles, gateIds }) {
  const errors = [];
  const warnings = [];
  const gates = new Set(gateIds);
  const proven = collectTestIds(testFiles);
  const referenced = new Map();
  const interactive = new Set(INTERACTIVE);
  const where = (name) => specs[name]?.filePath ?? '(no spec)';
  const fail = (code, component, message) => errors.push({ code, component, message });

  let checked = 0;
  for (const name of INTERACTIVE) {
    const spec = specs[name];
    if (!spec) continue;
    checked += 1;
    const rules = spec.a11yRules ?? [];
    if (rules.length === 0) {
      fail(
        'E1-empty',
        name,
        `${name}: no a11yRules (${where(name)}) - add @a11y tags, then pnpm manifest:generate`,
      );
    }
    for (const r of rules) {
      if (r.owner !== 'component' && r.owner !== 'consumer') {
        fail(
          'E2-owner',
          name,
          `${name}: rule has no owner (component|consumer): "${r.rule}" - tag it with @a11y`,
        );
      }
    }
  }

  for (const [name, spec] of Object.entries(specs)) {
    for (const r of spec.a11yRules ?? []) {
      if (r.testId) referenced.set(r.testId, [...(referenced.get(r.testId) ?? []), name]);
      if (r.owner !== 'component') continue;
      if (!r.testId) {
        fail(
          'E3-untested',
          name,
          `${name}: owner:component rule has no testId: "${r.rule}" - add a11y:<component>.<behaviour> or gate:<id>`,
        );
      } else if (r.testId.startsWith('gate:')) {
        if (!gates.has(r.testId.slice(5))) {
          fail(
            'E3-untested',
            name,
            `${name}: ${r.testId} names no gate in docs/guardrails/registry.json`,
          );
        }
      } else if (!proven.has(r.testId)) {
        fail(
          'E3-untested',
          name,
          `${name}: ${r.testId} is not in any active test (absent, skipped, todo or .fails) - add the contract test, a gap is a code issue not a doc edit`,
        );
      }
    }
  }

  const classified = new Set([...interactive, ...Object.keys(PARTS), ...COMPOSITE]);
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.hidden || spec.deprecated) continue;
    if (!GOVERNED_CATEGORIES.includes(spec.category)) continue;
    if (classified.has(name)) continue;
    fail(
      'E4-unclassified',
      name,
      `${name}: ${spec.category} component is not classified for a11y - add it to INTERACTIVE, PARTS or COMPOSITE in scripts/lib/a11y-interactive.mjs`,
    );
  }

  for (const [id, owners] of referenced) {
    if (owners.length > 1 && !id.startsWith('gate:')) {
      warnings.push({
        code: 'W2-duplicate',
        component: owners[0],
        message: `${id} is the testId of ${owners.length} rules (${owners.join(', ')})`,
      });
    }
  }
  for (const [id, files] of proven) {
    if (!referenced.has(id)) {
      warnings.push({
        code: 'W1-orphan',
        component: '',
        message: `${id} appears in ${files.join(', ')} but no rule references it`,
      });
    }
  }

  return { errors, warnings, checked };
}

function listTestFiles(rootDir, relBase) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (TEST_FILE.test(full.split(path.sep).join('/'))) {
        out.push({
          path: path.relative(relBase, full).split(path.sep).join('/'),
          text: readFileSync(full, 'utf8'),
        });
      }
    }
  };
  walk(rootDir);
  return out;
}

function argValue(flag) {
  const at = process.argv.indexOf(flag);
  if (at === -1) return null;
  if (!process.argv[at + 1]) {
    console.error(`✗ check-a11y-contracts — ${flag} needs a path`);
    process.exit(1);
  }
  return path.resolve(process.argv[at + 1]);
}

function readRegistryIds() {
  if (!existsSync(REGISTRY)) return [];
  return (JSON.parse(readFileSync(REGISTRY, 'utf8')).gates ?? []).map((g) => g.id);
}

function main() {
  const fixture = process.env.FIXTURE_FILE;
  const enforce = process.argv.includes('--enforce') || Boolean(fixture);
  let input;

  if (fixture) {
    const data = JSON.parse(readFileSync(fixture, 'utf8'));
    input = {
      specs: data.componentSpecs ?? {},
      testFiles: Object.entries(data.testFiles ?? {}).map(([p, text]) => ({ path: p, text })),
      gateIds: data.gateIds ?? [],
    };
  } else {
    const manifest = argValue('--manifest') ?? DEFAULT_MANIFEST;
    if (!existsSync(manifest)) {
      console.error(`✗ check-a11y-contracts — ${path.relative(ROOT, manifest)} is missing`);
      console.error('  fix: pnpm manifest:generate');
      process.exit(1);
    }
    const testsDir = argValue('--tests');
    input = {
      specs: JSON.parse(readFileSync(manifest, 'utf8')).componentSpecs ?? {},
      testFiles: testsDir
        ? listTestFiles(testsDir, testsDir)
        : TEST_ROOTS.flatMap((r) => listTestFiles(path.join(ROOT, r), ROOT)),
      gateIds: readRegistryIds(),
    };
  }

  const { errors, warnings, checked } = findA11yGaps(input);
  const withRules = checked - errors.filter((e) => e.code === 'E1-empty').length;
  console.log(
    `\ncheck-a11y-contracts — ${withRules}/${checked} interactive components state their a11y contract, ${errors.length} gap(s)`,
  );

  for (const w of warnings) console.log(`  warn ${w.code}  ${w.message}`);
  if (errors.length === 0) return;

  const out = enforce ? console.error : console.log;
  out(`\n${enforce ? '✗' : '·'} ${errors.length} gap(s):\n`);
  for (const e of errors) out(`    ${e.code}  ${e.message}`);
  out(
    '\n  fix: add @a11y tags to the component JSDoc (docs/rules/REACT_COMPONENTS.md), write the\n' +
      '  contract test that carries each a11y:<id>, then pnpm manifest:generate.',
  );

  if (enforce) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
