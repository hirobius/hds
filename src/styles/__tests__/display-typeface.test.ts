/**
 * Contract test: display and title set in Bricolage Grotesque (ADR-063).
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
  it('leads the display family with Bricolage Grotesque and keeps the sans fallbacks', () => {
    expect(family.display.$value[0]).toBe('Bricolage Grotesque');
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

  it('defaults the display dial to Bricolage Grotesque', () => {
    expect(read('src/styles/theme.css')).toMatch(
      /--hds-font-family-display:\s*'Bricolage Grotesque',[^;]*'Plus Jakarta Sans'/,
    );
  });

  it('self-hosts the face with its OFL licence, no CDN', () => {
    const fonts = read('src/styles/fonts.css');
    expect(fonts).toMatch(
      /font-family: 'Bricolage Grotesque';\s*src: url\('\/fonts\/bricolage-grotesque\/bricolage-grotesque-700\.woff2'\)/,
    );
    expect(fonts).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(
      existsSync(resolve(ROOT, 'public/fonts/bricolage-grotesque/bricolage-grotesque-700.woff2')),
    ).toBe(true);
    expect(read('public/fonts/bricolage-grotesque/LICENSE.txt')).toMatch(
      /SIL Open Font License, Version 1\.1/,
    );
  });
});
