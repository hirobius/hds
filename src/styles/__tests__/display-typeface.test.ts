/**
 * Contract test: Sora sets every text role (ADR-063, Adrian 2026-11-11): display and
 * title at 700, body at 340 and ui at 430 on the variable axis.
 *
 * This pins the tokens, the root default of the display dial, the self-hosted
 * variable @font-face, and that mono stays on its own family.
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
  it('leads the display and primary families with Sora and a system-ui sans fallback', () => {
    for (const f of [family.display, family.primary]) {
      expect(f.$value[0]).toBe('Sora');
      expect(f.$value[1]).toBe('system-ui');
      expect(f.$value.at(-1)).toBe('sans-serif');
    }
  });

  it('binds display, title and title-sm to the display family', () => {
    for (const role of ['display', 'title', 'titleSm']) {
      expect(roles[role].$value.fontFamily, role).toBe('{primitive.typography.family.display}');
    }
  });

  it('keeps body, ui and caption on the primary family and mono on its own', () => {
    for (const role of ['body', 'ui', 'caption']) {
      expect(roles[role].$value.fontFamily, role).toBe('{primitive.typography.family.primary}');
    }
    expect(roles.mono.$value.fontFamily).toBe('{primitive.typography.family.mono}');
  });

  it('defaults the display dial to Sora', () => {
    expect(read('src/styles/theme.css')).toMatch(/--hds-font-family-display:\s*'Sora', system-ui,/);
  });

  it('sets display, title and title-sm at weight 700 and body at 340', () => {
    const weight = tokens.primitive.typography.weight;
    expect(weight.display.$value).toBe(700);
    expect(weight.regular.$value).toBe(340);
    expect(weight.medium.$value).toBe(430);
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

  it('self-hosts one variable Sora face with its OFL licence, no CDN', () => {
    const fonts = read('src/styles/fonts.css');
    expect(fonts).toMatch(
      /font-family: 'Sora';\s*src: url\('\/fonts\/sora\/sora-variable\.woff2'\) format\('woff2'\);\s*font-weight: 100 800;\s*font-style: normal;\s*font-display: swap;/,
    );
    expect(fonts.match(/font-family: 'Sora';/g)).toHaveLength(1);
    expect(fonts).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(fonts).not.toMatch(/Bricolage|Jakarta/i);
    expect(existsSync(resolve(ROOT, 'public/fonts/sora/sora-700.woff2'))).toBe(false);
    expect(existsSync(resolve(ROOT, 'public/fonts/plus-jakarta-sans'))).toBe(false);
    expect(existsSync(resolve(ROOT, 'public/fonts/sora/sora-variable.woff2'))).toBe(true);
    expect(read('public/fonts/sora/LICENSE.txt')).toMatch(/SIL Open Font License, Version 1\.1/);
    expect(existsSync(resolve(ROOT, 'public/fonts/bricolage-grotesque'))).toBe(false);
  });
});
