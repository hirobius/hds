#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-pure-annotations — every top-level component-factory call under src/
 * carries a `/* @__PURE__ *\/` annotation, and no compound is assembled by
 * writing parts onto a component (hds#363, hds#365).
 *
 * `React.forwardRef(…)`, `forwardRef(…)`, `cva(…)`, `React.createContext(…)`,
 * `createContext(…)` and `withHdsPortal(…)` at module scope are calls a
 * bundler cannot prove side-effect free, so it keeps them — and everything
 * they reference — in any bundle that reaches the chunk they live in. One
 * bare call in a module that becomes reachable from the chunk shared with
 * Button is enough to re-break the Button-only budget (.size-limit.cjs), which
 * is exactly how hds#358 broke it. The annotation immediately before the call
 * is what rollup, esbuild, webpack and terser all read; a comment before the
 * `const` annotates nothing.
 *
 * Compounds are assembled with one pure `Object.assign(…)` around a wrapper of
 * our own, with `displayName` inside it and the inner call also pure. Two more
 * shapes are flagged because they are the same side effect (hds#365):
 *   - a top-level `Object.assign(…)` whose first argument is a component — a
 *     capitalised identifier, a namespaced one such as `XPrimitive.Root`, or a
 *     call — that lacks the annotation (an un-annotated wrapper around a
 *     tracked call was already flagged);
 *   - a top-level `X.Part = …` or `X.displayName = …` write on a capitalised
 *     identifier. Rollup drops such a write on an unused object; webpack and
 *     esbuild keep it, along with the whole module. There is no annotation
 *     that makes a write droppable, so `--fix` reports it and exits 1.
 *
 * Calls and writes inside function, arrow, method, accessor, constructor and
 * instance-field bodies run later and are ignored. A static class field or
 * static block runs when the class is evaluated — module load, for a top-level
 * class — so it is flagged like any other bare call. Tests, stories and `.d.ts`
 * files are out of scope.
 *
 *   node scripts/check-pure-annotations.mjs            # exits 1 on any offender
 *   node scripts/check-pure-annotations.mjs --fix      # inserts the annotation in place
 *   node scripts/check-pure-annotations.mjs --root <dir>
 *
 * Runs from .husky/pre-commit: source only, no build, no network.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Callee spellings whose top-level call must be annotated. */
export const TRACKED_CALLEES = new Set([
  'React.forwardRef',
  'forwardRef',
  'cva',
  'React.createContext',
  'createContext',
  'withHdsPortal',
]);

/** The compound wrapper: flagged when bare and wrapping a tracked call or a component. */
const WRAPPER = 'Object.assign';

/** What `--fix` inserts. */
export const ANNOTATION = '/* @__PURE__ */ ';

/** `/* @__PURE__ *\/` or `/*#__PURE__*\/`, as the last thing before the call. */
const PURE_BEFORE_CALL = /\/\*\s*[@#]__PURE__\s*\*\/\s*$/;

/** A component name by convention: `Menu`, `HoverCard`, `K`. */
const CAPITALISED = /^[A-Z]/;

/**
 * Whether a repo-relative path is in the gate's scope: TypeScript source under
 * src/ that ships, so not tests, stories, `__tests__` helpers or declarations.
 *
 * @param {string} relPath
 * @returns {boolean}
 */
export function isScannedFile(relPath) {
  const p = relPath.replace(/\\/g, '/');
  if (!p.startsWith('src/')) return false;
  if (!/\.tsx?$/.test(p) || p.endsWith('.d.ts')) return false;
  if (/\.(test|spec|stories)\.tsx?$/.test(p)) return false;
  if (p.split('/').includes('__tests__')) return false;
  return true;
}

function calleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    ts.isIdentifier(expression.name)
  ) {
    return `${expression.expression.text}.${expression.name.text}`;
  }
  return null;
}

function isAnnotated(node, sf) {
  return PURE_BEFORE_CALL.test(sf.text.slice(node.getFullStart(), node.getStart(sf)));
}

/** The expression under any parentheses, `as`, `satisfies`, `!` or `<T>` casts. */
function unwrap(expression) {
  let e = expression;
  for (;;) {
    if (
      ts.isParenthesizedExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isSatisfiesExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isTypeAssertionExpression(e)
    ) {
      e = e.expression;
    } else {
      return e;
    }
  }
}

/**
 * Nodes whose body runs later, not at module evaluation: any function-like
 * (function, arrow, method, accessor, constructor) and an instance field, whose
 * initialiser runs on construction. A class body is not deferred as a whole:
 * `static x = …` and `static { … }` run when the class is evaluated.
 */
function isDeferredBody(node) {
  if (ts.isFunctionLike(node)) return true;
  if (ts.isPropertyDeclaration(node)) {
    return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static) === 0;
  }
  return false;
}

