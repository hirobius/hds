/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readModes, modeValue } from '../lib/token-modes.mjs';

describe('readModes', () => {
  it('returns the mode map stored under com.figma.variables', () => {
    const ext = { 'com.figma.variables': { modes: { Light: '#fff', Dark: '#000' } } };
    expect(readModes(ext)).toEqual({ Light: '#fff', Dark: '#000' });
  });

  it('returns null when the extension carries notes but no modes', () => {
    expect(readModes({ 'com.figma.variables': { note: 'fluid clamp' } })).toBeNull();
    expect(readModes(undefined)).toBeNull();
  });
});

describe('modeValue', () => {
  const token = {
    value: '{primitive.color.white}',
    extensions: { 'com.figma.variables': { modes: { Dark: '{primitive.color.black}' } } },
  };

  it('reads the per-mode value when the token declares one', () => {
    expect(modeValue(token, 'Dark')).toBe('{primitive.color.black}');
  });

  it('falls back to $value for a mode the token does not declare', () => {
    expect(modeValue(token, 'Light')).toBe('{primitive.color.white}');
  });
});
