/**
 * Seam under test: the docs site says "Hirobius Design System" once, as the home
 * page H1 (hds#845). The sidebar header uses the short mark, and the home page's
 * sidebar entry reads "Overview" instead of repeating its title.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SITE_NAME, siteNameRepeats } from '../../scripts/lib/docs-axe.mjs';
import {
  HOME_NAV_LABEL,
  SITE_MARK,
  homeNavLabelPlugin,
  topBarTitle,
} from '../../docs-site/lib/site-name';

const transform = (node: { type: 'page'; name: string; url: string }) =>
  homeNavLabelPlugin().transformPageTree!.file!.call(
    // The transformer context isn't read by this plugin.
    {} as never,
    node as never,
  ) as { name: string };

describe('site name', () => {
  it('uses the short mark for the sidebar header', () => {
    expect(SITE_MARK).toBe('HDS');
  });

  it('labels the home page "Overview" in the sidebar', () => {
    expect(transform({ type: 'page', name: 'Hirobius Design System', url: '/docs' }).name).toBe(
      HOME_NAV_LABEL,
    );
    expect(HOME_NAV_LABEL).toBe('Overview');
  });

  it('leaves every other page title alone', () => {
    expect(transform({ type: 'page', name: 'Button', url: '/docs/components/button' }).name).toBe(
      'Button',
    );
  });
});

describe('topBarTitle', () => {
  it('shows nothing on the home page, whose H1 is the full name', () => {
    expect(topBarTitle('/docs', ['Overview'])).toBeUndefined();
    expect(topBarTitle('/docs/', ['Overview'])).toBeUndefined();
  });

  it("shows the current page's title on inner pages", () => {
    expect(topBarTitle('/docs/components/button', ['Components', 'Button'])).toBe('Button');
  });

  it('shows nothing when the page is not in the tree', () => {
    expect(topBarTitle('/docs/nowhere', [])).toBeUndefined();
  });
});

describe('siteNameRepeats (docs browser gate, hds#845)', () => {
  it("checks for the home page's own H1", () => {
    const home = readFileSync('content/docs/index.mdx', 'utf8');
    expect(home).toContain(`title: '${SITE_NAME}'`);
  });

  it('passes when the home page says the full name once', () => {
    expect(siteNameRepeats('/docs', 'HDS\nOverview\nHirobius Design System\nInstall')).toBeNull();
  });

  it('fails when the home page says it more than once', () => {
    expect(
      siteNameRepeats('/docs', 'Hirobius Design System\nHirobius Design System'),
    ).toMatchObject({ id: 'site-name-repeated', impact: 'serious', nodes: 2 });
  });

  it('only checks the home page', () => {
    expect(
      siteNameRepeats('/docs/guides', 'Hirobius Design System\nHirobius Design System'),
    ).toBeNull();
  });
});
