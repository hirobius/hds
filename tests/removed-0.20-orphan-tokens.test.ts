// @vitest-environment node
/**
 * The 0.20.0 removals (hds#394) took out Lightbox, NavItem, NavGroup, SideNav and
 * HdsDocsShell but left their tokens behind (hds#431). Nothing reads them, so they
 * go, except component.nav.paddingY, which Disclosure's nav variant still uses.
 * The frozen manifest `phases` key goes with them (hds#442): no script writes it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import hds from '../src/app/design-system/tokens';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');
const tokens = JSON.parse(read('hirobius.tokens.json'));

const at = (path: string) =>
  path
    .split('.')
    .reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], tokens);

const ORPHANS = [
  'component.lightbox',
  'component.nav.bg',
  'component.nav.bgActive',
  'component.nav.borderActive',
  'component.nav.text',
  'component.nav.textActive',
  'component.nav.height',
  'component.nav.paddingX',
  'semantic.space.sidebar.railWidth',
];
const cssVar = (path: string) => `--${path.replace(/\./g, '-')}`;

describe('orphan tokens after the 0.20.0 removals (hds#431)', () => {
  it.each(ORPHANS)('%s is gone from hirobius.tokens.json', (path) => {
    expect(at(path)).toBeUndefined();
  });

  it('keeps component.nav.paddingY for the Disclosure nav variant', () => {
    expect(at('component.nav.paddingY')).toBeDefined();
    expect(read('src/app/components/disclosure.tsx')).toContain('--component-nav-paddingY');
  });

  it('no stylesheet still sets an orphan CSS variable', () => {
    const css = [
      'src/styles/tokens.generated.css',
      'src/styles/tenants.css',
      'src/styles/accents.css',
    ]
      .map(read)
      .join('\n');
    for (const path of ORPHANS) expect(css).not.toMatch(new RegExp(`${cssVar(path)}[-:\\s]`));
  });

  it('the ./tokens bridge no longer exports the lightbox blur', () => {
    expect(hds.effect.blur).not.toHaveProperty('lightboxBackdrop');
  });
});

describe('the frozen manifest phases key (hds#442)', () => {
  it('is not in public/hds-manifest.json', () => {
    expect(JSON.parse(read('public/hds-manifest.json'))).not.toHaveProperty('phases');
  });
});
