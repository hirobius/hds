/**
 * Contract test: display and title set in Sora 700, body at 400 (ADR-063, hds#847).
 *
 * The expressive-type change moves only the display face. This pins the token,
 * the root default of the display dial, the self-hosted @font-face, and that
 * body, ui, caption and mono did not move with it.
 *
 * @unit ADR-063
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const tokens = JSON.parse(read('hirobius.tokens.json'));
const family = tokens.primitive.typography.family;
const roles = tokens.semantic.typography;

describe('display typeface (ADR-063)', () => {
  it('leads the display family with Sora and keeps the sans fallbacks', () => {
    expect(family.display.$value[0]).toBe('Sora');
    expect(family.display.$value).toContain('Plus Jakarta Sans');
    expect(family.display.$value.at(-1)).toBe('sans-serif');
  });

  it('binds display, title and title-sm to the display family', () => {
    for (const role of ['display', 'title', 'titleSm']) {
      expect(roles[role].$value.fontFamily, role).toBe('{primitive.typography.family.display}');
    }
  });

  it('leaves body, ui, caption and mono on their own families', () => {
    expect(family.primary.$value[0]).toBe('Plus Jakarta Sans');
    for (const role of ['body', 'ui', 'caption']) {
      expect(roles[role].$value.fontFamily, role).toBe('{primitive.typography.family.primary}');
    }
    expect(roles.mono.$value.fontFamily).toBe('{primitive.typography.family.mono}');
  });

  it('defaults the display dial to Sora', () => {
    expect(read('src/styles/theme.css')).toMatch(
      /--hds-font-family-display:\s*'Sora',[^;]*'Plus Jakarta Sans'/,
    );
  });

  it('sets display, title and title-sm at weight 700 and body at 400 (hds#847)', () => {
    const weight = tokens.primitive.typography.weight;
    expect(weight.display.$value).toBe(700);
    expect(weight.regular.$value).toBe(400);
    expect(weight.medium.$value).toBe(500);
    for (const role of ['display', 'title', 'titleSm']) {
      expect(roles[role].$value.fontWeight, role).toBe('{primitive.typography.weight.display}');
    }
    expect(roles.body.$value.fontWeight).toBe('{primitive.typography.weight.regular}');
  });

  it('steps the heading sizes 56 / 28 / 20 so levels differ by size, not weight (hds#847)', () => {
    const px = (role: string) => {
      const ref = roles[role].$value.fontSize.match(/^\{primitive\.typography\.size\.(.+)\}$/)[1];
      return tokens.primitive.typography.size[ref].$value.value;
    };
    expect([px('display'), px('title'), px('titleSm'), px('body')]).toEqual([56, 28, 20, 18]);
  });

  it('renders display, title and title-sm in the display family at the title size, in the generated CSS', () => {
    const css = read('src/styles/tokens.generated.css');
    expect(css).toMatch(/--primitive-typography-family-display:\s*Sora,/);
    expect(css).toMatch(/--primitive-typography-weight-display:\s*700;/);
    for (const role of ['display', 'title', 'titleSm']) {
      expect(css, role).toContain(
        // tier-ok: asserts the generated alias
        `--semantic-typography-${role}-font-family: var(--primitive-typography-family-display);`,
      );
      expect(css, role).toContain(
        // tier-ok: asserts the generated alias
        `--semantic-typography-${role}-font-weight: var(--primitive-typography-weight-display);`,
      );
    }
    expect(roles.title.$value.fontFamily).toBe('{primitive.typography.family.display}');
  });

  it('self-hosts both faces with their OFL licences, no CDN', () => {
    const fonts = read('src/styles/fonts.css');
    expect(fonts).toMatch(
      /font-family: 'Sora';\s*src: url\('\/fonts\/sora\/sora-700\.woff2'\) format\('woff2'\);\s*font-weight: 700;/,
    );
    expect(fonts).toMatch(
      /font-family: 'Plus Jakarta Sans';\s*src: url\('\/fonts\/plus-jakarta-sans\/plus-jakarta-sans-variable\.woff2'\)[^;]*;\s*font-weight: 200 800;/,
    );
    expect(fonts).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(fonts).not.toMatch(/Bricolage/i);
    expect(fonts, 'vendor only the Sora weight in use').not.toMatch(/sora-800/);
    expect(existsSync(resolve(ROOT, 'public/fonts/sora/sora-800.woff2'))).toBe(false);
    for (const f of ['sora/sora-700.woff2', 'plus-jakarta-sans/plus-jakarta-sans-variable.woff2']) {
      expect(existsSync(resolve(ROOT, 'public/fonts', f)), f).toBe(true);
    }
    expect(read('public/fonts/sora/LICENSE.txt')).toMatch(/SIL Open Font License, Version 1\.1/);
    expect(existsSync(resolve(ROOT, 'public/fonts/bricolage-grotesque'))).toBe(false);
  });
});
