#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-spacing-vocabulary.mjs
 *
 * hds#206 — spacing vocabulary gate. Adrian's decision (2026-09-26): spacing
 * uses t-shirt sizes (xs/sm/md/lg/xl — semantic.space.scale.*), and raw
 * integers are banned on padding/gap props. ERROR severity, run by
 * .husky/pre-commit (see docs/guardrails/registry.json): it shipped as warn
 * and was promoted once hds's own src/ had zero findings.
 *
 * What it catches:
 *   A raw numeric literal on a spacing shorthand key (`p`, `m`, `gap`, `pt`,
 *   `pr`, `pb`, `pl`, `px`, `py`, `mt`, `mr`, `mb`, `ml`, `mx`, `my`,
 *   `rowGap`, `columnGap`) in a Box `sx` object — e.g. `sx={{ p: 2 }}` or
 *   `sx={{ gap: 4 }}`. This is the exact ambiguity from hds#206 defect 1: the
 *   numeric scale is a count of 4px units (`p: 4` renders 16px, not 4px), so a
 *   bare integer here is unpredictable at the call site. It parses each file
 *   with the TypeScript API, so it also sees:
 *   - integers inside a responsive map on a spacing key
 *     (`sx={{ p: { xs: 2, md: 4 } }}`) and inside `&`-selector blocks;
 *   - any spacing of the attribute (`sx={ { p: 4 } }`, `sx = {{ ... }}`);
 *   - either branch of a conditional and the operands of `&&`, `||` and
 *     `??`, on a spacing value (`p: dense ? 2 : 'md'`, `p: size ?? 4`) or on
 *     the sx object itself (`sx={dense ? { p: 3 } : base}`,
 *     `sx={{ ...(dense && { m: 5 }) }}`);
 *   - an object declared in the same file and passed by name
 *     (`const style = { p: 4 }; sx={style}`), by member (`sx={styles.row}`,
 *     which scans all of `styles`) or spread (`sx={{ ...base }}`), following
 *     `as`, `satisfies` and parentheses. A name resolves by lexical scope:
 *     the nearest enclosing block, function, module or file that declares it
 *     wins, so a same-name declaration in another function does not hide it,
 *     and a parameter or `for`/`catch` binding of that name shadows an outer
 *     object.
 *
 * What it does not follow (a known limit, also in the registry entry): an
 * object imported from another file, returned from a function, built at
 * runtime (`Object.assign`, a computed key), or a spacing key given as a
 * shorthand property (`{ p }`). Those reach sx without a literal the gate can
 * see; review catches them. Nor does it read an array (`sx={[{ p: 2 }]}`):
 * Box's `sx` is an `SxObject`, which rejects an array, so `pnpm typecheck`
 * fails first, and the resolver would not merge one. Only a declaration's
 * initializer is read, and only when it is an object literal, so a
 * conditional initializer (`const s = x ? { p: 15 } : {}; sx={s}`), a `let`
 * reassigned later and a `var` used outside the block that declares it are
 * not followed either. Put the conditional on the sx attribute instead
 * (`sx={x ? { p: 'md' } : {}}`), where the gate reads both branches.
 *
 * What it ignores:
 *   - String values (`p: 'md'`, `gap: 'var(--...)'`) — already named.
 *   - Objects that never reach an sx attribute (style props are a different,
 *     existing gate: check-hardcoded-spacing.mjs).
 *   - Lines with `// spacing-vocab-ok: <reason>` on the same or preceding line.
 *
 * Fix: replace the integer with a named step off
 * `semantic.space.scale.{xs,sm,md,lg,xl}` (e.g. `sx={{ p: 'md' }}`; Box's
 * resolver takes the scale), or suppress with `// spacing-vocab-ok: <reason>`
 * for an intentional exception.
 *
 * Run: node scripts/check-spacing-vocabulary.mjs
 * Or:  pnpm check:spacing-vocabulary
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, extname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const jsonMode = hasJsonFlag(process.argv);
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// The `sx` spacing shorthand keys resolved by box-sx.ts's SPACING_PROP_MAP.
export const SPACING_KEYS = new Set([
  'm',
  'mt',
  'mr',
  'mb',
  'ml',
  'mx',
  'my',
  'p',
  'pt',
  'pr',
  'pb',
  'pl',
  'px',
  'py',
  'gap',
  'rowGap',
  'columnGap',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '__tests__']);

