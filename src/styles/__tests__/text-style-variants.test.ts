/**
 * Contract test: the two text-style variants that keep Figma's styles 1:1 with
 * code (ADR-052 addendum, 2026-11-05).
 *
 * - bodyStrong: body at weight bold (700), what `<Text variant="body" weight="bold">` renders.
 * - uiRegular: ui at weight regular (400), what Table body cells render (hds#1198).
 * - uiItalic: ui in italic, what EmptyState's inline `hds-type-ui italic` renders.
 *
 * Each is its role with one property changed, and the Figma model emits each as
 * a text style (typography/bodyStrong, typography/uiRegular, typography/uiItalic).
 *
 * @unit ADR-052
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — untyped .mjs module
import { buildFigmaModel } from '../../../scripts/lib/figma-model.mjs';
import { repoFile } from './style-test-helpers';

const tokens = JSON.parse(repoFile('hirobius.tokens.json'));
const typo = tokens.semantic.typography;
const model = buildFigmaModel(tokens);
const style = (name: string) =>
  model.textStyles.find((s: { name: string }) => s.name === `typography/${name}`);

describe('bodyStrong (ADR-052 addendum)', () => {
  it('is body with fontWeight bold (700), Compact mode included', () => {
    expect(typo.bodyStrong.$value).toEqual({
      ...typo.body.$value,
      fontWeight: '{primitive.typography.weight.bold}',
    });
    expect(tokens.primitive.typography.weight.bold.$value).toBe(700);
    expect(typo.bodyStrong.$extensions).toEqual(typo.body.$extensions);
  });

  it('matches the weight Text weight="bold" sets', () => {
    expect(repoFile('src/app/components/text.tsx')).toContain(
      // tier-ok: asserts the string Text ships, not a style
      "bold: '[font-weight:var(--primitive-typography-weight-bold)]'",
    );
  });

  it('emits typography/bodyStrong at body size and leading, Bold', () => {
    const s = style('bodyStrong');
    const body = style('body');
    expect(s).toBeDefined();
    expect(s.fontWeight).toBe(700);
    expect(s.fontStyle).toBe('Bold');
    expect([s.fontFamily, s.fontSize, s.lineHeight]).toEqual([
      body.fontFamily,
      body.fontSize,
      body.lineHeight,
    ]);
  });
});

describe('uiRegular (ADR-052 addendum, hds#1198)', () => {
  it('is ui with fontWeight regular (400), Compact mode included', () => {
    expect(typo.uiRegular.$value).toEqual({
      ...typo.ui.$value,
      fontWeight: '{primitive.typography.weight.regular}',
    });
    expect(tokens.primitive.typography.weight.regular.$value).toBe(400);
    expect(typo.uiRegular.$extensions).toEqual(typo.ui.$extensions);
  });

  it('is what Table body cells render', () => {
    const src = repoFile('src/app/components/table.tsx');
    expect(src).toContain('const BODY_TEXT: CSSProperties = hds.typeStyles.uiRegular;');
  });

  it('ships --semantic-typography-uiRegular-* in CSS at weight regular', () => {
    expect(repoFile('src/styles/tokens.generated.css')).toContain(
      // tier-ok: asserts the line the CSS emitter writes, not a style
      '--semantic-typography-uiRegular-font-weight: var(--primitive-typography-weight-regular);',
    );
  });

  it('emits typography/uiRegular at ui size and leading, Regular', () => {
    const s = style('uiRegular');
    const ui = style('ui');
    expect(s).toBeDefined();
    expect(s.fontWeight).toBe(400);
    expect(s.fontStyle).toBe('Regular');
    expect([s.fontFamily, s.fontSize, s.lineHeight]).toEqual([
      ui.fontFamily,
      ui.fontSize,
      ui.lineHeight,
    ]);
  });
});

describe('uiItalic (ADR-052 addendum)', () => {
  it('is ui with fontStyle italic, Compact mode included', () => {
    expect(typo.uiItalic.$value).toEqual({ ...typo.ui.$value, fontStyle: 'italic' });
    expect(typo.uiItalic.$extensions).toEqual(typo.ui.$extensions);
  });

  it('matches what EmptyState renders inline', () => {
    const src = repoFile('src/app/components/empty-state.tsx');
    expect(src).toContain("isItalic ? 'italic' : 'not-italic'");
    expect(src).toContain('hds-type-ui');
  });

  it('ships font-style italic in CSS and the JS style object', () => {
    expect(repoFile('src/styles/tokens.generated.css')).toContain(
      '--semantic-typography-uiItalic-font-style: italic;',
    );
    expect(repoFile('src/app/design-system/generated-token-refs.ts')).toContain(
      'fontStyle: "var(--semantic-typography-uiItalic-font-style)"',
    );
  });

  it('emits typography/uiItalic as the ui style, upright: Sora has no italic face', () => {
    const s = style('uiItalic');
    const ui = style('ui');
    expect(s).toBeDefined();
    expect(s.fontFamily).toBe('Sora');
    expect(s.fontStyle).toBe(ui.fontStyle);
    expect([s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight]).toEqual([
      ui.fontFamily,
      ui.fontSize,
      ui.fontWeight,
      ui.lineHeight,
    ]);
  });
});
