/**
 * docs-tooling boundary (hds#133, option A).
 *
 * The token-lab views (token lists, legacy token governance panel) are docs-site
 * tooling, not consumer components. They live under `src/docs-tooling/lab/`,
 * outside `src/app/components/` (which component discovery scans into the
 * published manifest), and nothing in the published component tree may import
 * docs tooling back.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const COMPONENTS = path.join(ROOT, 'src/app/components');
const LAB_MODULES = [
  'legacy-token-detail.tsx',
  'legacy-token-list.tsx',
  'token-collection-list.tsx',
  'token-list.tsx',
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('docs-tooling boundary', () => {
  it('keeps the token-lab modules out of src/app/components', () => {
    for (const mod of LAB_MODULES) {
      expect(existsSync(path.join(COMPONENTS, 'lab', mod)), mod).toBe(false);
      expect(existsSync(path.join(ROOT, 'src/docs-tooling/lab', mod)), mod).toBe(true);
    }
  });

  it('no published component imports docs tooling', () => {
    const offenders = walk(COMPONENTS)
      .filter((f) => /\.(tsx?|mjs)$/.test(f))
      .filter((f) => /from\s+['"][^'"]*docs-tooling/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('the public barrels never reach lab/ or docs-tooling', () => {
    for (const barrel of ['src/index.ts', 'src/patterns.ts']) {
      const src = readFileSync(path.join(ROOT, barrel), 'utf8');
      expect(src).not.toMatch(/from\s+['"][^'"]*(\/lab\/|docs-tooling)/);
    }
  });
});
