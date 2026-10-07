#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-public-api.mjs
 *
 * Lightweight public-API surface guard for @hirobius/design-system.
 *
 * Why this exists (12n-api-extractor-wired)
 * ──────────────────────────────────────────
 * The package ships React primitives, patterns, and templates plus subpath
 * modules (`tokens`, `cn`, `manifest`, `patterns`, `contexts`…). Before this
 * guard nothing caught a removed export or renamed symbol on the way to a
 * PR — and Concrete Creations (the first external consumer) was days away.
 *
 * The full @microsoft/api-extractor toolchain is ideal but assumes a
 * `dist/types/index.d.ts` rollup, which this project does not currently
 * produce (the package surfaces TypeScript source via `package.json#types`).
 * Adding a `.d.ts` emit step is a separate unit. In the meantime this
 * script gives CI exactly the breaking-change signal api-extractor would:
 *
 *   1. Walk every JavaScript entry in `package.json#exports` (hds#390; it
 *      used to be `src/index.ts` plus a hand-kept list of three subpaths,
 *      so `/patterns`, `/contexts` and five more entries were unguarded).
 *      For the root entry, each `export * from './foo'` re-export in
 *      `src/index.ts` is its own module and the named / default re-exports
 *      declared inline are `(barrel)`; every other entry is one
 *      `@subpath/<name>` module holding everything it exports.
 *   2. Use the TypeScript compiler API to extract the *named* top-level
 *      symbols from each source file (functions, classes, const/let/var
 *      identifiers, interfaces, types, enums, type aliases, default exports,
 *      and named re-exports), following `export * from './x'` into the
 *      re-exported module. The set is sorted and stable per-module.
 *   3. Emit a structured baseline at `docs/api/api-baseline.json`.
 *   4. Diff the live surface against the baseline:
 *        - **Removed symbol** → exit 1 (breaking change).
 *        - **Removed module** → exit 1 (breaking change).
 *        - **New symbol / new module** → printed as additions; exits 0
 *          *only* with `--allow-additions` (default) so trivial new exports
 *          do not block PRs. Use `--strict` to treat additions as failures.
 *      Run with `--update-baseline` to accept the current surface and
 *      rewrite the baseline.
 *
 * This file is NOT run directly by any package.json script or hook — it is
 * invoked as a subprocess of `scripts/audit-component-integrity.mjs --api`
 * (see that file's "Sub-check 4"), which re-uses this module's logic rather
 * than duplicating the TS-compiler-API walk. `pnpm api:check` and
 * `pnpm api:update` are `audit-component-integrity.mjs --api[--update-baseline]`,
 * and `pnpm check:full` runs `audit-component-integrity.mjs --api` directly —
 * both reach this script that way. The gate is registered in
 * `docs/guardrails/registry.json` under the merged `audit-component-integrity`
 * id ("(4) --api: public API surface guard … Merged from: … check-public-api"),
 * not under its own id — do not add a separate `check-public-api` registry
 * entry without also removing the merged description, or `validate-guardrail-
 * registry` will see the same gate declared twice.
 *
 * When `dist/types/` exists in the future this script can be retired in
 * favour of api-extractor without touching consumers.
 *
 * Wiring verdict (12g-5, corrected by hds#270): WIRE, but indirectly — see
 * above. Breaking-change guard for external consumer (Concrete Creations).
 * Not pre-commit (uses TS compiler API, adds ~2s). Since hds#390 it also runs
 * in `pretest` (`audit-component-integrity.mjs --api`), so CI fails a removed
 * export instead of only `check:full` and `check:release`.
 * Run `pnpm api:update` after any intentional API change, then commit the
 * updated docs/api/api-baseline.json. A removal needs its upgrade step and a
 * minor changeset first (`pnpm upgrade:note`, REMOVAL_HINT below, hds#448):
 * the baseline only says what the surface is, never how a consumer upgrades.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { formatGenerated } from './write-generated.mjs';
import { readJsExportEntries } from './package-entries.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..'); // scripts/lib → scripts → project root
const SRC_DIR = join(ROOT, 'src');
const ENTRY = join(SRC_DIR, 'index.ts');
const BASELINE_DIR = join(ROOT, 'docs', 'api');
const BASELINE_PATH = join(BASELINE_DIR, 'api-baseline.json');

/** The package version this API surface was taken from, or 'unknown'. */
function readPackageVersion(root = ROOT) {
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * What to do about a removal, in order (hds#448). `pnpm api:update` alone used
 * to clear a removed export with no migration step and under any bump; the
 * upgrade gate (scripts/check-upgrade-ledger.mjs) now wants the step and the
 * minor first, so the baseline is accepted last.
 */
export const REMOVAL_HINT = [
  'A removal breaks consumers that use it. If it is intended:',
  '  1. pnpm upgrade:note  writes its upgrade step to upgrade/pending/<changeset>.json; replace the TODO plain line',
  "  2. make that changeset '@hirobius/design-system': minor (major from 1.0)",
  '  3. pnpm api:update    accepts the new surface in docs/api/api-baseline.json',
];

const args = new Set(process.argv.slice(2));
const UPDATE_BASELINE = args.has('--update-baseline');
const STRICT = args.has('--strict');
const JSON_OUTPUT = args.has('--json');

// ── helpers ─────────────────────────────────────────────────────────────────

function readSource(absolutePath) {
  return readFileSync(absolutePath, 'utf8');
}

function parse(absolutePath) {
  const text = readSource(absolutePath);
  return ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    // A built `.d.ts` (scripts/upgrade/snapshot.mjs reads the published
    // dist/types) is plain TypeScript; source files may hold JSX.
    absolutePath.endsWith('.d.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX,
  );
}

function isExported(node) {
  const flags = ts.getCombinedModifierFlags(node);
  return Boolean(flags & ts.ModifierFlags.Export);
}

function isDefaultExported(node) {
  const flags = ts.getCombinedModifierFlags(node);
  return Boolean(flags & ts.ModifierFlags.Default);
}

function resolveRelativeImport(fromFile, specifier) {
  const fromDir = dirname(fromFile);
  // Direct path with extension already.
  const direct = resolve(fromDir, specifier);
  if (existsSync(direct) && /\.(tsx?|json)$/.test(specifier)) {
    return direct;
  }
  const candidates = [
    `${specifier}.tsx`,
    `${specifier}.ts`,
    `${specifier}.json`,
    join(specifier, 'index.tsx'),
    join(specifier, 'index.ts'),
    // Built declarations (hds#447: the release snapshot reads the published
    // dist/types): `./x.js` after add-dts-extensions.mjs, `./x` before it.
    `${specifier.replace(/\.js$/, '')}.d.ts`,
    join(specifier, 'index.d.ts'),
  ];
  for (const candidate of candidates) {
    const absolute = resolve(fromDir, candidate);
    if (existsSync(absolute)) return absolute;
  }
  return null;
}

// ── extractors ──────────────────────────────────────────────────────────────

/**
 * Collect the named, top-level export symbols of a single source file,
 * following `export * from './x'` into the modules it re-exports (hds#390:
 * the /contexts entry is nothing but `export *` lines, so it recorded no
 * symbols). Returns an alphabetically-sorted, deduped string list.
 *
 * With an `origins` map, each returned symbol is also mapped to the file that
 * declares it or re-exports it by name, following `export *` to that file. The
 * release snapshot (hds#447) uses it to tell a name that moved between entries
 * from an unrelated export of the same name.
 *
 * @param {string} absolutePath
 * @param {Set<string>} [seen]
 * @param {Map<string, string> | null} [origins]
 */
export function collectModuleSymbols(absolutePath, seen = new Set(), origins = null) {
  if (seen.has(absolutePath)) return [];
  seen.add(absolutePath);
  const sourceFile = parse(absolutePath);
  const declared = new Set();
  // A name declared (or re-exported by name) here: this file is its origin.
  const record = (name) => {
    declared.add(name);
    if (origins && !origins.has(name)) origins.set(name, absolutePath);
  };

  for (const statement of sourceFile.statements) {
    // export function foo() {}
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      if (isDefaultExported(statement)) {
        record('default');
      } else {
        record(statement.name.text);
      }
      continue;
    }

    // export class Foo {}
    if (ts.isClassDeclaration(statement) && statement.name && isExported(statement)) {
      if (isDefaultExported(statement)) {
        record('default');
      } else {
        record(statement.name.text);
      }
      continue;
    }

    // export const foo = …; export let foo = …; export var foo = …;
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          record(declaration.name.text);
        }
      }
      continue;
    }

    // export interface Foo {}
    if (ts.isInterfaceDeclaration(statement) && isExported(statement)) {
      record(statement.name.text);
      continue;
    }

    // export type Foo = …;
    if (ts.isTypeAliasDeclaration(statement) && isExported(statement)) {
      record(statement.name.text);
      continue;
    }

    // export enum Foo {}
    if (ts.isEnumDeclaration(statement) && isExported(statement)) {
      record(statement.name.text);
      continue;
    }

    // export default <expression>; (e.g. `export default ApiReference;`)
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      record('default');
      continue;
    }

    // export { Foo, Bar as Baz };
    // export { Foo } from './x';   (re-export)
    // export * as ns from './x';
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          record(element.name.text);
        }
      } else if (ts.isNamespaceExport(statement.exportClause)) {
        record(statement.exportClause.name.text);
      }
      continue;
    }

    // export * from './x';  (followed)   export * from 'pkg';  (recorded as such)
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      const specifier = statement.moduleSpecifier.text;
      if (!specifier.startsWith('.')) {
        record(`* from ${specifier}`);
        continue;
      }
      const target = resolveRelativeImport(absolutePath, specifier);
      if (!target) {
        throw new Error(
          `[check-public-api] Could not resolve "export * from '${specifier}'" in ${relative(ROOT, absolutePath)}`,
        );
      }
      // `export *` re-exports every name except `default` (ECMAScript), so a
      // re-exported module's default is not part of this module's surface.
      const reached = origins ? new Map() : null;
      for (const symbol of collectModuleSymbols(target, seen, reached)) {
        if (symbol === 'default') continue;
        declared.add(symbol);
        if (origins && !origins.has(symbol)) origins.set(symbol, reached.get(symbol));
      }
    }
  }

  return Array.from(declared).sort();
}

