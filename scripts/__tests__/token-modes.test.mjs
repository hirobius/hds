/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { readModes, modeValue } from '../lib/token-modes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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

// Regression guard: the Figma exporter and verify-tokens both once read a
// retired namespace, so every Figma Dark value equalled Light. Nothing outside
// the shared reader may spell a mode path out again.
describe('no script reads the retired mode namespace', () => {
  const RETIRED = ['com', 'hirobius', 'modes'].join('.');

  function* sourceFiles(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      if (entry.name.startsWith('_retired-') || entry.name === 'poc') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) yield* sourceFiles(full);
      else if (/\.(mjs|js|ts)$/.test(entry.name)) yield full;
    }
  }

  it('finds no reference in scripts/ or validators/', () => {
    const offenders = [join(ROOT, 'scripts'), join(ROOT, 'validators')]
      .flatMap((dir) => [...sourceFiles(dir)])
      .filter((file) => readFileSync(file, 'utf8').includes(RETIRED))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
