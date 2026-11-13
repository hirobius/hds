// @vitest-environment node
/**
 * No module in src/ imports the full `motion` component (hds#1386).
 *
 * `motion.*` ships every Motion feature (layout, drag, pan, ...) and an
 * app-level LazyMotion cannot remove a static import of it, so it stayed in
 * every consumer bundle: about 42 kB gzip for Toast + Alert + Disclosure on
 * HDS 0.37. Components render `m.*` inside <LazyMotion features={domAnimation}>
 * instead, as Button did first (hds#751). The ESLint rule
 * `no-restricted-imports` catches the import in the editor; this test keeps
 * the guard in `pnpm test` and also checks that every file that renders `m.*`
 * provides the features itself, so an `m` element never renders without them.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.(test|stories)\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

const IMPORT = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'(motion\/react|framer-motion)'/g;

function motionImports(source: string): string[] {
  return [...source.matchAll(IMPORT)].flatMap((match) =>
    match[1]
      .split(',')
      .map((n) => n.trim().replace(/^type\s+/, ''))
      .filter(Boolean),
  );
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(ROOT, path),
  source: readFileSync(path, 'utf8'),
}));

describe('motion imports (hds#1386)', () => {
  it('no module imports the full motion component', () => {
    const offenders = files
      .filter(({ source }) => motionImports(source).includes('motion'))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('no module imports framer-motion or motion/react through a namespace or default import', () => {
    const offenders = files
      .filter(({ source }) =>
        /import\s+(?:\*\s+as\s+\w+|\w+)\s+from\s*'(motion\/react|framer-motion)'/.test(source),
      )
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('every module that renders m.* wraps it in LazyMotion with domAnimation', () => {
    const users = files.filter(({ source }) => /<m\.[a-z]+/.test(source));
    // Ratchet against accidental loss of a wrapped m.* module. Lowered 15 -> 14
    // when Disclosure moved to a CSS grid-rows collapse and stopped rendering m.* (hds#1508).
    expect(users.length).toBeGreaterThanOrEqual(14);
    const offenders = users
      .filter(({ source }) => {
        const names = motionImports(source);
        return (
          !names.includes('LazyMotion') ||
          !names.includes('domAnimation') ||
          !source.includes('<LazyMotion features={domAnimation}>')
        );
      })
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });
});