/** Whether any argument of `call` holds a tracked call evaluated at module scope. */
function wrapsTrackedCall(call) {
  let found = false;
  const visit = (node) => {
    if (found || isDeferredBody(node)) return;
    if (ts.isCallExpression(node) && TRACKED_CALLEES.has(calleeName(node.expression) ?? '')) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  for (const arg of call.arguments) visit(arg);
  return found;
}

/**
 * Whether `Object.assign(first, …)` assembles a compound: its first argument is
 * a component by convention — a capitalised identifier (`Root`), a namespaced
 * one (`XPrimitive.Root`) or a call (`React.memo(…)`, `React.forwardRef(…)`).
 * A lower-case first argument or an object literal is a plain merge.
 */
function assemblesComponent(call) {
  const first = call.arguments[0];
  if (!first) return false;
  const target = unwrap(first);
  if (ts.isIdentifier(target)) return CAPITALISED.test(target.text);
  if (ts.isPropertyAccessExpression(target)) return CAPITALISED.test(target.name.text);
  return ts.isCallExpression(target);
}

/**
 * `X.a.b` for an assignment target rooted at a capitalised identifier, walking
 * property and element accesses (an element access prints as `[…]`) through any
 * cast; null when the root is not a component-like identifier.
 */
function componentWriteTarget(left) {
  const names = [];
  let e = unwrap(left);
  while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
    names.unshift(ts.isPropertyAccessExpression(e) ? `.${e.name.text}` : '[…]');
    e = unwrap(e.expression);
  }
  if (names.length === 0 || !ts.isIdentifier(e) || !CAPITALISED.test(e.text)) return null;
  return `${e.text}${names.join('')}`;
}

