/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-token-structure.mjs
 *
 * Validates hirobius.tokens.json for structural correctness.
 * Catches three categories of architectural error:
 *
 * 1. Cross-tier aliasing — a token references a token in the wrong tier:
 *      semantic.*  must only alias primitive.*
 *      component.* must alias semantic.* or component.* (not primitive.* directly)
 *      primitive.* must not use aliases
 *
 * 2. Theme coverage gaps — a token with $extensions["com.figma.variables"].modes
 *    must define values for BOTH Light and Dark.
 *
 * 3. Non-monotonic ordered scales — a sibling group of leaves whose keys are ALL
 *    drawn from the shared t-shirt-size step vocabulary (2xs..9xl) must resolve
 *    to strictly increasing numeric values as the step name grows. Catches a
 *    named step being larger than its neighbor but valued smaller (e.g.
 *    primitive.typography.size.5xl = 80px vs 7xl = 72px — hds#227). Applies
 *    generically to any current or future primitive scale that uses the t-shirt
 *    vocabulary (today: typography.size, breakpoint, borderWidth), not just
 *    typography — a group is only checked when EVERY one of its leaf keys is a
 *    recognized step name; anything else (color ramps, spacing's numeric keys,
 *    weight/lineHeight/letterSpacing's adjectival vocab) is left alone.
 *
 * No suppression mechanism. All violations require a structural fix in the JSON.
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TOKENS_FILE = join(ROOT, 'hirobius.tokens.json');

// Fixture mode: proof-of-firing harness supplies a single file via env vars.
// No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// Alias pattern: {path.to.token}
const ALIAS_RE = /^\{([^}]+)\}$/;

// ── Ordered-scale (monotonicity) vocabulary ─────────────────────────────────
// The shared t-shirt-size step vocabulary, low to high. A tuple entry means
// two names share one rung (different scales use 'base' or 'md' as their
// middle step; no scale today defines both, so treating them as equal rank
// is safe — see hds#227).
const TSHIRT_STEPS = [
  '2xs',
  'xs',
  'sm',
  ['base', 'md'],
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl',
  '9xl',
];
const TSHIRT_RANK = new Map(
  TSHIRT_STEPS.flatMap((step, rank) =>
    Array.isArray(step) ? step.map((name) => [name, rank]) : [[step, rank]],
  ),
);

/**
 * Extract a plain finite number from a DTCG $value — either a bare number
 * (fontWeight, lineHeight, …) or a dimension object { value, unit }.
 * Returns null for anything else (color, string, composite $value, …), which
 * takes the leaf out of monotonicity consideration.
 */
function numericLeafValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof value.value === 'number') {
    return Number.isFinite(value.value) ? value.value : null;
  }
  return null;
}

/**
 * Group-level check: if `node`'s direct children are ALL leaves whose keys
 * are ALL in the t-shirt-size vocabulary, assert the values strictly increase
 * in vocabulary order. Any child that isn't a leaf, or whose key isn't a
 * recognized step name, or whose $value isn't numeric, takes the WHOLE group
 * out of consideration (no partial-vocabulary matching) — this keeps color
 * ramps, primitive.space's numeric keys, and adjectival vocabularies
 * (weight/lineHeight/letterSpacing) untouched.
 */
function checkScaleMonotonicity(node, path) {
  const keys = Object.keys(node).filter((k) => !k.startsWith('$'));
  const steps = [];
  for (const key of keys) {
    const child = node[key];
    if (!child || typeof child !== 'object' || !('$value' in child)) return;
    if (!TSHIRT_RANK.has(key)) return;
    const num = numericLeafValue(child['$value']);
    if (num === null) return;
    steps.push({ key, rank: TSHIRT_RANK.get(key), value: num });
  }
  if (steps.length < 2) return;

  steps.sort((a, b) => a.rank - b.rank);
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const cur = steps[i];
    if (cur.value <= prev.value) {
      violations.push({
        type: 'non-monotonic-scale',
        path,
        pair: [`${path}.${prev.key}`, `${path}.${cur.key}`],
        values: [prev.value, cur.value],
        fix: `${path}.${cur.key} (${cur.value}) must be greater than ${path}.${prev.key} (${prev.value}) — an ordered scale must increase monotonically with its step name`,
      });
    }
  }
}

const violations = [];
const FORBIDDEN_TYPOGRAPHY_SUBTREES = new Set([
  'semantic.typography.docs',
  'semantic.typography.sidebar',
  'component.typography.sidebar',
]);

function getTier(path) {
  return path.split('.')[0]; // primitive | semantic | component
}

// Cross-tier aliasing is enforced for COLOR tokens only.
// Spacing, font, radius, layout, fontWeight: component → primitive is acceptable
// (industry standard — Material Design 3, IBM Carbon, Atlassian allow this for
// non-semantic properties that don't change between themes or densities).
// See ADR-009 in DECISIONS.md.
const COLOR_CROSS_TIER_TYPES = new Set(['color']);

