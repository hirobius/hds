// @vitest-environment node
/**
 * The screen-level rules must reach the two documents agents read first:
 * `public/llms.txt` (the layout recipe) and `DESIGN.md` (the which-one-when
 * table and the page-title rule). Both are generated, so these tests read the
 * committed output and fail if the source and the generators drift apart (hds#337).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

/** The body of a `## Heading` section, up to the next `## ` heading. */
function section(text: string, heading: string) {
  const start = text.indexOf(`\n## ${heading}\n`);
  expect(start, `"## ${heading}" section not found`).toBeGreaterThanOrEqual(0);
  const rest = text.slice(start + 1);
  const next = rest.indexOf('\n## ', 4);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('llms.txt screen recipe', () => {
  const llms = read('public/llms.txt');

  it('names all five screen patterns in "How To Lay Out A Screen"', () => {
    const recipe = section(llms, 'How To Lay Out A Screen');
    for (const name of [
      'PageHeader',
      'MetricTiles',
      'FormActions',
      'DestructiveSection',
      'DataTableSection',
    ]) {
      expect(recipe, `${name} missing from the layout recipe`).toContain(name);
    }
  });

  it('points at the which-one-when table', () => {
    expect(section(llms, 'How To Lay Out A Screen')).toMatch(/Which one, when/);
  });

  it('lists the five patterns under "Pattern Inventory"', () => {
    const inventory = section(llms, 'Pattern Inventory');
    for (const name of [
      'DataTableSection',
      'DestructiveSection',
      'FormActions',
      'MetricTiles',
      'PageHeader',
    ]) {
      expect(inventory).toContain(`- ${name}`);
    }
  });
});

describe('DESIGN.md screen rules', () => {
  const design = read('DESIGN.md');

  it('has a "Which one, when" table with a "Use instead" column', () => {
    expect(design).toMatch(/Which one, when/);
    const header = design.split('\n').find((l) => /^\|.*Use instead.*\|/.test(l));
    expect(header, 'no table header row containing "Use instead"').toBeDefined();
  });

  it('has a row for Stat, Card.Metric, StatusTile and MetricTiles', () => {
    const rows = design.split('\n').filter((l) => l.startsWith('|'));
    for (const name of ['Stat', 'Card.Metric', 'StatusTile', 'MetricTiles']) {
      const found = rows.some((l) => l.split('|')[1]?.includes(`\`${name}\``));
      expect(found, `no table row led by \`${name}\``).toBe(true);
    }
  });

  it('has a row for Card, Surface, DestructiveSection and DataTableSection', () => {
    const rows = design.split('\n').filter((l) => l.startsWith('|'));
    for (const name of ['Card', 'Surface', 'DestructiveSection', 'DataTableSection']) {
      const found = rows.some((l) => l.split('|')[1]?.includes(`\`${name}\``));
      expect(found, `no table row led by \`${name}\``).toBe(true);
    }
  });

  // hds#393 (prune B3): the survivors that replace SelectableCard, TileGrid and
  // StatusDot are named where an agent picks a tile, so it never reaches for
  // the removed component.
  it('names the selectable Card, the auto-fill Grid and the dot Badge beside the table', () => {
    const cardRow = design.split('\n').find((l) => l.startsWith('| `Card`'));
    expect(cardRow, 'no table row led by `Card`').toContain('`selectable`');
    expect(design).toContain('`Grid` with `layout="auto-fill"` and `minItemWidth`');
    expect(design).toContain('`Badge` with `dot`');
  });

  it('does not contradict itself on the container radius or the action radius', () => {
    expect(design).not.toMatch(/never 12\/16\/20/);
    expect(design).not.toMatch(/4px action radius/);
  });

  it('states the page-title rule and names heading2', () => {
    const rule = design.split('\n').find((l) => /page.title/i.test(l) && l.includes('heading2'));
    expect(rule, 'no line stating the page-title rule with heading2').toBeDefined();
    expect(design).toMatch(/exactly one `PageHeader`/);
  });
});
