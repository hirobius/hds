/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * add-dts-extensions — give emitted .d.ts specifiers the extensions ESM needs.
 *
 * `tsconfig.dts.json` compiles with `moduleResolution: "Node"`, so tsc emits
 * relative specifiers the way Node's old CommonJS algorithm accepted them:
 * `from './app/components/button'`, no extension. This package is
 * `"type": "module"`, and ESM has no extension guessing — so under
 * `moduleResolution: node16`/`nodenext` every one of those fails to resolve.
 * attw reports it as InternalResolutionError against 7 of our entry points,
 * which in practice means a Next.js or any `"type": "module"` consumer gets
 * broken types for the whole package while `tsc` here stays green.
 *
 * `strip-dts-side-effects.mjs` already fixed one instance of this class (CSS
 * side-effect imports). This fixes the rest: rewrite each extensionless
 * relative specifier to the file it actually resolves to.
 *
 *   './app/components/button'  ->  './app/components/button.js'
 *   './app/context'            ->  './app/context/index.js'
 *
 * `.js` is correct in a `.d.ts` even though the neighbour on disk is `.d.ts`:
 * TypeScript resolves a `.js` specifier to its declaration file, and the
 * runtime specifier is what must be written.
 *
 * Fails loud. A specifier that matches neither a sibling `.d.ts` nor a
 * directory `index.d.ts` exits 1 rather than being left to fail silently in a
 * consumer's install — the failure mode this whole script exists to end.
 *
 * Part of `pnpm build:types`, after strip-dts-side-effects. Idempotent:
 * anything already carrying an extension is left alone.
 *
 * Usage: node scripts/add-dts-extensions.mjs
 * Exit codes: 0 = all specifiers resolved, 1 = at least one did not.
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A relative specifier in an import/export/dynamic-import position.
 *
 * Covers `from './x'`, `export * from './x'`, side-effect `import './x'`, and
 * `import('./x')` in a type position. The leading group is preserved verbatim
 * so quoting and spacing survive the rewrite.
 */
const RELATIVE_SPECIFIER = /(\bfrom\s+|\bimport\s+|\bimport\(\s*)(['"])(\.[^'"]*)\2/g;

/** Extensions that already say what they mean; never rewritten. */
const HAS_EXTENSION = /\.(js|mjs|cjs|json|css|d\.ts)$/;

/**
 * Rewrite every extensionless relative specifier in `source`.
 *
 * `resolveSpec` maps a specifier to its replacement, or returns null when it
 * resolves to nothing — kept injectable so the rewrite is testable without a
 * filesystem.
 *
 * @returns {{ text: string, rewritten: number, unresolved: string[] }}
 */
export function rewriteSource(source, resolveSpec) {
  const unresolved = [];
  let rewritten = 0;

  const text = source.replace(RELATIVE_SPECIFIER, (match, prefix, quote, spec) => {
    if (HAS_EXTENSION.test(spec)) return match;
    const resolved = resolveSpec(spec);
    if (resolved === null || resolved === undefined) {
      unresolved.push(spec);
      return match;
    }
    rewritten += 1;
    return `${prefix}${quote}${resolved}${quote}`;
  });

  return { text, rewritten, unresolved };
}

/**
 * The on-disk resolver for a .d.ts living in `dir`.
 *
 * Sibling file wins over directory index, matching Node's own precedence.
 */
export function resolverFor(dir) {
  return (spec) => {
    if (existsSync(path.join(dir, `${spec}.d.ts`))) return `${spec}.js`;
    if (existsSync(path.join(dir, spec, 'index.d.ts'))) return `${spec}/index.js`;
    return null;
  };
}

/** Every .d.ts under `dir`, recursively. */
export function dtsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...dtsFiles(full));
    else if (entry.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

function main() {
  const DTS_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'dist',
    'types',
  );

  if (!existsSync(DTS_ROOT)) {
    console.error(
      `add-dts-extensions: ${path.relative(process.cwd(), DTS_ROOT)} does not exist — run \`pnpm build:types\` first.`,
    );
    process.exit(1);
  }

  const files = dtsFiles(DTS_ROOT);
  if (files.length === 0) {
    console.error(`add-dts-extensions: no .d.ts files under ${DTS_ROOT} — nothing was emitted.`);
    process.exit(1);
  }

  let totalRewritten = 0;
  let touched = 0;
  const failures = [];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const { text, rewritten, unresolved } = rewriteSource(source, resolverFor(path.dirname(file)));
    for (const spec of unresolved) {
      failures.push(`${path.relative(DTS_ROOT, file)}: '${spec}'`);
    }
    if (rewritten > 0) {
      writeFileSync(file, text);
      totalRewritten += rewritten;
      touched += 1;
    }
  }

  if (failures.length > 0) {
    console.error(
      `add-dts-extensions — ${failures.length} specifier(s) resolved to nothing. A consumer would\n` +
        `see these as broken types. Fix the emit or the source import:\n` +
        failures.map((f) => `  ${f}`).join('\n'),
    );
    process.exit(1);
  }

  console.log(
    `add-dts-extensions — rewrote ${totalRewritten} specifier(s) across ${touched} of ${files.length} .d.ts file(s)`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
