/**
 * Seam under test: the /tour page (hds#795), "HDS Console", one mock product
 * screen built from HDS's own data. The coverage gate: every public component in
 * component-api.json must be placed in a tour section, used in the tour source,
 * and named in that section's caption with a link to its docs page. Adding a
 * component without putting it on the tour fails here.
 */
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
// @ts-expect-error -- plain .mjs module, no types
import { CORE_COMPONENTS } from '../../scripts/lib/core-components.mjs';
import api from '../../src/app/data/component-api.json';
import { COMPOSED_BY, TOUR_SECTIONS, tourComponents } from '../../docs-site/lib/tour-sections';
import { docsHref, loadTourData, parseChangelog } from '../../docs-site/lib/tour-data';

const ROOT = join(__dirname, '..', '..');
const TOUR_DIR = join(ROOT, 'docs-site/components/tour');
const registry = Object.keys((api as { components: Record<string, unknown> }).components);

const tourSource = readdirSync(TOUR_DIR)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => readFileSync(join(TOUR_DIR, f), 'utf8'))
  .join('\n');

/** `<Name` as a JSX element, or `<Parent.Part` for a compound part (CardBody -> Card.Body). */
function isUsed(name: string, source: string): boolean {
  if (COMPOSED_BY[name]) return isUsed(COMPOSED_BY[name], source);
  if (new RegExp(`<${name}[\\s>/]`).test(source)) return true;
  return registry.some((parent) => {
    if (parent === name || !name.startsWith(parent)) return false;
    return new RegExp(`<${parent}\\.${name.slice(parent.length)}[\\s>/]`).test(source);
  });
}

describe('tour coverage', () => {
  it('places every public component in exactly one section', () => {
    const placed = tourComponents();
    const missing = registry.filter((n) => !placed.includes(n));
    expect(missing, `not on /tour: ${missing.join(', ')}`).toEqual([]);
    expect(new Set(placed).size).toBe(placed.length);
    const unknown = placed.filter((n) => !registry.includes(n));
    expect(unknown, `not a public component: ${unknown.join(', ')}`).toEqual([]);
  });

  it('uses every component in the tour source', () => {
    const unused = registry.filter((n) => !isUsed(n, tourSource));
    expect(unused, `named in a caption but never rendered: ${unused.join(', ')}`).toEqual([]);
  });

  it('every core component has a docs page link', () => {
    for (const name of CORE_COMPONENTS) expect(docsHref(name)).toMatch(/^\/docs\//);
  });

  it('uses no raw shadow or radius values', () => {
    const lines = tourSource.split('\n').filter((l) => /box-?shadow|border-?radius/i.test(l));
    const raw = lines.filter((l) => !/var\(--/.test(l));
    expect(raw).toEqual([]);
  });
});

describe('tour page', () => {
  it('reads the registry, tokens and changelog at build time', () => {
    const data = loadTourData();
    expect(data.components.length).toBeGreaterThan(40);
    expect(data.tokenGroups.reduce((n, g) => n + g.count, 0)).toBeGreaterThan(100);
    expect(data.releases.length).toBeGreaterThan(0);
    expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('parses release headings, upgrade asks and changes out of CHANGELOG.md', () => {
    const md = [
      '# Changelog',
      '## 1.2.3',
      '### Upgrade',
      '- Looks different: Buttons grew.',
      '### Minor Changes',
      '- abc1234: Added a thing.',
      '## 1.2.2',
      '### Patch Changes',
      '- def4567: Fixed a thing.',
    ].join('\n');
    const rel = parseChangelog(md);
    expect(rel.map((r) => r.version)).toEqual(['1.2.3', '1.2.2']);
    expect(rel[0].asks).toEqual(['Looks different: Buttons grew.']);
    expect(rel[0].changes).toEqual(['Added a thing.']);
    expect(rel[1].changes).toEqual(['Fixed a thing.']);
  });

  it('renders each section with a caption linking its components to their docs pages', async () => {
    const { TourConsole } = await import('../../docs-site/components/tour/tour-console');
    const { container } = render(<TourConsole data={loadTourData()} />);
    for (const section of TOUR_SECTIONS) {
      const caption = container.querySelector(`[data-tour-caption="${section.id}"]`);
      expect(caption, `caption for ${section.id}`).not.toBeNull();
      for (const name of section.components) {
        const link = caption!.querySelector(`a[href="${docsHref(name)}"]`);
        expect(link, `${section.id} links ${name}`).not.toBeNull();
      }
    }
  });

  it('server-renders without an escaped entity in a <style>', async () => {
    const { TourConsole } = await import('../../docs-site/components/tour/tour-console');
    const html = renderToStaticMarkup(<TourConsole data={loadTourData()} />);
    expect(html).not.toMatch(/<style[^>]*>[^<]*&(?:quot|amp|lt|gt|#39|#x27);[^<]*<\/style>/);
  });
});
