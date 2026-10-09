/**
 * scripts/lib/public-classes.mjs (hds#449): the classes HDS promises
 * consumers, which public/hds-manifest.json lists as publicClasses and the CSS
 * upgrade gate (scripts/check-upgrade-css.mjs) treats as breaking to remove.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECLARED_PUBLIC_CLASSES, publicClasses } from '../lib/public-classes.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');

describe('publicClasses', () => {
  it('is hds-focus plus every class src/styles/static.css styles, sorted', () => {
    const root = mkdtempSync(join(tmpdir(), 'hds-public-classes-'));
    try {
      mkdirSync(join(root, 'src/styles'), { recursive: true });
      writeFileSync(
        join(root, 'src/styles/static.css'),
        '/* .hds-comment */.hds-tag--active,.hds-tag{color:red}@media (min-width:1px){.hds-card .hds-card__body{gap:0}}',
      );
      expect(publicClasses(root)).toEqual([
        'hds-card',
        'hds-card__body',
        'hds-focus',
        'hds-tag',
        'hds-tag--active',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('names hds-focus, which ops uses and theme.css styles', () => {
    expect(DECLARED_PUBLIC_CLASSES).toContain('hds-focus');
    expect(readFileSync(join(REPO, 'src/styles/theme.css'), 'utf8')).toContain('.hds-focus');
  });

  it('is what public/hds-manifest.json lists (scripts/generate-manifest.mjs writes it)', () => {
    const manifest = JSON.parse(readFileSync(join(REPO, 'public/hds-manifest.json'), 'utf8'));
    expect(manifest.publicClasses).toEqual(publicClasses(REPO));
    expect(manifest.publicClasses).toContain('hds-badge');
  });
});