/** Unwraps `(x)`, `x as T` and `x satisfies T` down to the expression itself. */
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

/** The property name as written (`p`, `'p'`, `"&:hover"`), or null for a computed key. */
function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

/** `4` → '4', `-2` → '-2', anything else → null. */
function numericLiteral(node) {
  const n = unwrap(node);
  if (ts.isNumericLiteral(n)) return n.text;
  if (
    ts.isPrefixUnaryExpression(n) &&
    (n.operator === ts.SyntaxKind.MinusToken || n.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(n.operand)
  ) {
    return `${n.operator === ts.SyntaxKind.MinusToken ? '-' : ''}${n.operand.text}`;
  }
  return null;
}

const LOGICAL_OPERATORS = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

/**
 * The operands an expression can evaluate to, or null when it is not a
 * conditional or logical expression: both branches of `a ? b : c`, the right
 * of `a && b` (the left is falsy there, never an object or a spacing
 * integer), and both sides of `a || b` and `a ?? b`.
 */
function possibleResults(node) {
  if (ts.isConditionalExpression(node)) return [node.whenTrue, node.whenFalse];
  if (ts.isBinaryExpression(node) && LOGICAL_OPERATORS.has(node.operatorToken.kind)) {
    return node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      ? [node.right]
      : [node.left, node.right];
  }
  return null;
}

/** Whether a binding name (`s`, `{ s }`, `[s]`, `{ a: s = 1 }`) binds `name`. */
function bindsName(binding, name) {
  if (ts.isIdentifier(binding)) return binding.text === name;
  if (ts.isObjectBindingPattern(binding) || ts.isArrayBindingPattern(binding)) {
    return binding.elements.some((el) => ts.isBindingElement(el) && bindsName(el.name, name));
  }
  return false;
}

/** The variable declaration for `name` among a scope's own statements, if any. */
function declarationIn(statements, name) {
  for (const statement of statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const found = statement.declarationList.declarations.find((d) => bindsName(d.name, name));
    if (found) return found;
  }
  return null;
}

/**
 * The object literal an identifier names, looked up by lexical scope: from
 * the identifier outwards, the first block, function body, module or file
 * that declares the name wins, and a parameter, a `for` or `catch` binding,
 * or a declaration that is not a plain `name = { ... }` shadows any outer
 * object. Null when the name does not resolve to an object literal in this
 * file.
 */
function resolveObjectDeclaration(identifier) {
  const name = identifier.text;
  for (let node = identifier.parent; node; node = node.parent) {
    let declaration = null;
    if (
      ts.isSourceFile(node) ||
      ts.isBlock(node) ||
      ts.isModuleBlock(node) ||
      ts.isCaseClause(node) ||
      ts.isDefaultClause(node)
    ) {
      declaration = declarationIn(node.statements, name);
    } else if (
      (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.initializer)
    ) {
      declaration = node.initializer.declarations.find((d) => bindsName(d.name, name)) ?? null;
    } else if (ts.isCatchClause(node) && node.variableDeclaration) {
      if (bindsName(node.variableDeclaration.name, name)) return null;
    } else if (ts.isFunctionLike(node) && node.parameters.some((p) => bindsName(p.name, name))) {
      return null;
    }
    if (declaration) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return null;
      const init = unwrap(declaration.initializer);
      return init && ts.isObjectLiteralExpression(init) ? init : null;
    }
  }
  return null;
}

/**
 * Scans a single file's text for banned raw-integer spacing values in Box
 * `sx` objects: inline (`sx={{ ... }}`, any spacing), or a same-file object
 * passed by name, member or spread, resolved by scope.
 *
 * @param {string} text
 * @param {string} rel - repo-relative path used in reported violations
 * @returns {Array<{file:string, line:number, key:string, value:string, raw:string}>}
 */
