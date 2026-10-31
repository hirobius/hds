#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-deprecations.mjs — write the shipped `deprecations.json` (hds#469).
 *
 * Consumers only saw a deprecation as editor strikethrough. This record is
 * the machine-readable list, generated from the sources that already carry
 * the truth (lib/deprecations.mjs): the public surface's `@deprecated`
 * JSDoc (exports, props, prop values), the `$deprecated` tokens, and the
 * shipped upgrade ledgers (what each release removed). The eslint rules
 * `hds/no-deprecated-import` and `hds/no-removed-import` read the installed
 * package's copy of this file.
 *
 * Usage:
 *   node scripts/build-deprecations.mjs           rewrite deprecations.json
 *   node scripts/build-deprecations.mjs --check   fail when it is stale (pretest)
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { deprecationScope } from './check-deprecations.mjs';
import { buildDeprecations, deprecationsInFile, removedFromLedgers } from './lib/deprecations.mjs';
import { readJsExportEntries } from './lib/package-entries.mjs';
import { collectDeprecations } from './lib/token-deprecations.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'deprecations.json');

const isSource = (file) => /\.tsx?$/.test(file) && existsSync(file) && statSync(file).isFile();

/** The module a relative specifier names, or null for a non-TS target. */
function resolveModule(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  return (
    [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(
      isSource,
    ) ?? null
  );
}

const REEXPORT_RE =
  /^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"](\.{1,2}\/[^'"]+)['"]/gm;

/** The names one source file exports: its own exported declarations and its export lists. */
function exportedNames(file) {
  const text = readFileSync(file, 'utf-8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const names = new Set();
  for (const stmt of source.statements) {
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) names.add(el.name.text);
      } else if (stmt.exportClause && ts.isNamespaceExport(stmt.exportClause)) {
        names.add(stmt.exportClause.name.text);
      }
      continue;
    }
    const exported = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
      }
    } else if (stmt.name) names.add(stmt.name.text);
  }
  return names;
}

/**
 * `${specifier} ${name}` for every name each package entry exports today,
 * following relative re-exports — the live surface the removed list is
 * checked against, so a name an entry exports again is not listed as removed.
 */
function liveExports(root, pkg) {
  const live = new Set();
  for (const { key, file } of readJsExportEntries(root)) {
    const specifier = key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`;
    const seen = new Set();
    const queue = [file];
    while (queue.length) {
      const current = queue.pop();
      if (seen.has(current)) continue;
      seen.add(current);
      for (const name of exportedNames(current)) live.add(`${specifier} ${name}`);
      for (const m of readFileSync(current, 'utf-8').matchAll(REEXPORT_RE)) {
        const target = resolveModule(current, m[1]);
        if (target) queue.push(target);
      }
    }
  }
  return live;
}

/** The full record for the tree at `root`, as it should be committed. */
export function renderDeprecations(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const api = deprecationScope(root).flatMap((file) =>
    deprecationsInFile(relative(root, file).replace(/\\/g, '/'), readFileSync(file, 'utf-8')),
  );
  const tokensTree = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf-8'));
  const releasesDir = join(root, 'upgrade', 'releases');
  const ledgers = readdirSync(releasesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(releasesDir, f), 'utf-8')));
  const record = buildDeprecations({
    version: pkg.version,
    api,
    tokens: collectDeprecations(tokensTree),
    removed: removedFromLedgers(ledgers),
    liveExports: liveExports(root, pkg),
  });
  return `${JSON.stringify(record, null, 2)}\n`;
}

function main() {
  const next = renderDeprecations(ROOT);
  if (process.argv.includes('--check')) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf-8') : '';
    if (current !== next) {
      console.error(
        '✗ deprecations.json is stale — run `node scripts/build-deprecations.mjs` and commit the result.',
      );
      process.exit(1);
    }
    console.log('✓ deprecations.json is fresh.');
    return;
  }
  writeFileSync(OUT, next);
  console.log('✓ deprecations.json written.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
