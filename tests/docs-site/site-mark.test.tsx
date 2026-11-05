/**
 * Seam under test: the sidebar header shows the short mark plus the released
 * package version, read from the root package.json at build time. No hand-typed
 * version can drift from what ships.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadPackageVersion } from '../../docs-site/lib/site-data';
import { SiteMark } from '../../docs-site/components/site-mark';

const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')) as {
  version: string;
};

describe('site mark', () => {
  it('reads the root package version, not docs-site/package.json', () => {
    expect(loadPackageVersion()).toBe(pkg.version);
  });

  it('renders the mark and the version badge', () => {
    const text = renderToStaticMarkup(<SiteMark />).replace(/<[^>]+>/g, '');
    // The badge reads "Version x.y.z" to assistive tech; sighted users see only x.y.z.
    expect(text).toBe(`HDSVersion ${pkg.version}`);
  });
});
