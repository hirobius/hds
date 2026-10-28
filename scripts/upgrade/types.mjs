#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * types.mjs — the types baseline (hds#467): what each export of each
 * package.json#exports entry is, read with the TypeScript checker, the input
 * the upgrade gate draws type facts from.
 *
 * Why: the release snapshot and `pnpm api:check` record export names only (an
 * AST walk, scripts/lib/check-public-api.mjs), so removing a compound part
 * (Menu.Item), turning a value into a type-only export, changing a hook's
 * parameters or removing a key of the /tokens `hds` object (ops reads `hds.*`
 * about 370 times) all passed with 0 findings.
 *
 * For each JS entry (scripts/lib/package-entries.mjs, the entries api:check
 * reads; the hand-typed tooling entries are not built from src/), the checker's
 * `getExportsOfModule` gives every export, `export *` from a package included.
 * Each is recorded as:
 *
 *   { kind: 'value' | 'type', signatures?, members?, keys? }
 *
 *   - kind: 'type' for an interface or type alias, or a value exported with
 *     `export type`; 'value' for anything a consumer can use at runtime;
 *   - signatures: a callable value's call and construct signatures, printed
 *     by the checker (a component's is its props, which props.mjs details);
 *   - members: a callable value's static members, such as Menu's Item;
 *   - keys: a plain object value's key paths, KEY_DEPTH deep (`color`,
 *     `color.content`, `color.content.primary`). An `export * as` namespace
 *     is one, keyed by its exports.
 *
 * The baseline is committed at docs/api/types-baseline.json and ships in the
 * package, like the props baseline, so `snapshot.mjs --from-npm` reads the
 * very bytes; the snapshot's `types` section is this. scripts/check-upgrade-
 * ledger.mjs fails when the committed file is not the one the tree gives.
 * Reading the tree takes one TypeScript program (about 2s), so the snapshot
 * reads the committed file and only the gate builds the program.
 *
 *   node scripts/upgrade/types.mjs            # write docs/api/types-baseline.json
 *   node scripts/upgrade/types.mjs --check    # exit 1 if it is stale
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readJsExportEntries } from '../lib/package-entries.mjs';
import { formatJson, sortedObject } from './format.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const TYPES_BASELINE = 'docs/api/types-baseline.json';

/** How many levels of an exported object's keys are recorded: `hds.color.content.primary` is 3. */
export const KEY_DEPTH = 4;

const PRINT = ts.TypeFormatFlags.NoTruncation;

/** The tree's tsconfig.json options (paths, jsx, lib), or a minimal set for a tree with none. */
function compilerOptions(root) {
  const file = join(root, 'tsconfig.json');
  const base = { noEmit: true, skipLibCheck: true };
  if (!existsSync(file)) {
    return {
      ...base,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      lib: ['lib.es2022.d.ts'],
    };
  }
  const { config } = ts.readConfigFile(file, ts.sys.readFile);
  return { ...ts.parseJsonConfigFileContent(config, ts.sys, root).options, ...base };
}

/** True for a symbol with a declaration outside any .d.ts (a lib or a package). */
const declaredInTree = (symbol) =>
  (symbol.declarations ?? []).some((declaration) => !declaration.getSourceFile().isDeclarationFile);

/** True for an object type worth reading keys from: not callable, not an array, declared in the tree. */
function isPlainObject(checker, type) {
  if (!(type.flags & ts.TypeFlags.Object)) return false;
  if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) return false;
  if (checker.isArrayType(type) || checker.isTupleType(type)) return false;
  // A lib or package type (CSSProperties, Map) is theirs to change, not ours.
  const declaration = type.symbol?.declarations?.[0];
  return !declaration || !declaration.getSourceFile().isDeclarationFile;
}

function keyPaths(checker, type, prefix = '', depth = 1, out = []) {
  for (const property of checker.getPropertiesOfType(type)) {
    const path = `${prefix}${property.name}`;
    out.push(path);
    if (depth >= KEY_DEPTH) continue;
    const inner = checker.getTypeOfSymbol(property);
    if (isPlainObject(checker, inner)) keyPaths(checker, inner, `${path}.`, depth + 1, out);
  }
  return out;
}

/** One export as the baseline records it. */
function describeExport(checker, symbol) {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const typeOnly = Boolean(checker.getTypeOnlyAliasDeclaration(symbol));
  if (typeOnly || !(target.flags & ts.SymbolFlags.Value)) return { kind: 'type' };
  const type = checker.getTypeOfSymbol(target);
  const signatures = [...type.getCallSignatures(), ...type.getConstructSignatures()].map((sig) =>
    checker.signatureToString(sig, undefined, PRINT),
  );
  const entry = { kind: 'value' };
  if (signatures.length > 0) {
    entry.signatures = signatures;
    // Only members the tree declares: React's displayName and propTypes are React's.
    const members = checker
      .getPropertiesOfType(type)
      .filter((property) => property.name !== 'prototype' && declaredInTree(property))
      .map((property) => property.name)
      .sort();
    if (members.length > 0) entry.members = members;
  } else if (isPlainObject(checker, type) || target.flags & ts.SymbolFlags.Module) {
    const keys = keyPaths(checker, type).sort();
    if (keys.length > 0) entry.keys = keys;
  }
  return entry;
}

/**
 * The types baseline of the tree at `root`: entry -> export name -> record.
 * @param {string} root
 */
export function buildTypes(root) {
  const entries = readJsExportEntries(root);
  const program = ts.createProgram({
    rootNames: entries.map(({ file }) => file),
    options: compilerOptions(root),
  });
  const checker = program.getTypeChecker();
  const out = {};
  for (const { key, file } of entries) {
    const module = checker.getSymbolAtLocation(program.getSourceFile(file));
    const exports = module ? checker.getExportsOfModule(module) : [];
    out[key] = sortedObject(
      Object.fromEntries(exports.map((symbol) => [symbol.name, describeExport(checker, symbol)])),
    );
  }
  return sortedObject(out);
}

/** The committed docs/api/types-baseline.json under `root`, or null. */
export function readTypesBaseline(root) {
  const file = join(root, TYPES_BASELINE);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** Writes docs/api/types-baseline.json from the tree. */
export function writeTypesBaseline(root = REPO) {
  const types = buildTypes(root);
  mkdirSync(join(root, dirname(TYPES_BASELINE)), { recursive: true });
  writeFileSync(join(root, TYPES_BASELINE), formatJson(types));
  return types;
}

/**
 * True when the committed baseline is the one the tree gives. A tree with no
 * baseline (a test's copy of the layout) has nothing to check.
 */
export function typesBaselineFresh(root) {
  const file = join(root, TYPES_BASELINE);
  if (!existsSync(file)) return true;
  return readFileSync(file, 'utf8') === formatJson(buildTypes(root));
}

function main(argv) {
  if (argv.includes('--check')) {
    if (typesBaselineFresh(REPO) && existsSync(join(REPO, TYPES_BASELINE))) {
      console.log(`✓ ${TYPES_BASELINE} matches the source`);
      return 0;
    }
    console.error(`✗ ${TYPES_BASELINE} is stale: run node scripts/upgrade/types.mjs`);
    return 1;
  }
  writeTypesBaseline(REPO);
  console.log(`✓ ${TYPES_BASELINE}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
