/**
 * Seam under test: the Icons foundation page. hds#1396 removed the full gallery (the glyphs
 * are Lucide's, ISC): the page credits Lucide with an external link, shows a short sample of
 * the icons HDS components use, and NOTICE.md carries the licence notice.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import * as Icons from '@hirobius/design-system/icons';
import { iconSizes } from '../../docs-site/lib/foundation-visuals';
import { buildTokenSections } from '../../docs-site/lib/token-tables';
import { IconSample, SAMPLE_ICONS } from '../../docs-site/components/icon-gallery';

const tokens = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));
const page = readFileSync('content/docs/foundations/icons.mdx', 'utf8');

describe('icon sizes', () => {
  it('reads sm, md and lg from semantic.size.icon', () => {
    expect(iconSizes(tokens).map((s) => [s.name, s.value, s.prop])).toEqual([
      ['sm', '16px', 'small'],
      ['md', '20px', 'medium'],
      ['lg', '24px', 'large'],
    ]);
  });

  it('gives the icons page a generated token table', () => {
    const rows = buildTokenSections(tokens, 'icons').flatMap((s) => s.rows);
    expect(rows.map((r) => r.token)).toEqual([
      'semantic.size.icon.sm',
      'semantic.size.icon.md',
      'semantic.size.icon.lg',
    ]);
  });
});

describe('Icons page credit (hds#1396)', () => {
  afterEach(cleanup);

  it('has no full gallery, and credits Lucide with its licence and an external link', () => {
    expect(page).not.toMatch(/<IconGallery/);
    expect(page).toMatch(/\[Lucide\]\(https:\/\/lucide\.dev\/icons\)/);
    expect(page).toMatch(/ISC/);
  });

  it('shows about six icons HDS components use, each exported and hidden from assistive tech', () => {
    const { container } = render(<IconSample />);
    expect(screen.getAllByRole('listitem')).toHaveLength(SAMPLE_ICONS.length);
    expect(SAMPLE_ICONS.length).toBeLessThanOrEqual(8);
    for (const name of SAMPLE_ICONS) expect(name in Icons).toBe(true);
    container
      .querySelectorAll('li svg')
      .forEach((svg) => expect(svg.getAttribute('aria-hidden')).toBe('true'));
  });

  it('NOTICE.md (shipped in the package) carries the Lucide ISC notice', () => {
    const notice = readFileSync('NOTICE.md', 'utf8');
    expect(notice).toMatch(/Lucide[\s\S]*ISC License/);
    const files = JSON.parse(readFileSync('package.json', 'utf8')).files as string[];
    expect(files).toContain('NOTICE.md');
  });
});
