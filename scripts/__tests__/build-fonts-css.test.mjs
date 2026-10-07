/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/build-fonts-css.mjs (hds#479): the opt-in fonts.css
 * export. Fonts ship as woff2 files next to a fonts.css whose URLs are relative,
 * and tokens.css carries no @font-face.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONTS, buildFontsCss } from '../build-fonts-css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('buildFontsCss', () => {
  const css = buildFontsCss(read('src/styles/fonts.css'));

  it('rewrites every absolute /fonts/<family>/ URL to a path relative to fonts.css', () => {
    expect(css).not.toMatch(/url\(['"]?\//);
    for (const f of FONTS) {
      expect(css).toContain(`url('./fonts/${f.split('/').pop()}')`);
    }
  });

  it('keeps one @font-face per face with font-display: swap', () => {
    expect(css.match(/@font-face/g)).toHaveLength(FONTS.length);
    expect(css.match(/font-display:\s*swap/g)).toHaveLength(FONTS.length);
  });

  it('embeds nothing', () => {
    expect(css).not.toContain('data:font');
  });

  it('fails when a face in FONTS is not declared in fonts.css', () => {
    expect(() => buildFontsCss("@font-face{src:url('/fonts/x/y.woff2')}")).toThrow(/not found/);
  });

  it('every listed font file exists in public/', () => {
    for (const f of FONTS) expect(existsSync(join(ROOT, 'public', f))).toBe(true);
  });
});

describe('tokens.css source', () => {
  it('index.css no longer pulls fonts.css into the library bundle', () => {
    expect(read('src/styles/index.css')).not.toMatch(/@import\s+['"]\.\/fonts\.css['"]/);
  });
  it('the package exports ./fonts.css', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.exports['./fonts.css']).toBe('./dist/fonts.css');
  });
});
