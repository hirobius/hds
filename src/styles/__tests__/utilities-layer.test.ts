/**
 * Contract test (#698): src/styles/utilities.css must live inside `@layer utilities`.
 * Unlayered rules outrank every layered Tailwind utility regardless of specificity, so an
 * unlayered `.cursor-pointer` beat `disabled:cursor-not-allowed`. Inside the layer, the
 * `:hover` / `[data-state]` variants win on specificity again.
 *
 * The mono element typography (code/pre/kbd/samp, `.font-mono`) is the exception: it lives in
 * mono-type.css and must stay unlayered and imported right after utilities.css, or host-app
 * layered styles (Fumadocs prose code) beat it and the docs shift (#754).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postcss from 'postcss';
import { describe, it, expect } from 'vitest';

const read = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8');
const css = read('utilities.css');
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

describe('mono-type.css cascade position (#754)', () => {
  const mono = postcss.parse(read('mono-type.css'));

  it('is unlayered and owns the code/pre/kbd/samp typography', () => {
    let layered = 0;
    mono.walkAtRules('layer', () => {
      layered++;
    });
    expect(layered, '@layer in mono-type.css').toBe(0);
    const selectors = mono.nodes.flatMap((n) => (n.type === 'rule' ? n.selectors : []));
    expect(selectors).toEqual(expect.arrayContaining(['code', 'pre', 'kbd', 'samp', '.font-mono']));
  });

  it('no element selectors sneak back into the utilities layer', () => {
    root.walkRules((r) => {
      if (r.parent?.type === 'atrule' && /keyframes$/.test((r.parent as postcss.AtRule).name))
        return;
      for (const s of r.selectors)
        expect(s, `element selector in utilities.css`).not.toMatch(/^[a-z]/);
    });
  });

  it('is imported directly after utilities.css', () => {
    const imports = [...read('index.css').matchAll(/@import '\.\/([^']+)'/g)].map((m) => m[1]);
    expect(imports.indexOf('mono-type.css')).toBe(imports.indexOf('utilities.css') + 1);
  });
});