/**
 * Walk `src/index.ts` and resolve every `export * from './x'` to its source
 * module. Returns an ordered list of `{ specifier, modulePath }` pairs plus
 * any symbols re-exported inline by the barrel itself.
 */
function collectBarrelMap(entry = ENTRY) {
  const sourceFile = parse(entry);
  const reexports = [];
  const inlineBarrelSymbols = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue;

    const moduleSpecifier = statement.moduleSpecifier;
    const isWildcard = !statement.exportClause;

    if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
      const specifier = moduleSpecifier.text;
      if (!specifier.startsWith('.')) continue; // skip package re-exports
      const modulePath = resolveRelativeImport(entry, specifier);
      if (!modulePath) {
        throw new Error(
          `[check-public-api] Could not resolve barrel re-export "${specifier}" from ${relative(ROOT, entry)}`,
        );
      }

      if (isWildcard) {
        reexports.push({ specifier, modulePath, kind: 'wildcard' });
      } else if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        // export { default as hds } from './x'  → record the renamed symbol
        // attached to the barrel itself, not the underlying module.
        for (const element of statement.exportClause.elements) {
          inlineBarrelSymbols.add(element.name.text);
        }
      }
    }
  }

  // Catch barrel-internal `export { cn } from './lib/utils';` style which uses
  // a moduleSpecifier — already handled above. Also catch barrel-side re-exports
  // declared as `export { default as hds } from './x';` (covered above).
  // Finally, surface any *barrel-local* declarations (rare but possible):
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          inlineBarrelSymbols.add(declaration.name.text);
        }
      }
    }
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      inlineBarrelSymbols.add(statement.name.text);
    }
  }

  return {
    reexports,
    inlineBarrelSymbols: Array.from(inlineBarrelSymbols).sort(),
  };
}

