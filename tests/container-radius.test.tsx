/**
 * Containers share one corner radius that follows the tenant knob (hds#338).
 * `rounded-lg` is `calc(var(--role-radius) + 4px)` (tailwind.config.tokens.cjs),
 * so a container is 12 px by default and 4 px under `brutalist-demo`.
 * `--component-card-radius` ignores tenants, so no container may read it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Card } from '../src/app/components/card';
import { SelectableCard } from '../src/app/components/selectable-card';
import { Surface } from '../src/app/components/surface';
import { StatusTile } from '../src/app/components/status-tile';

afterEach(cleanup);

/** The radius utilities on an element's class list (`rounded-lg`, `rounded-[…]`, …). */
const radiusUtilities = (el: Element) =>
  (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => /^rounded(-|$)/.test(c));

describe('container radius', () => {
  it('Card, SelectableCard, Surface and StatusTile resolve to the same radius utility', () => {
    const card = render(<Card>x</Card>).container.firstElementChild!;
    const selectable = render(<SelectableCard>x</SelectableCard>).container.firstElementChild!;
    const surface = render(<Surface>x</Surface>).container.firstElementChild!;
    const tile = render(<StatusTile title="x" />).container.firstElementChild!;

    expect(radiusUtilities(card)).toEqual(['rounded-lg']);
    expect(radiusUtilities(selectable)).toEqual(['rounded-lg']);
    expect(radiusUtilities(surface)).toEqual(['rounded-lg']);
    expect(radiusUtilities(tile)).toEqual(['rounded-lg']);
  });

  it('theme.css card rules follow the tenant knob, not --component-card-radius', () => {
    const css = readFileSync(resolve(__dirname, '../src/styles/theme.css'), 'utf8');
    expect(css).not.toContain('var(--component-card-radius)');
  });
});