export function findViolationsInText(text, rel) {
  if (!/\bsx\s*=/.test(text)) return [];
  const lines = text.split('\n');
  const kind = rel.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);

  const violations = [];
  const scanned = new Set();

  const report = (key, valueNode, value) => {
    const line = source.getLineAndCharacterOfPosition(valueNode.getStart(source)).line;
    const suppressed =
      lines[line].includes('spacing-vocab-ok') ||
      (line > 0 && lines[line - 1].includes('spacing-vocab-ok'));
    if (suppressed) return;
    violations.push({
      file: rel,
      line: line + 1,
      key,
      value,
      raw: lines[line].trim().slice(0, 120),
    });
  };

  /**
   * A value on a spacing key: an integer, a responsive map of them, or an
   * expression that can evaluate to one (a conditional, `&&`, `||`, `??`).
   */
  const scanSpacingValue = (key, node) => {
    const n = unwrap(node);
    const value = numericLiteral(n);
    if (value !== null) return report(key, n, value);
    const branches = possibleResults(n);
    if (branches) {
      for (const branch of branches) scanSpacingValue(key, branch);
    } else if (ts.isObjectLiteralExpression(n)) {
      for (const prop of n.properties) {
        if (ts.isPropertyAssignment(prop)) scanSpacingValue(key, prop.initializer);
      }
    }
  };

  /** An sx object: spacing keys, nested `&` blocks, and spreads of same-file objects. */
  const scanSxObject = (obj) => {
    if (scanned.has(obj)) return;
    scanned.add(obj);
    for (const prop of obj.properties) {
      if (ts.isSpreadAssignment(prop)) {
        scanSxExpression(prop.expression);
      } else if (ts.isPropertyAssignment(prop)) {
        const key = propertyName(prop.name);
        if (key !== null && SPACING_KEYS.has(key)) {
          scanSpacingValue(key, prop.initializer);
        } else {
          const value = unwrap(prop.initializer);
          if (ts.isObjectLiteralExpression(value)) scanSxObject(value);
        }
      }
    }
  };

  /**
   * What an sx attribute (or a spread) holds: a literal, a name, a member of
   * a name, or a conditional or logical expression over those.
   */
  const scanSxExpression = (expression) => {
    let n = unwrap(expression);
    while (n && ts.isPropertyAccessExpression(n)) n = unwrap(n.expression);
    if (!n) return;
    const branches = possibleResults(n);
    if (branches) {
      for (const branch of branches) scanSxExpression(branch);
      return;
    }
    if (ts.isObjectLiteralExpression(n)) return scanSxObject(n);
    if (ts.isIdentifier(n)) {
      const declared = resolveObjectDeclaration(n);
      if (declared) scanSxObject(declared);
    }
  };

  const visit = (node) => {
    if (
      ts.isJsxAttribute(node) &&
      propertyName(node.name) === 'sx' &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      scanSxExpression(node.initializer.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return violations.sort((a, b) => a.line - b.line);
}

function collectFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, results);
      continue;
    }
    const ext = extname(entry);
    if (ext === '.tsx' || ext === '.ts') results.push(full);
  }
  return results;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const files = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : collectFiles(SRC);

  const violations = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf-8');
    violations.push(...findViolationsInText(text, rel));
  }

  if (jsonMode) {
    const canonical = violations.map((v) => ({
      file: v.file,
      line: v.line,
      rule: 'spacing-vocabulary-raw-integer',
      severity: 'error',
      message: `sx.${v.key}: ${v.value} — raw integer on a spacing prop; hds#206 bans this in favor of semantic.space.scale.{xs,sm,md,lg,xl}`,
      sample: v.raw,
    }));
    emitResult(
      { violations: canonical, summary: { total: violations.length }, ok: violations.length === 0 },
      true,
    );
    process.exit(violations.length === 0 ? 0 : 1);
  }

  if (violations.length === 0) {
    console.log('[ok] check-spacing-vocabulary — no raw integers on sx spacing props');
    process.exit(0);
  }

  console.error(
    `\n✗ check-spacing-vocabulary — ${violations.length} raw-integer spacing value(s) found (hds#206):\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.key}: ${v.value}]`);
    console.error(`    ${v.raw}`);
  }
  console.error('\nFix: use a named step off semantic.space.scale.{xs,sm,md,lg,xl} (hds#206), or');
  console.error('  suppress with // spacing-vocab-ok: <reason>\n');
  process.exit(1);
}
