// @vitest-environment node
/**
 * check-published-types excludes the subpaths attw cannot type: stylesheets and
 * the CJS `./tailwind-preset` (#449). A new untyped export left off the list
 * turns `smoke:consumer` red at push time; this catches it in `pnpm test`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { UNTYPED_ENTRYPOINTS } from '../check-published-types.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { exports } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

describe('check-published-types UNTYPED_ENTRYPOINTS', () => {
  it('lists every stylesheet and CJS export, which carry no types', () => {
    const untyped = Object.entries(exports)
      .filter(([, target]) => typeof target === 'string' && /\.(css|cjs)$/.test(target))
      .map(([subpath]) => subpath.replace(/^\.\//, ''));
    expect(untyped).toContain('tailwind-preset');
    expect([...UNTYPED_ENTRYPOINTS].sort()).toEqual(untyped.sort());
  });
});
