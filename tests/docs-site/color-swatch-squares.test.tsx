/**
 * Color page swatches are square and simple (Adrian, doc pages Draft 2, 2026-11-06):
 * one square per theme (Light, then Dark when the token has a Dark value), sized from
 * semantic.size.listRow, beside the token name and its value. No split block.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { FoundationVisual } from '../../docs-site/components/foundation-visuals';

const ROOT = join(__dirname, '..', '..');
const CSS = readFileSync(join(ROOT, 'docs-site/app/globals.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);
const ruleBody = (selector: string) =>
  [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) =>
      sel!
        .split(',')
        .map((s) => s.trim())
        .includes(selector),
    )
    .map(([, , body]) => body!)
    .join(';');

describe('Color swatches are squares', () => {
  const html = renderToStaticMarkup(<FoundationVisual page="color" />);
  const cards = html.split('class="hds-swatch"').slice(1);

  it('renders a squares group in every swatch, with one fill per theme', () => {
    expect(cards.length).toBeGreaterThan(50);
    for (const card of cards) {
      expect(card).toContain('class="hds-swatch-squares"');
      const fills = card.match(/class="hds-swatch-fill"[^>]*data-theme-mode="(light|dark)"/g) ?? [];
      expect(fills.length).toBeGreaterThanOrEqual(1);
      expect(fills.length).toBeLessThanOrEqual(2);
      expect(fills[0]).toContain('data-theme-mode="light"');
    }
  });

  it('no longer draws the split block', () => {
    expect(html).not.toContain('hds-swatch-block');
  });

  it('sizes each square from semantic.size.listRow with a 1:1 ratio', () => {
    const fill = ruleBody('.hds-swatch-fill');
    expect(fill).toMatch(/width:\s*var\(--semantic-size-listRow\)/);
    expect(fill).toMatch(/aspect-ratio:\s*1\b/);
    expect(fill).toMatch(/border-radius:\s*var\(--semantic-radius-action\)/);
  });

  it('lays the squares beside the name, not above it', () => {
    expect(ruleBody('.hds-swatch')).toMatch(/flex-direction:\s*row/);
  });
});
