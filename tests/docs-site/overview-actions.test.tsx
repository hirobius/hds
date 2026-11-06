/**
 * Seam under test: the Overview page carries the two calls to action that used to sit
 * on the removed /tour page, and each one points at a page that exists. The tour's
 * "Upgrade guide" pointed at /docs/guides/upgrading and 404'd (Adrian, 2026-11-05).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverviewActions } from '../../docs-site/components/overview-actions';

const ROOT = join(__dirname, '..', '..');
const hrefs = () =>
  [...renderToStaticMarkup(<OverviewActions />).matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

/** A /docs route is a content/docs/<path>.mdx page or a section folder (its landing is generated). */
const pageExists = (href: string) => {
  const rel = href.replace(/^\/docs\/?/, '') || 'index';
  const base = join(ROOT, 'content/docs', rel);
  return existsSync(`${base}.mdx`) || (existsSync(base) && statSync(base).isDirectory());
};

describe('Overview actions', () => {
  // content/docs/components/ is build output (gitignored), so a fresh clone has no
  // /docs/components folder until the generator runs. Run it here so the check holds there too.
  beforeAll(() => {
    if (!existsSync(join(ROOT, 'content/docs/components'))) {
      execFileSync(process.execPath, [join(ROOT, 'scripts/generate-docs-components.mjs')], {
        cwd: ROOT,
        stdio: 'ignore',
      });
    }
  });

  it('links to the components index and the upgrade guide', () => {
    expect(hrefs()).toEqual(['/docs/components', '/docs/guides/upgrade']);
  });

  it('points every action at a page that exists', () => {
    for (const href of hrefs()) expect(pageExists(href), href).toBe(true);
  });

  it('sits on the Overview page', () => {
    expect(readFileSync(join(ROOT, 'content/docs/index.mdx'), 'utf8')).toContain(
      '<OverviewActions />',
    );
  });
});
