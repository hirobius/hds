/**
 * Seam under test: the Icons foundation page (hds#1229) — the gallery data
 * (docs-site/lib/icon-gallery.ts), the size steps it reads from the tokens, and
 * the client gallery's search.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as Icons from '@hirobius/design-system/icons';
import { filterIconNames, iconNames } from '../../docs-site/lib/icon-gallery';
import { iconSizes } from '../../docs-site/lib/foundation-visuals';
import { buildTokenSections } from '../../docs-site/lib/token-tables';
import { IconGallery } from '../../docs-site/components/icon-gallery';

const tokens = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));
const exported = (readFileSync('src/icons.ts', 'utf8').match(/export \{([\s\S]*?)\}/)?.[1] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

describe('iconNames', () => {
  it('lists every name the icons entry exports, sorted', () => {
    const names = iconNames(Icons);
    expect(names).toEqual([...exported].sort((a, b) => a.localeCompare(b)));
  });

  it('skips exports that are not components', () => {
    expect(iconNames({ Star: Icons.Star, version: '1', meta: { a: 1 } })).toEqual(['Star']);
  });
});

describe('filterIconNames', () => {
  const names = ['ArrowUp', 'ArrowUpRight', 'Check', 'CircleCheck'];

  it('returns every name for an empty query', () => {
    expect(filterIconNames(names, '  ')).toEqual(names);
  });

  it('matches case-insensitively and ignores spaces and dashes', () => {
    expect(filterIconNames(names, 'arrow up')).toEqual(['ArrowUp', 'ArrowUpRight']);
    expect(filterIconNames(names, 'arrow-up-right')).toEqual(['ArrowUpRight']);
    expect(filterIconNames(names, 'CHECK')).toEqual(['Check', 'CircleCheck']);
  });
});

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

describe('<IconGallery />', () => {
  afterEach(cleanup);

  it('renders one tile per icon, with the glyph hidden from assistive tech', () => {
    const { container } = render(<IconGallery />);
    const tiles = screen.getAllByRole('listitem');
    expect(tiles).toHaveLength(exported.length);
    const svgs = container.querySelectorAll('li svg');
    expect(svgs.length).toBe(exported.length);
    svgs.forEach((svg) => expect(svg.getAttribute('aria-hidden')).toBe('true'));
  });

  it('filters by the search field and announces the count', () => {
    render(<IconGallery />);
    fireEvent.change(screen.getByLabelText('Search icons'), { target: { value: 'chevron' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('status').textContent).toBe('4 of ' + exported.length + ' icons');
  });

  it('says so when nothing matches', () => {
    render(<IconGallery />);
    fireEvent.change(screen.getByLabelText('Search icons'), { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText(/No icon matches/)).toBeTruthy();
  });
});
