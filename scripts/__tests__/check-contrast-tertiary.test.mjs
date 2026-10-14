import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const tokens = JSON.parse(readFileSync(resolve(root, 'hirobius.tokens.json'), 'utf8'));
// The pairs moved to scripts/lib/contrast-pairs.mjs (ops#681); check-contrast.mjs imports them.
const script = readFileSync(resolve(root, 'scripts/lib/contrast-pairs.mjs'), 'utf8');

describe('content.tertiary contrast gate (hds#663)', () => {
  it('defines semantic.color.content.tertiary with Light and Dark modes', () => {
    const node = tokens.semantic.color.content.tertiary;
    expect(node).toBeDefined();
    const modes = node.$extensions['com.figma.variables'].modes;
    expect(modes.Light).toMatch(/^\{primitive\./);
    expect(modes.Dark).toMatch(/^\{primitive\./);
  });

  it('registers tertiary against page and raised in check-contrast', () => {
    expect(script).toContain("'semantic.color.content.tertiary'");
    expect(script).toContain('content.tertiary / surface.page');
    expect(script).toContain('content.tertiary / surface.raised');
  });

  it('passes the contrast gate', () => {
    expect(() => execFileSync('node', ['scripts/check-contrast.mjs'], { cwd: root })).not.toThrow();
  });
});

describe('content.secondary on surface.sunken contrast gate (hds#730)', () => {
  it('registers secondary against the sunken well in check-contrast', () => {
    expect(script).toContain('content.secondary / surface.sunken');
    expect(script).toContain("'semantic.color.surface.sunken'");
  });

  it('keeps dark secondary text at or above 4.5:1 on dark sunken', () => {
    const out = execFileSync('node', ['scripts/check-contrast.mjs'], { cwd: root }).toString();
    const row = out.split('\n').find((l) => l.includes('content.secondary / surface.sunken'));
    expect(row).toBeDefined();
    expect(row).toMatch(/✓\/✓/);
  });
});
