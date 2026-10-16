/**
 * Contract test (#698): src/styles/utilities.css must live inside `@layer utilities`.
 * Unlayered rules outrank every layered Tailwind utility regardless of specificity, so an
 * unlayered `.cursor-pointer` beat `disabled:cursor-not-allowed`. Inside the layer, the
 * `:hover` / `[data-state]` variants win on specificity again.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss from 'postcss';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(__dirname, '../utilities.css'), 'utf8');
const root = postcss.parse(css);

describe('utilities.css cascade layer', () => {
  it('has no unlayered rules or at-rules besides the layer itself', () => {
    const stray = root.nodes
      .filter((n) => n.type !== 'comment')
      .filter((n) => !(n.type === 'atrule' && (n as postcss.AtRule).name === 'layer'))
      .map((n) => (n.type === 'rule' ? n.selector : `@${(n as postcss.AtRule).name}`));
    expect(stray, 'top-level nodes outside @layer utilities').toEqual([]);
  });

  it('puts everything in the utilities layer', () => {
    const layers = root.nodes.filter(
      (n): n is postcss.AtRule => n.type === 'atrule' && n.name === 'layer',
    );
    expect(layers.length).toBeGreaterThan(0);
    for (const l of layers) expect(l.params).toBe('utilities');
  });
});
