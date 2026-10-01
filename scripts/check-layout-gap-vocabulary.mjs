#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-layout-gap-vocabulary.mjs
 *
 * hds#404 — one layout-gap vocabulary. The four layout-gap names map to the
 * t-shirt scale in one place, `LAYOUT_GAP_NAMES` in
 * src/app/components/box-sx.ts:
 *
 *   tight → scale.sm, normal → scale.md, inset → scale.lg, spacious → scale.xl
 *
 * Cluster, Grid, Sidebar, Cover, Switcher, Bleed, Center and Card each kept a
 * private copy of that map until hds#404, and nothing kept the copies in step
 * with Stack's names. This gate fails a second copy anywhere else in src/, so
 * the next component resolves through the shared one instead of growing its
 * own. ERROR severity, run by .husky/pre-commit (docs/guardrails/registry.json).
 *
 * What it catches: one of the four names paired with a scale step, where the
 * step is a `var(--semantic-space-scale-<step>)` string (also inside calc()
 * or a template literal), `SPACE_SCALE.<step>`, or `<x>.space.scale.<step>`
 * (the `hds.semantic.space.scale` token bridge), read by dot or by a string
 * index. It parses each file with the TypeScript API and finds the pairing as
 *   - an object property (`tight: 'var(--semantic-space-scale-sm)'`, quoted
 *     or not, through `as`, `satisfies` and parentheses);
 *   - a `[name, step]` entry pair, the shape a `Map` or `Object.fromEntries`
 *     takes;
 *   - a `case 'tight':` whose statements (or, after fall-through, the next
 *     case's) produce a step;
 *   - a comparison that picks a step (`gap === 'tight' ? step : ...`, and the
 *     `!==` form's other branch).
 *
 * What it ignores:
 *   - src/app/components/box-sx.ts, the one copy.
 *   - *.test.* / *.spec.* files and __tests__/ directories: a test pins the
 *     output a resolver renders (stack.test.tsx's TODAY map); it resolves
 *     nothing.
 *   - The names on anything but a scale step: Box `sx`'s deprecated names on
 *     the fixed `--semantic-space-layout-*` vars, and the words as CSS
 *     keywords (`fontWeight: 'normal'`, `boxShadow: 'inset ...'`).
 *   - A scale step under any other key (`gap: SPACE_SCALE.xs`).
 *   - Lines with `// layout-gap-ok: <reason>` on the same or preceding line.
 *
 * What it does not follow (a known limit, also in the registry entry): a
 * step reached through another name (`const s = SPACE_SCALE; { tight: s.sm }`),
 * a computed key (`{ [name]: step }`), a var name assembled at runtime
 * (`'var(--semantic-space-scale-' + step + ')'`), and an `if` chain. Those
 * reach a map without a pairing the gate can see; review catches them.
 *
 * Fix: import `LAYOUT_GAP` (the four names and nothing else) or
 * `LAYOUT_GAP_NAMES` (to spread into a wider vocabulary, as Card and Stack
 * do) from src/app/components/box-sx.ts and resolve through
 * `resolveSpacingValue`.
 *
 * Run: node scripts/check-layout-gap-vocabulary.mjs
 * Or:  pnpm check:layout-gap-vocabulary
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, basename, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

/** The one copy of the map. */
const CANONICAL = 'src/app/components/box-sx.ts';

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

/** The layout-gap names box-sx.ts maps to the scale. */
export const LAYOUT_GAP_NAMES = Object.freeze(['tight', 'normal', 'inset', 'spacious']);
const NAMES = new Set(LAYOUT_GAP_NAMES);
const STEPS = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const SCALE_VAR = /var\(\s*--semantic-space-scale-(xs|sm|md|lg|xl)\s*\)/;
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__tests__']);

/** Whether a repo-relative path is out of scope: the one copy, or a test. */
export function isExempt(rel) {
  return rel === CANONICAL || /\.(test|spec)\.[cm]?[jt]sx?$/.test(basename(rel));
}

/** Unwraps `(x)`, `x as T`, `x satisfies T` and `<T>x` down to the expression itself. */
function unwrap(node) {
  let n = node;
  while (
    n &&
    (ts.isParenthesizedExpression(n) ||
      ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isTypeAssertionExpression(n))
  ) {
    n = n.expression;
  }
  return n;
}

/** A key or literal as written (`tight`, `'tight'`, `['tight']`), or null. */
function literalText(node) {
  const n = unwrap(node);
  if (!n) return null;
  if (ts.isIdentifier(n) || ts.isStringLiteralLike(n) || ts.isNumericLiteral(n)) return n.text;
  if (ts.isComputedPropertyName(n)) {
    const inner = unwrap(n.expression);
    return ts.isStringLiteralLike(inner) ? inner.text : null;
  }
  return null;
}

/** A string literal's text (`'tight'`), or null for anything else. */
function stringText(node) {
  const n = unwrap(node);
  return n && ts.isStringLiteralLike(n) ? n.text : null;
}

/** `SPACE_SCALE`, or a `<x>.space.scale` chain such as `hds.semantic.space.scale`. */
function isScaleObject(node) {
  const n = unwrap(node);
  if (ts.isIdentifier(n)) return n.text === 'SPACE_SCALE';
  if (!ts.isPropertyAccessExpression(n)) return false;
  if (n.name.text === 'SPACE_SCALE') return true;
  const parent = unwrap(n.expression);
  return (
    n.name.text === 'scale' && ts.isPropertyAccessExpression(parent) && parent.name.text === 'space'
  );
}

/** The scale step ('sm') a value reads, or null when it reads none. */
function scaleStep(node) {
  const n = unwrap(node);
  if (!n) return null;
  if (ts.isStringLiteralLike(n)) return SCALE_VAR.exec(n.text)?.[1] ?? null;
  if (ts.isTemplateExpression(n)) {
    const text = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join('');
    const inText = SCALE_VAR.exec(text)?.[1];
    if (inText) return inText;
    for (const span of n.templateSpans) {
      const step = scaleStep(span.expression);
      if (step) return step;
    }
    return null;
  }
  if (ts.isPropertyAccessExpression(n) && STEPS.has(n.name.text) && isScaleObject(n.expression)) {
    return n.name.text;
  }
  if (ts.isElementAccessExpression(n) && isScaleObject(n.expression)) {
    const key = literalText(n.argumentExpression);
    return key !== null && STEPS.has(key) ? key : null;
  }
  return null;
}

/** The first scale step any expression under `node` reads, or null. */
function firstStepWithin(node) {
  let found = null;
  const visit = (n) => {
    if (found) return;
    const step = scaleStep(n);
    if (step) {
      found = step;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

const EQUALS = new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken]);
const NOT_EQUALS = new Set([
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

/** The layout-gap name a comparison tests for (`gap === 'tight'`), or null. */
function comparedName(condition) {
  const c = unwrap(condition);
  if (!ts.isBinaryExpression(c)) return null;
  const op = c.operatorToken.kind;
  if (!EQUALS.has(op) && !NOT_EQUALS.has(op)) return null;
  for (const side of [c.left, c.right]) {
    const s = unwrap(side);
    if (ts.isStringLiteralLike(s) && NAMES.has(s.text)) {
      return { name: s.text, negated: NOT_EQUALS.has(op) };
    }
  }
  return null;
}

/**
 * Scans one file's text for a second copy of the layout-gap map.
 *
 * @param {string} text
 * @param {string} rel - repo-relative path used in reported violations
 * @returns {Array<{file:string, line:number, name:string, step:string, raw:string}>}
 */
export function findViolationsInText(text, rel) {
  if (!/\b(tight|normal|inset|spacious)\b/.test(text)) return [];
  if (!/semantic-space-scale-|SPACE_SCALE|\bscale\b/.test(text)) return [];

  const lines = text.split('\n');
  const ext = extname(rel);
  const kind =
    { '.ts': ts.ScriptKind.TS, '.tsx': ts.ScriptKind.TSX, '.jsx': ts.ScriptKind.JSX }[ext] ??
    ts.ScriptKind.JS;
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  const violations = [];

  const report = (at, name, step) => {
    const line = source.getLineAndCharacterOfPosition(at.getStart(source)).line;
    const suppressed =
      lines[line].includes('layout-gap-ok') ||
      (line > 0 && lines[line - 1].includes('layout-gap-ok'));
    if (suppressed) return;
    violations.push({
      file: rel,
      line: line + 1,
      name,
      step,
      raw: lines[line].trim().slice(0, 120),
    });
  };

  const visit = (node) => {
    if (ts.isPropertyAssignment(node)) {
      const name = literalText(node.name);
      const step = name !== null && NAMES.has(name) ? scaleStep(node.initializer) : null;
      if (step) report(node, name, step);
    } else if (ts.isArrayLiteralExpression(node) && node.elements.length === 2) {
      const name = stringText(node.elements[0]);
      const step = name !== null && NAMES.has(name) ? scaleStep(node.elements[1]) : null;
      if (step) report(node.elements[0], name, step);
    } else if (ts.isCaseClause(node)) {
      const name = stringText(node.expression);
      if (name !== null && NAMES.has(name)) {
        // Fall through empty cases to the first one with a body.
        const clauses = node.parent.clauses;
        let body = node;
        for (let i = clauses.indexOf(node); i < clauses.length; i += 1) {
          body = clauses[i];
          if (body.statements.length > 0) break;
        }
        const step = body.statements.map(firstStepWithin).find(Boolean);
        if (step) report(node, name, step);
      }
    } else if (ts.isConditionalExpression(node)) {
      const compared = comparedName(node.condition);
      if (compared) {
        const step = scaleStep(compared.negated ? node.whenFalse : node.whenTrue);
        if (step) report(node, compared.name, step);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return violations.sort((a, b) => a.line - b.line);
}

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, results);
    } else if (EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files =
    isFixtureMode && fixtureFile
      ? [resolve(fixtureFile)]
      : collectFiles(SRC).filter((file) => !isExempt(relative(ROOT, file).replace(/\\/g, '/')));

  const violations = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    violations.push(...findViolationsInText(readFileSync(file, 'utf-8'), rel));
  }

  if (jsonMode) {
    const canonical = violations.map((v) => ({
      file: v.file,
      line: v.line,
      rule: 'layout-gap-second-copy',
      severity: 'error',
      message: `${v.name} → scale.${v.step}: a second copy of the layout-gap name map; resolve through LAYOUT_GAP or LAYOUT_GAP_NAMES in ${CANONICAL} (hds#404)`,
      sample: v.raw,
    }));
    emitResult(
      { violations: canonical, summary: { total: violations.length }, ok: violations.length === 0 },
      true,
    );
    process.exit(violations.length === 0 ? 0 : 1);
  }

  if (violations.length === 0) {
    console.log(`[ok] check-layout-gap-vocabulary — the layout-gap names map in ${CANONICAL} only`);
    process.exit(0);
  }

  console.error(
    `\n✗ check-layout-gap-vocabulary — ${violations.length} entr${violations.length === 1 ? 'y' : 'ies'} of a second layout-gap name map (hds#404):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.name} → scale.${v.step}]`);
    console.error(`    ${v.raw}`);
  }
  console.error(
    `\nFix: import LAYOUT_GAP (the four names, nothing else) or LAYOUT_GAP_NAMES (to spread into`,
  );
  console.error(`  a wider vocabulary) from ${CANONICAL} and resolve through resolveSpacingValue,`);
  console.error('  or suppress with // layout-gap-ok: <reason>\n');
  process.exit(1);
}
