/**
 * docs-tooling boundary (hds#133, option A).
 *
 * Docs-site tooling (token-lab views, doc-page chrome, sketch controls) is not
 * a consumer component. hds#133 moved it out of `src/app/components/` (which
 * component discovery scans into the published manifest) into
 * `src/docs-tooling/`; hds#391 then deleted that directory outright, because
 * nothing imported it. These two tests stop docs tooling from coming back
 * through the published component tree or the public barrels.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const COMPONENTS = path.join(ROOT, 'src/app/components');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('docs-tooling boundary', () => {
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
