import { describe, it, expect, beforeEach } from 'vitest';
import {
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
  });

  it('defaults to rounded + soft (today)', () => {
    expect(parseSwitches(null)).toEqual({ corners: 'rounded', shadow: 'soft' });
  });

  it('ignores junk and keeps valid halves', () => {
    expect(parseSwitches('{"corners":"sharp","shadow":"neon"}')).toEqual({
      corners: 'sharp',
      shadow: 'soft',
    });
    expect(parseSwitches('not json')).toEqual({ corners: 'rounded', shadow: 'soft' });
  });

  it('exposes the allowed values', () => {
    expect(CORNERS).toEqual(['rounded', 'sharp']);
    expect(SHADOWS).toEqual(['soft', 'hard']);
  });

  it('applies to the root as docs-only attributes, unsetting defaults', () => {
    applySwitches({ corners: 'sharp', shadow: 'hard' });
    expect(document.documentElement.dataset.docsCorners).toBe('sharp');
    expect(document.documentElement.dataset.docsShadow).toBe('hard');
    applySwitches({ corners: 'rounded', shadow: 'soft' });
    expect(document.documentElement.hasAttribute('data-docs-corners')).toBe(false);
    expect(document.documentElement.hasAttribute('data-docs-shadow')).toBe(false);
  });

  it('round-trips through localStorage', () => {
    writeSwitches({ corners: 'sharp', shadow: 'hard' });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('sharp');
    expect(readSwitches()).toEqual({ corners: 'sharp', shadow: 'hard' });
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
      expect(readSwitches()).toEqual({ corners: 'rounded', shadow: 'soft' });
      expect(() => writeSwitches({ corners: 'sharp', shadow: 'hard' })).not.toThrow();
    } finally {
      Storage.prototype.getItem = orig;
      Storage.prototype.setItem = origSet;
    }
  });
});
