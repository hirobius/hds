import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACCENTS,
  DENSITIES,
  STORAGE_KEY,
  applySwitches,
  parseSwitches,
  readSwitches,
  writeSwitches,
  // @ts-expect-error -- docs-site is outside the root tsconfig include; vitest resolves it.
} from '../docs-site/lib/preview-switches';
// @ts-expect-error -- docs-site is outside the root tsconfig include; vitest resolves it.
import * as switches from '../docs-site/lib/preview-switches';

/**
 * Docs display settings (hds#794): the gear holds the package's own dials only, Accent and
 * Density. The docs-only Corners and Shadow previews were removed (Adrian, 2026-11-05): the
 * library never shipped them.
 */
describe('docs display settings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-accent');
    document.documentElement.removeAttribute('data-density');
  });

  it('holds Accent and Density only', () => {
    expect(parseSwitches(null)).toEqual({ accent: 'graphite', density: 'comfortable' });
    expect(switches).not.toHaveProperty('CORNERS');
    expect(switches).not.toHaveProperty('SHADOWS');
  });

  it('ignores junk, old Corners/Shadow keys included, and keeps valid values', () => {
    expect(parseSwitches('{"corners":"sharp","shadow":"hard","accent":"cobalt"}')).toEqual({
      accent: 'cobalt',
      density: 'comfortable',
    });
    expect(parseSwitches('{"accent":"neon"}')).toEqual({
      accent: 'graphite',
      density: 'comfortable',
    });
    expect(parseSwitches('not json')).toEqual({ accent: 'graphite', density: 'comfortable' });
  });

  it('exposes the allowed values', () => {
    expect(ACCENTS).toEqual(['graphite', 'cobalt']);
    expect(DENSITIES).toEqual(['comfortable', 'compact']);
  });

  it('Density drives the package density dial: data-density on the root, comfortable = unset', () => {
    applySwitches({ accent: 'graphite', density: 'compact' });
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
    applySwitches({ accent: 'graphite', density: 'comfortable' });
    expect(document.documentElement.hasAttribute('data-density')).toBe(false);
  });

  it('Accent drives the package accent dial: data-accent on the root, graphite = unset (hds#857)', () => {
    applySwitches({ accent: 'cobalt', density: 'comfortable' });
    expect(document.documentElement.getAttribute('data-accent')).toBe('cobalt');
    applySwitches({ accent: 'graphite', density: 'comfortable' });
    expect(document.documentElement.hasAttribute('data-accent')).toBe(false);
  });

  it('every non-default accent is a shipped data-accent overlay that sets the content accent', () => {
    const accents = readFileSync('src/styles/accents.css', 'utf8');
    for (const a of ACCENTS.filter((x: string) => x !== 'graphite')) {
      const rule = new RegExp(
        `\\[data-accent='${a}'\\]\\s*\\{[^}]*--semantic-color-content-accent:`,
      );
      expect(accents).toMatch(rule);
    }
  });

  it('no docs-only Corners or Shadow preview rule is left in the docs CSS', () => {
    const css = readFileSync('docs-site/app/globals.css', 'utf8');
    expect(css).not.toMatch(/data-docs-(corners|shadow)/);
  });

  it('round-trips through localStorage', () => {
    writeSwitches({ accent: 'cobalt', density: 'compact' });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('cobalt');
    expect(readSwitches()).toEqual({ accent: 'cobalt', density: 'compact' });
  });

  it('survives blocked storage', () => {
    const orig = Storage.prototype.getItem;
    const origSet = Storage.prototype.setItem;
    Storage.prototype.getItem = () => {
      throw new Error('blocked');
    };
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    try {
      expect(readSwitches()).toEqual({ accent: 'graphite', density: 'comfortable' });
      expect(() => writeSwitches({ accent: 'cobalt', density: 'comfortable' })).not.toThrow();
    } finally {
      Storage.prototype.getItem = orig;
      Storage.prototype.setItem = origSet;
    }
  });
});
