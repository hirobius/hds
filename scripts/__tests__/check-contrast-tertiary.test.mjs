import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const tokens = JSON.parse(readFileSync(resolve(root, 'hirobius.tokens.json'), 'utf8'));
const script = readFileSync(resolve(root, 'scripts/check-contrast.mjs'), 'utf8');

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
