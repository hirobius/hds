/**
 * Contract test: the hero type role, a marketing-only extension above display
 * (ADR-052 addendum, 2026-11-05).
 *
 * Pins the primitive size, the composite (Sora 700, tight tracking, 1.05
 * leading), and that the Figma model emits it as the text style
 * `typography/hero` so a sync creates it.
 *
 * @unit ADR-052
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
// @ts-expect-error — untyped .mjs module
import { buildFigmaModel } from '../../../scripts/lib/figma-model.mjs';

const ROOT = resolve(__dirname, '../../..');
const tokens = JSON.parse(readFileSync(resolve(ROOT, 'hirobius.tokens.json'), 'utf8'));
const hero = tokens.semantic.typography.hero;
const display = tokens.semantic.typography.display;

describe('hero type role (ADR-052 addendum)', () => {
  it('has a 120px primitive size, a step above display', () => {
    expect(tokens.primitive.typography.size.hero.$value).toEqual({ value: 120, unit: 'px' });
    expect(tokens.primitive.typography.size.display.$value.value).toBeLessThan(120);
  });

  it('is display set larger: same family, weight and tracking, 1.05 leading', () => {
    expect(hero.$value).toEqual({
      fontFamily: '{primitive.typography.family.display}',
      fontSize: '{primitive.typography.size.hero}',
      fontWeight: '{primitive.typography.weight.display}',
      letterSpacing: display.$value.letterSpacing,
      lineHeight: '{primitive.typography.lineHeight.display}',
    });
    expect(tokens.primitive.typography.lineHeight.display.$value).toBe(1.05);
  });

  it('is marked as a marketing-only extension', () => {
    expect(hero.$description).toMatch(/^Marketing-only/);
  });

  it('emits the Figma text style typography/hero at 120px Sora Bold', () => {
    const model = buildFigmaModel(tokens);
    const style = model.textStyles.find((s: { name: string }) => s.name === 'typography/hero');
    expect(style).toBeDefined();
    expect(style.path).toBe('semantic.typography.hero');
    expect(style.fontSize).toBe(120);
    expect(style.fontWeight).toBe(700);
    expect(style.fontFamily).toBe('Sora');
    expect(style.lineHeight).toEqual({ unit: 'PIXELS', value: 126 });
  });
});