/**
 * Build the live API surface for every JS entry in package.json#exports.
 *
 * The root entry (".") keeps its per-module shape: `(barrel)` holds what
 * src/index.ts declares or re-exports by name, and each `export * from './x'`
 * target is its own module key, so a removed root re-export reads as a
 * removed module. Every other entry is one `@subpath/<name>` key listing all
 * the symbols it exports, `export *` followed (hds#390: `/patterns` and
 * `/contexts` were not in the baseline, and six `/patterns` modules are not
 * root re-exports, so nothing guarded them). A symbol that leaves a subpath is
 * a breaking change even when the root still exports it.
 *
 * @param {string} [root] package root (tests pass a fixture)
 */
export function collectPublicApi(root = ROOT) {
  // `generatedAt` was the literal string 'baseline'. It is not part of the
  // diff, so it cost nothing to be wrong — and it was: the committed baseline
  // described the pre-0.13.0 surface, 81 commits and two and a half months
  // behind main, with nothing in the file to say so. Recording the version the
  // surface was taken from answers the question a baseline is actually asked:
  // which release is this the API of?
  const entries = readJsExportEntries(root);
  const surface = {
    entry: 'src/index.ts',
    entries: Object.fromEntries(
      entries.map(({ key, file }) => [key, relative(root, file).replace(/\\/g, '/')]),
    ),
    version: readPackageVersion(root),
    generatedAt: new Date().toISOString().slice(0, 10),
    modules: {},
  };

  for (const { key, file } of entries) {
    if (key !== '.') continue;
    const { reexports, inlineBarrelSymbols } = collectBarrelMap(file);
    if (inlineBarrelSymbols.length > 0) {
      surface.modules['(barrel)'] = inlineBarrelSymbols;
    }
    for (const { specifier, modulePath } of reexports) {
      surface.modules[specifier] = collectModuleSymbols(modulePath);
    }
  }

  // Subpath entries, after the root modules so the root keys keep their
  // place in the baseline file.
  for (const { key, file } of entries) {
    if (key === '.') continue;
    surface.modules[`@subpath/${key.replace(/^\.\//, '')}`] = collectModuleSymbols(file);
  }

  return surface;
}

