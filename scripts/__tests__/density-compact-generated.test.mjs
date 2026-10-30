/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Compact density for apps. 0.29 loosened the default rhythm for sites; dense
 * apps opt back into a tighter one with [data-density="compact"] on any
 * ancestor. The compact values live in hirobius.tokens.json as `Compact` modes
 * and scripts/build-tokens.mjs emits them, the same way it emits `Dark`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildCSSSection } from '../lib/token-emit/css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const generated = readFileSync(join(ROOT, 'src/styles/tokens.generated.css'), 'utf8');

const block = (selector) => {
  const at = generated.indexOf(`${selector} {`);
  return at < 0 ? null : generated.slice(at, generated.indexOf('\n}', at));
};
const rootBlock = block(':root');
const compactBlock = block('[data-density="compact"]');

/** Follows var() chains through :root (then the compact block) down to a px value. */
function px(name, compact) {
  const lookup = (body, n) => new RegExp(`\\s${n}:\\s*([^;]+);`).exec(body ?? '')?.[1];
  const pick = (n) => (compact ? lookup(compactBlock, n) : undefined) ?? lookup(rootBlock, n);
  let value = pick(name);
  for (let hop = 0; hop < 8 && value; hop++) {
    const ref = /^var\((--[\w-]+)\)$/.exec(value.trim());
    if (!ref) break;
    value = pick(ref[1]);
  }
  const m = /^(\d+(?:\.\d+)?)px$/.exec(value?.trim() ?? '');
  return m ? Number(m[1]) : null;
}

describe('buildCSSSection emits Compact modes', () => {
  const mode = (Compact) => ({ 'com.figma.variables': { modes: { Compact } } });

  it('returns a compact line for a dimension token with a Compact mode', () => {
    const { compactLines } = buildCSSSection(
      [
        {
          path: ['semantic', 'space', 'scale', 'sm'],
          type: 'dimension',
          value: '{primitive.space.5}',
          extensions: mode('{primitive.space.3}'),
        },
      ],
      'Test',
    );
    expect(compactLines).toEqual(['  --semantic-space-scale-sm: var(--primitive-space-3);']);
  });

  it('emits only the sub-properties a partial typography Compact mode names', () => {
    const { compactLines } = buildCSSSection(
      [
        {
          path: ['semantic', 'typography', 'body'],
          type: 'typography',
          value: {
            fontFamily: '{primitive.typography.family.primary}',
            fontSize: '{primitive.typography.size.lg}',
            fontWeight: '{primitive.typography.weight.regular}',
            letterSpacing: '{primitive.typography.letterSpacing.normal}',
            lineHeight: '{primitive.typography.lineHeight.body}',
          },
          extensions: mode({ fontSize: '{primitive.typography.size.sm}' }),
        },
      ],
      'Test',
    );
    expect(compactLines).toEqual([
      '  --semantic-typography-body-font-size: var(--primitive-typography-size-sm);',
    ]);
  });
});

describe('tokens.generated.css carries the compact block', () => {
  it('has a [data-density="compact"] rule', () => {
    expect(compactBlock).not.toBeNull();
  });

  it('remaps the scale to 4/8/12/16/24/32px (default stays 4/8/20/28/40/64px)', () => {
    const steps = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'];
    const at = (compact) => steps.map((s) => px(`--semantic-space-scale-${s}`, compact));
    expect(at(true)).toEqual([4, 8, 12, 16, 24, 32]);
    expect(at(false)).toEqual([4, 8, 20, 28, 40, 64]);
  });

  it('declares none of the layout aliases 0.33.0 removed (hds#625)', () => {
    expect(generated).not.toMatch(/--semantic-space-layout-(tight|normal|inset|spacious|gutter):/);
  });

  it('section stack is 48px; region gutter and grid gap follow their scale steps', () => {
    expect(px('--semantic-space-section-stack', true)).toBe(48);
    expect(px('--semantic-space-section-stack', false)).toBe(96);
    expect(px('--semantic-space-region-gutter', true)).toBe(24);
    expect(px('--semantic-space-region-gutter', false)).toBe(40);
    expect(px('--semantic-layout-grid-gap', true)).toBe(16);
  });

  it('re-declares aliases so a nested compact scope resolves against the remap', () => {
    for (const alias of ['--semantic-space-surface-padding', '--semantic-space-region-gutter']) {
      expect(compactBlock).toMatch(new RegExp(`\\s${alias}:`));
    }
  });

  it('sets the app type sizes: body 15, caption 13, ui 14, title and h1 24; display stays 56', () => {
    const size = (role, compact) => px(`--semantic-typography-${role}-font-size`, compact);
    expect(['body', 'caption', 'ui', 'title', 'h1'].map((r) => size(r, true))).toEqual([
      15, 13, 14, 24, 24,
    ]);
    expect(['body', 'caption', 'ui', 'title'].map((r) => size(r, false))).toEqual([18, 14, 16, 28]);
    expect(size('display', true)).toBe(56);
  });

  it('touches no colour, so AA contrast cannot move', () => {
    expect(compactBlock).not.toMatch(/--[\w-]*color[\w-]*:/);
    expect(() =>
      execFileSync('node', ['scripts/check-contrast.mjs'], { cwd: ROOT, stdio: 'pipe' }),
    ).not.toThrow();
  });
});
