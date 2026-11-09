/** hds#1406: the Figma library's page order, recorded in figma/page-order.json. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const order = JSON.parse(readFileSync('figma/page-order.json', 'utf8'));
const sorted = (xs: string[]) =>
  [...xs].sort((a, b) =>
    a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0,
  );

describe('Figma page order (hds#1406)', () => {
  it('pins Cover and Getting Started first', () => {
    expect(order.pinned).toEqual(['Cover', 'Getting Started']);
  });

  it.each(['foundations', 'components', 'internal'])('keeps the %s group A-Z', (group) => {
    expect(order[group]).toEqual(sorted(order[group]));
  });

  it('keeps the separator out of the sort', () => {
    expect(order.separator).toBe('———');
    expect(order.components).not.toContain('———');
  });
});