// ── diff ────────────────────────────────────────────────────────────────────

export function diffSurfaces(baseline, current) {
  const breakingChanges = [];
  const additions = [];

  const baselineModules = new Set(Object.keys(baseline.modules ?? {}));
  const currentModules = new Set(Object.keys(current.modules ?? {}));

  for (const moduleKey of baselineModules) {
    if (!currentModules.has(moduleKey)) {
      breakingChanges.push({
        kind: 'module-removed',
        module: moduleKey,
        symbol: null,
      });
      continue;
    }
    const baselineSymbols = new Set(baseline.modules[moduleKey] ?? []);
    const currentSymbols = new Set(current.modules[moduleKey] ?? []);
    for (const symbol of baselineSymbols) {
      if (!currentSymbols.has(symbol)) {
        breakingChanges.push({
          kind: 'symbol-removed',
          module: moduleKey,
          symbol,
        });
      }
    }
    for (const symbol of currentSymbols) {
      if (!baselineSymbols.has(symbol)) {
        additions.push({
          kind: 'symbol-added',
          module: moduleKey,
          symbol,
        });
      }
    }
  }

  for (const moduleKey of currentModules) {
    if (!baselineModules.has(moduleKey)) {
      additions.push({
        kind: 'module-added',
        module: moduleKey,
        symbol: null,
      });
    }
  }

  return { breakingChanges, additions };
}