function walkTokens(node, path, inheritedType = null) {
  if (typeof node !== 'object' || node === null) return;

  if (FORBIDDEN_TYPOGRAPHY_SUBTREES.has(path)) {
    violations.push({
      type: 'forbidden-subtree',
      path,
      fix: 'remove this subtree and use the core semantic typography ramp instead',
    });
    return;
  }

  // Track the effective $type — set at any level, inherited by children
  const effectiveType = node['$type'] ?? inheritedType;

  if ('$value' in node) {
    // This is a leaf token
    const value = node['$value'];
    const currentTier = getTier(path);

    // ── Cross-tier check (color only — see ADR-009) ───────────────────────
    if (COLOR_CROSS_TIER_TYPES.has(effectiveType)) {
      const aliasMatch = typeof value === 'string' && value.match(ALIAS_RE);
      if (aliasMatch) {
        const refPath = aliasMatch[1];
        const refTier = getTier(refPath);

        // semantic → semantic: lateral alias (forbidden)
        if (currentTier === 'semantic' && refTier === 'semantic') {
          violations.push({
            type: 'cross-tier',
            label: 'semantic → semantic (lateral alias)',
            path,
            ref: value,
            fix: `alias to a primitive token (e.g. {primitive.color.*})`,
          });
        }
        // component → primitive: skips semantic tier (forbidden for colors)
        if (currentTier === 'component' && refTier === 'primitive') {
          violations.push({
            type: 'cross-tier',
            label: 'component → primitive (skips semantic tier)',
            path,
            ref: value,
            fix: `route through a semantic color token (e.g. {semantic.color.*})`,
          });
        }
        // primitive color aliases: raw values only
        if (currentTier === 'primitive' && refTier !== 'primitive') {
          violations.push({
            type: 'cross-tier',
            label: 'primitive → non-primitive (primitives must be raw values)',
            path,
            ref: value,
            fix: `replace with a raw hex value`,
          });
        }
      }
    }

    // ── Theme coverage check ──────────────────────────────────────────────
    const ext = node['$extensions'];
    if (ext && ext['com.figma.variables'] && ext['com.figma.variables']['modes']) {
      const modes = ext['com.figma.variables']['modes'];
      if (!('Light' in modes)) {
        violations.push({
          type: 'coverage',
          path,
          missing: 'Light',
          fix: `add a Light mode value in $extensions["com.figma.variables"]["modes"]["Light"]`,
        });
      }
      if (!('Dark' in modes)) {
        violations.push({
          type: 'coverage',
          path,
          missing: 'Dark',
          fix: `add a Dark mode value in $extensions["com.figma.variables"]["modes"]["Dark"]`,
        });
      }
    }

    return; // leaf — don't recurse further
  }

  // ── Ordered-scale monotonicity check (group level only) ─────────────────
  checkScaleMonotonicity(node, path);

  // Recurse into children (skip $ meta-keys), passing effective type down
  for (const key of Object.keys(node)) {
    if (key.startsWith('$')) continue;
    const childPath = path ? `${path}.${key}` : key;
    walkTokens(node[key], childPath, effectiveType);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const targetFile = isFixtureMode && fixtureFile ? resolve(fixtureFile) : TOKENS_FILE;
let tokens;
try {
  tokens = JSON.parse(readFileSync(targetFile, 'utf-8'));
} catch (err) {
  console.error(`✗ check-token-structure — failed to parse ${targetFile}: ${err.message}`);
  process.exit(1);
}

// Walk top-level tiers: primitive, semantic, component
for (const key of Object.keys(tokens)) {
  if (key.startsWith('$')) continue;
  walkTokens(tokens[key], key);
}

if (violations.length === 0) {
  console.log(
    '✓ check-token-structure — no cross-tier alias violations, theme coverage gaps, or non-monotonic ordered scales',
  );
  process.exit(0);
} else {
  console.error(`\n✗ check-token-structure — ${violations.length} violation(s) found\n`);
  for (const v of violations) {
    if (v.type === 'cross-tier') {
      console.error(`  Cross-tier alias (${v.label}):`);
      console.error(`    ${v.path} → ${v.ref}`);
      console.error(`    Fix: ${v.fix}\n`);
    } else if (v.type === 'forbidden-subtree') {
      console.error('  Forbidden typography subtree:');
      console.error(`    ${v.path}`);
      console.error(`    Fix: ${v.fix}\n`);
    } else if (v.type === 'non-monotonic-scale') {
      console.error('  Non-monotonic ordered scale:');
      console.error(`    ${v.pair[0]} = ${v.values[0]}  →  ${v.pair[1]} = ${v.values[1]}`);
      console.error(`    Fix: ${v.fix}\n`);
    } else {
      console.error(`  Theme coverage gap:`);
      console.error(`    ${v.path} — missing ${v.missing} mode`);
      console.error(`    Fix: ${v.fix}\n`);
    }
  }
  process.exit(1);
}
