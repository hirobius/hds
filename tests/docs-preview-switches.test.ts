import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACCENTS,
  CORNERS,
  SHADOWS,
  STORAGE_KEY,
  applySwitches,
  parseSwitches,
  readSwitches,
  writeSwitches,
  // @ts-expect-error -- docs-site is outside the root tsconfig include; vitest resolves it.
} from '../docs-site/lib/preview-switches';

describe('docs preview switches', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-docs-corners');
    document.documentElement.removeAttribute('data-docs-shadow');
    document.documentElement.removeAttribute('data-accent');
  });

  it('defaults to rounded + soft (today)', () => {
    expect(parseSwitches(null)).toEqual({ corners: 'rounded', shadow: 'soft', accent: 'graphite' });
  });

  it('ignores junk and keeps valid halves', () => {
    expect(parseSwitches('{"corners":"sharp","shadow":"neon"}')).toEqual({
      corners: 'sharp',
      shadow: 'soft',
      accent: 'graphite',
    });
    expect(parseSwitches('not json')).toEqual({
      corners: 'rounded',
      shadow: 'soft',
      accent: 'graphite',
    });
  });

  it('exposes the allowed values', () => {
    expect(CORNERS).toEqual(['rounded', 'sharp']);
    expect(SHADOWS).toEqual(['soft', 'hard']);
    expect(ACCENTS).toEqual(['graphite', 'cobalt']);
  });

  it('Accent drives the package accent dial: data-accent on the root, graphite = unset (hds#857)', () => {
    applySwitches({ corners: 'rounded', shadow: 'soft', accent: 'cobalt' });
    expect(document.documentElement.getAttribute('data-accent')).toBe('cobalt');
    applySwitches({ corners: 'rounded', shadow: 'soft', accent: 'graphite' });
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

  it('applies to the root as docs-only attributes, unsetting defaults', () => {
    applySwitches({ corners: 'sharp', shadow: 'hard', accent: 'cobalt' });
    expect(document.documentElement.dataset.docsCorners).toBe('sharp');
    expect(document.documentElement.dataset.docsShadow).toBe('hard');
    applySwitches({ corners: 'rounded', shadow: 'soft', accent: 'graphite' });
    expect(document.documentElement.hasAttribute('data-docs-corners')).toBe(false);
    expect(document.documentElement.hasAttribute('data-docs-shadow')).toBe(false);
  });

  it('round-trips through localStorage', () => {
    writeSwitches({ corners: 'sharp', shadow: 'hard', accent: 'cobalt' });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('sharp');
    expect(readSwitches()).toEqual({ corners: 'sharp', shadow: 'hard', accent: 'cobalt' });
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
      expect(readSwitches()).toEqual({ corners: 'rounded', shadow: 'soft', accent: 'graphite' });
      expect(() =>
        writeSwitches({ corners: 'sharp', shadow: 'hard', accent: 'cobalt' }),
      ).not.toThrow();
    } finally {
      Storage.prototype.getItem = orig;
      Storage.prototype.setItem = origSet;
    }
  });
});

describe('docs preview switches stay docs-only (hds#794)', () => {
  it('no data-docs-* selector or attribute appears under src/ (shipped styles.css)', async () => {
    const { execSync } = await import('node:child_process');
    const hits = execSync("grep -rlE 'data-docs-(corners|shadow)|hds-docs-switches' src || true", {
      encoding: 'utf8',
    }).trim();
    expect(hits).toBe('');
  });
});
