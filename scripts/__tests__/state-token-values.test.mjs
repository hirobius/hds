/**
 * hds#595 decisions 1-4: the state tokens that now win over code.
 * Resolved values in Light and Dark, per-tone badge tokens, deprecated flat badge vars.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTokenResolver } from '../lib/component-token-binding.mjs';

const tree = JSON.parse(readFileSync(join(process.cwd(), 'hirobius.tokens.json'), 'utf8'));
const r = createTokenResolver(tree);
const both = (path) => [r.resolveToken(path, 'Light'), r.resolveToken(path, 'Dark')];
const TONES = ['neutral', 'info', 'success', 'danger', 'warning', 'inProgress'];
const FEEDBACK = {
  info: 'info',
  success: 'success',
  danger: 'error',
  warning: 'warning',
  inProgress: 'inProgress',
};

describe('button state tokens', () => {
  it('bgHover resolves to the accent hover token', () => {
    expect(both('component.button.bgHover')).toEqual(both('semantic.accent.hover'));
  });
  it('secondary pressed fill resolves to surface.overlay', () => {
    expect(both('component.button.secondary.bg.pressed')).toEqual(
      both('semantic.color.surface.overlay'),
    );
  });
  it('secondary disabled border resolves to border.subdued, lighter than the rest border', () => {
    expect(both('component.button.secondary.border.disabled')).toEqual(
      both('semantic.color.border.subdued'),
    );
    expect(both('component.button.secondary.border.disabled')).not.toEqual(
      both('component.button.secondary.border.rest'),
    );
  });
});

describe('badge per-tone tokens', () => {
  for (const tone of TONES) {
    it(`${tone} has bg and text`, () => {
      expect(r.has(`component.badge.${tone}.bg`)).toBe(true);
      expect(r.has(`component.badge.${tone}.text`)).toBe(true);
    });
  }
  for (const [tone, fb] of Object.entries(FEEDBACK)) {
    it(`${tone} values equal what the tone renders (feedback.${fb})`, () => {
      expect(both(`component.badge.${tone}.bg`)).toEqual(both(`semantic.color.feedback.bg.${fb}`));
      expect(both(`component.badge.${tone}.text`)).toEqual(both(`semantic.color.feedback.${fb}`));
    });
  }
  it('neutral uses surface.overlay fill and content.secondary text', () => {
    expect(both('component.badge.neutral.bg')).toEqual(both('semantic.color.surface.overlay'));
    expect(both('component.badge.neutral.text')).toEqual(both('semantic.color.content.secondary'));
  });
  it('the flat badge.bg / badge.text are deprecated with a pointer to the per-tone tokens', () => {
    for (const leaf of ['bg', 'text']) {
      const node = r.flat.get(`component.badge.${leaf}`);
      expect(node.$deprecated).toMatch(/component\.badge\.<tone>\./);
    }
  });
});
