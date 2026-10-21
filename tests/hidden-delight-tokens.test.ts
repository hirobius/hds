/**
 * Lime / delight is hidden for now (hds#857): the tokens stay in the package,
 * deprecated, so they can come back, but no consumer surface lists them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(p, 'utf8');
const tokens = JSON.parse(read('hirobius.tokens.json'));
const DELIGHT = ['base', 'deep', 'pale', 'onDelight'];
const LIME = Object.keys(tokens.primitive.color.lime).filter((k) => !k.startsWith('$'));
const HIDDEN = /semantic[.-]accent[.-]delight|primitive[.-]color[.-]lime/;

describe('lime / delight is hidden, not deleted (hds#857)', () => {
  it('keeps every delight and lime token, each marked $deprecated', () => {
    for (const k of DELIGHT)
      expect(tokens.semantic.accent.delight[k].$deprecated).toMatch(/hds#857/);
    expect(LIME.length).toBeGreaterThan(0);
    for (const k of LIME) expect(tokens.primitive.color.lime[k].$deprecated).toMatch(/hds#857/);
  });

  it('still ships the CSS variables', () => {
    expect(read('src/styles/tokens.generated.css')).toContain('--semantic-accent-delight-base:');
  });

  it('leaves them out of the manifest', () => {
    const m = JSON.parse(read('public/hds-manifest.json'));
    const paths = Object.values(m.tokens as Record<string, { path: string }[]>)
      .flat()
      .map((t) => t.path);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((p) => HIDDEN.test(p))).toEqual([]);
  });

  it('leaves them out of llms.txt, its slices and DESIGN.md', () => {
    const files = [
      'public/llms.txt',
      'public/llms-full.txt',
      ...readdirSync('public/llms').map((f) => `public/llms/${f}`),
      'DESIGN.md',
    ];
    for (const f of files) expect(read(f), f).not.toMatch(HIDDEN);
  });
});
