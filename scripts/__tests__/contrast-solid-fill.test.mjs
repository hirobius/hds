// hds#1011: extractFg/extractBg share one solid-fill reader in validators/contrast.mjs.
import { describe, it, expect } from 'vitest';
import { solidFillHex } from '../../validators/contrast.mjs';

describe('solidFillHex', () => {
  it('returns the first SOLID fill as a raw (token-less) hex', () => {
    const fills = [{ type: 'GRADIENT' }, { type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    expect(solidFillHex(fills)).toEqual({ hex: '#ffffff', tokenPath: null });
  });
  it('returns null for no solid fill or non-array input', () => {
    expect(solidFillHex([{ type: 'SOLID' }])).toBeNull();
    expect(solidFillHex(undefined)).toBeNull();
  });
});
