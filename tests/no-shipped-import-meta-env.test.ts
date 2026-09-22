// @vitest-environment node
/**
 * Shipped library code must never read `import.meta.env`.
 *
 * Vite's library build evaluates `import.meta.env` at HDS's build time, not the
 * consumer's. So `import.meta.env.DEV` bakes to `false` and `.PROD` to `true`
 * inside `dist/`, and every guard written against them becomes a constant for
 * everyone who installs the package. Three shipped guards were dead this way:
 *
 *   icon.tsx          `import.meta.env.DEV`   -> false, missing-icon warning never fired
 *   deprecation.ts    `import.meta.env?.PROD` -> true,  deprecation warnings never fired
 *   TenantContext.tsx `import.meta.env[...]`  -> {},    TenantProvider was inert
 *
 * None of them threw, none failed a test, and `smoke:consumer` could not see
 * them because a silent no-op still renders. Only reading `dist/` revealed it.
 * This test is the cheap standing guard so the class cannot come back.
 *
 * Stories, tests and Storybook config are exempt: they are built by Vite as an
 * APP, where `import.meta.env` is correct and means what it says.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/**
 * Comments are stripped before scanning, so prose may still name the rule it
 * documents — including the docblocks that explain this very ban. Without this
 * the guard would forbid anyone from ever writing down WHY it exists, which is
 * how a rule survives as a string and dies as an understanding.
 *
 * Deliberately regex, not a parser: a string literal containing `//` could
 * over-strip, but that can only ever hide a match inside a string, which is not
 * executable code. The failure mode is a false negative in an unreachable spot,
 * never a false positive that blocks a legitimate change.
 */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Files Vite builds as an app, not as the published library. */
const isExempt = (path: string) =>
  /\.(test|spec|stories)\.[jt]sx?$/.test(path) ||
  path.includes(`${'src'}/stories/`) ||
  path.endsWith('vite-env.d.ts');

function shippedSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      shippedSourceFiles(full, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    const rel = relative(ROOT, full).replaceAll('\\', '/');
    if (!isExempt(rel)) acc.push(rel);
  }
  return acc;
}

/**
 * Every occurrence of `import.meta`, wherever it appears.
 *
 * Matching `import.meta.env` directly was the obvious rule and the wrong one:
 * `import.meta['env']`, `const meta = import.meta`, and destructuring all reach
 * the same baked object without ever writing the characters `.env`. So the scan
 * is inverted — find every `import.meta` and allow only the members that are
 * safe in shipped code.
 */
const IMPORT_META = /import\s*\.\s*meta/g;

/**
 * Members that mean the same thing in the library build and in the consumer's.
 *
 * `glob` and `url` are resolved by Vite at build time into real values, which is
 * correct: the files being globbed and the module's own URL are HDS's, not the
 * consumer's. `env` is the opposite — its value belongs to whoever is building
 * the app — which is exactly why it is absent from this list.
 */
const SAFE_MEMBER = /^\s*\.\s*(?:url|glob|globEager|hot|resolve|dirname|filename)\b/;

/** `import.meta` occurrences in `code` that are not one of the safe members. */
function unsafeMetaLines(code: string): number[] {
  const lines: number[] = [];
  for (const match of code.matchAll(IMPORT_META)) {
    const after = code.slice(match.index + match[0].length);
    if (SAFE_MEMBER.test(after)) continue;
    lines.push(code.slice(0, match.index).split('\n').length);
  }
  return lines;
}

describe('shipped library source', () => {
  it('never reaches import.meta.env, which the library build would bake to a constant', () => {
    const offenders = shippedSourceFiles(SRC)
      .map((rel) => ({ rel, code: stripComments(readFileSync(join(ROOT, rel), 'utf8')) }))
      .flatMap(({ rel, code }) => unsafeMetaLines(code).map((line) => `${rel}:${line}`));

    expect(offenders).toEqual([]);
  });

  it('catches every way of reaching it, not just the dotted one', () => {
    // The original guard only matched `import.meta.env`. Each of these reaches
    // the same object and would have shipped past it unnoticed.
    const dodges = [
      `const dev = import.meta.env.DEV;`,
      `const dev = import.meta['env'].DEV;`,
      `const dev = import.meta["env"].DEV;`,
      `const { env } = import.meta;`,
      `const meta = import.meta;`,
      `const dev = import\n  .meta\n  .env.DEV;`,
    ];
    for (const dodge of dodges) {
      expect(unsafeMetaLines(dodge), dodge).not.toEqual([]);
    }
  });

  it('leaves the build-time members alone, which are correct in shipped code', () => {
    const allowed = [
      `const mods = import.meta.glob('./*.tsx');`,
      `const here = import.meta.url;`,
      `const dir = import.meta.dirname;`,
    ];
    for (const line of allowed) {
      expect(unsafeMetaLines(line), line).toEqual([]);
    }
  });

  it('scans a meaningful number of files, so a broken walker cannot pass vacuously', () => {
    expect(shippedSourceFiles(SRC).length).toBeGreaterThan(100);
  });
});