function isAssignment(node) {
  if (!ts.isBinaryExpression(node)) return false;
  const kind = node.operatorToken.kind;
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

/**
 * Every offender evaluated at module scope in one module's source: a bare
 * (un-annotated) top-level tracked call or compound wrapper (`kind: 'call'`),
 * and a top-level property write on a component (`kind: 'write'`), in source
 * order.
 *
 * @param {string} source  the module text
 * @param {string} file    path used in the report (not read from disk)
 * @returns {{file: string, kind: 'call' | 'write', callee?: string, target?: string, line: number, column: number, start: number, snippet: string}[]}
 */
export function findBareCalls(source, file) {
  const kind = file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const lines = source.split('\n');
  const findings = [];

  const report = (node, fields) => {
    const start = node.getStart(sf);
    const { line, character } = sf.getLineAndCharacterOfPosition(start);
    findings.push({
      file,
      ...fields,
      line: line + 1,
      column: character + 1,
      start,
      snippet: (lines[line] ?? '').trim().slice(0, 100),
    });
  };

  const visit = (node) => {
    if (isDeferredBody(node)) return;
    if (ts.isCallExpression(node)) {
      const callee = calleeName(node.expression);
      const tracked = callee !== null && TRACKED_CALLEES.has(callee);
      const wrapper = callee === WRAPPER && (wrapsTrackedCall(node) || assemblesComponent(node));
      if ((tracked || wrapper) && !isAnnotated(node, sf)) report(node, { kind: 'call', callee });
    } else if (isAssignment(node)) {
      const target = componentWriteTarget(node.left);
      if (target !== null) report(node, { kind: 'write', target });
    }
    ts.forEachChild(node, visit);
  };
  for (const statement of sf.statements) visit(statement);
  return findings.sort((a, b) => a.start - b.start);
}

/**
 * The source with `/* @__PURE__ *\/ ` inserted before every bare call.
 * Innermost/last calls first, so earlier offsets stay valid. A component
 * write is left alone: nothing makes it droppable, the compound has to be
 * restructured.
 *
 * @param {string} source
 * @param {string} file
 * @returns {{source: string, count: number}}
 */
export function annotateSource(source, file) {
  const findings = findBareCalls(source, file)
    .filter((f) => f.kind === 'call')
    .sort((a, b) => b.start - a.start);
  let out = source;
  for (const f of findings) out = out.slice(0, f.start) + ANNOTATION + out.slice(f.start);
  return { source: out, count: findings.length };
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Repo-relative paths of every file in scope under `root`.
 *
 * @param {string} root
 * @returns {string[]}
 */
export function scannedFiles(root) {
  const src = path.join(root, 'src');
  let files;
  try {
    files = walk(src);
  } catch {
    return [];
  }
  return files
    .map((f) => path.relative(root, f).replace(/\\/g, '/'))
    .filter(isScannedFile)
    .sort();
}

/** One report line per offender: `file:line:col  what   snippet`. */
function describe(f) {
  const what = f.kind === 'write' ? `${f.target} = …` : `${f.callee}(…)`;
  return `    ${f.file}:${f.line}:${f.column}  ${what}   ${f.snippet}`;
}

const FIX_HINT =
  '\n  fix: put /* @__PURE__ */ immediately before each call (the comment before the\n' +
  '  `const` does not count) — `node scripts/check-pure-annotations.mjs --fix` does it —\n' +
  '  or move the call inside a function. Compounds: one pure Object.assign(…) around a\n' +
  '  wrapper of our own, a pure inner call, displayName inside it, never `X.Part = …`\n' +
  '  or `X.displayName = …` writes: those keep the whole module alive in webpack and\n' +
  '  esbuild, and --fix cannot annotate them away (hds#365).';

function main() {
  const fix = process.argv.includes('--fix');
  const at = process.argv.indexOf('--root');
  if (at > -1 && !process.argv[at + 1]) {
    console.error('✗ check-pure-annotations — --root needs a path');
    process.exit(1);
  }
  const root = at > -1 ? path.resolve(process.argv[at + 1]) : ROOT;

  const files = scannedFiles(root);
  const findings = [];
  let fixedFiles = 0;
  let fixedCalls = 0;

  for (const file of files) {
    const full = path.join(root, file);
    const source = readFileSync(full, 'utf8');
    if (fix) {
      const result = annotateSource(source, file);
      if (result.count > 0) {
        writeFileSync(full, result.source);
        fixedFiles += 1;
        fixedCalls += result.count;
      }
      // What --fix cannot annotate away stays reported below.
      findings.push(...findBareCalls(result.source, file));
    } else {
      findings.push(...findBareCalls(source, file));
    }
  }

  const calls = findings.filter((f) => f.kind === 'call');
  const writes = findings.filter((f) => f.kind === 'write');

  if (fix) {
    console.log(
      `check-pure-annotations — annotated ${fixedCalls} call(s) in ${fixedFiles} file(s) under src/` +
        (fixedFiles ? '; run prettier on them (lint-staged does at commit)' : ''),
    );
    if (findings.length === 0) return;
    console.error(
      `\n✗ check-pure-annotations — ${writes.length} component property write(s) remain under src/` +
        ' that --fix cannot annotate away (a write is a side effect with no pure form):\n',
    );
    for (const f of findings) console.error(describe(f));
    console.error(FIX_HINT);
    process.exit(1);
  }

  if (findings.length === 0) {
    console.log(
      `check-pure-annotations — 0 bare top-level call(s), 0 component property write(s) in ` +
        `${files.length} scanned file(s) under src/`,
    );
    return;
  }

  console.error(
    `✗ check-pure-annotations — ${calls.length} bare top-level call(s) and ${writes.length} ` +
      'component property write(s) under src/. Every bundler keeps an un-annotated top-level' +
      ' call, and webpack and esbuild keep a top-level property write, so one in a module that' +
      ' reaches the chunk shared with Button re-breaks the Button-only budget (hds#363, hds#365):\n',
  );
  for (const f of findings) console.error(describe(f));
  console.error(FIX_HINT);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