// ── main ────────────────────────────────────────────────────────────────────

function ensureBaselineDir() {
  if (!existsSync(BASELINE_DIR)) {
    mkdirSync(BASELINE_DIR, { recursive: true });
  }
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

async function writeBaseline(surface) {
  ensureBaselineDir();
  // Format through Prettier before writing (matches scripts/lib/write-generated.mjs):
  // otherwise `--update-baseline` produces bytes lint-staged's Prettier pass
  // immediately rewrites, so the file always shows a second diff on commit.
  const formatted = await formatGenerated(BASELINE_PATH, `${JSON.stringify(surface, null, 2)}\n`);
  writeFileSync(BASELINE_PATH, formatted, 'utf8');
}

function totalSymbolCount(surface) {
  let total = 0;
  for (const symbols of Object.values(surface.modules ?? {})) {
    total += symbols.length;
  }
  return total;
}

async function main() {
  const current = collectPublicApi();

  if (UPDATE_BASELINE) {
    await writeBaseline(current);
    if (JSON_OUTPUT) {
      console.log(
        JSON.stringify({ updated: true, baseline: BASELINE_PATH, surface: current }, null, 2),
      );
    } else {
      const moduleCount = Object.keys(current.modules).length;
      const symbolCount = totalSymbolCount(current);
      console.log(`[check-public-api] baseline updated → ${relative(ROOT, BASELINE_PATH)}`);
      console.log(`[check-public-api] ${moduleCount} modules, ${symbolCount} exported symbols`);
    }
    process.exit(0);
  }

  const baseline = readBaseline();
  if (!baseline) {
    console.error(
      `[check-public-api] No baseline at ${relative(ROOT, BASELINE_PATH)}.\n` +
        `[check-public-api] Run \`pnpm api:update\` once to accept the current surface, ` +
        `then commit ${relative(ROOT, BASELINE_PATH)}.`,
    );
    process.exit(1);
  }

  const { breakingChanges, additions } = diffSurfaces(baseline, current);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ breakingChanges, additions }, null, 2));
  } else {
    if (breakingChanges.length > 0) {
      console.error(
        `[check-public-api] ❌ ${breakingChanges.length} breaking change${breakingChanges.length === 1 ? '' : 's'} detected:`,
      );
      for (const change of breakingChanges) {
        if (change.kind === 'module-removed') {
          console.error(`  - module removed: ${change.module}`);
        } else {
          console.error(`  - symbol removed: ${change.symbol} (from ${change.module})`);
        }
      }
    }
    if (additions.length > 0) {
      const label = breakingChanges.length > 0 ? 'Additions (also present)' : 'Additions detected';
      console.log(`[check-public-api] ${label}: ${additions.length}`);
      for (const change of additions) {
        if (change.kind === 'module-added') {
          console.log(`  + module added: ${change.module}`);
        } else {
          console.log(`  + symbol added: ${change.symbol} (in ${change.module})`);
        }
      }
    }
    if (breakingChanges.length === 0 && additions.length === 0) {
      console.log(
        `[check-public-api] ✅ public API surface matches baseline (${totalSymbolCount(current)} symbols across ${Object.keys(current.modules).length} modules).`,
      );
    }
  }

  if (breakingChanges.length > 0) {
    for (const line of REMOVAL_HINT) console.error(`[check-public-api] ${line}`);
    process.exit(1);
  }

  if (STRICT && additions.length > 0) {
    console.error(
      `[check-public-api] --strict: additions are not allowed without --update-baseline.`,
    );
    process.exit(1);
  }

  process.exit(0);
}

// Guard direct-run vs. import (the diffSurfaces canary test imports this
// module for its pure diff logic and must not trigger a real TS-compiler
// walk + baseline write/exit as a side effect of `import`).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('[check-public-api] fatal:', error?.stack || error?.message || error);
    process.exit(2);
  });
}
