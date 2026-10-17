/**
 * Seam under test: the data builders behind the Foundations galleries
 * (docs-site/lib/foundation-visuals.ts). They read the real token file, so the
 * assertions are structural plus a few worked values that would only change
 * with a deliberate token edit.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  colorGalleries,
  elevationLevels,
  motionTokens,
  radiusScales,
  spaceScales,
  typeSpecimens,
} from '../../docs-site/lib/foundation-visuals';

const tokens = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));

describe('colorGalleries', () => {
  const [primitives, semantic] = colorGalleries(tokens);

  it('groups primitives first, then semantic & state', () => {
    expect(primitives!.title).toBe('Primitives');
    expect(semantic!.title).toBe('Semantic & state');
  });

  it('leaves tenant brand ramps out of the shared gallery', () => {
    expect(primitives!.groups.map((g) => g.title)).not.toContain('ProjectBrand');
  });

  it('carries light and dark values for themed semantic tokens', () => {
    const surface = semantic!.groups.find((g) => g.title === 'Surface')!;
    const page = surface.swatches.find((s) => s.token === 'semantic.color.surface.page')!;
    expect(page.cssVar).toBe('--semantic-color-surface-page');
    expect(page.value).not.toBe(page.darkValue);
    expect(page.darkValue).not.toBeNull();
  });

  it('includes the accent group and only colour values', () => {
    expect(semantic!.groups.map((g) => g.title)).toContain('Accent');
    for (const g of [...primitives!.groups, ...semantic!.groups]) {
      for (const s of g.swatches) expect(s.value).toMatch(/^(#|rgb|hsl|oklch)/i);
    }
  });
});

describe('colorGalleries accent themes', () => {
  const cobalt = JSON.parse(readFileSync('accents/cobalt/tokens.json', 'utf8'));
  const galleries = colorGalleries(tokens, { cobalt });
  const themes = galleries.find((g) => g.title === 'Accent themes')!;
  const group = (title: string) => themes.groups.find((g) => g.title.startsWith(title))!;
  const value = (title: string, token: string) =>
    group(title).swatches.find((s) => s.token === token)!;

  it('shows graphite, cobalt and the lime delight swatches side by side', () => {
    expect(themes.groups.map((g) => g.title.split(' ')[0])).toEqual([
      'Graphite',
      'Cobalt',
      'Delight',
    ]);
  });

  it('resolves cobalt from its overlay, in light and dark', () => {
    const rest = value('Cobalt', 'semantic.accent.rest');
    expect(rest.value).toBe('#112de8');
    expect(rest.darkValue).toBe('#8a97f8');
    expect(value('Graphite', 'semantic.accent.rest').value).toBe('#4a4146');
  });

  it('keeps delight out of the semantic Accent group', () => {
    const semantic = galleries.find((g) => g.title === 'Semantic & state')!;
    const accent = semantic.groups.find((g) => g.title === 'Accent')!;
    expect(accent.swatches.some((s) => s.token.includes('.delight.'))).toBe(false);
    expect(value('Delight', 'semantic.accent.delight.base').value).toBe('#b8e62e');
  });
});

describe('typeSpecimens', () => {
  const specimens = typeSpecimens(tokens);

  it('lists the live ramp in order and skips deprecated aliases', () => {
    expect(specimens.map((s) => s.role)).toEqual([
      'display',
      'title',
      'titleSm',
      'body',
      'ui',
      'caption',
      'mono',
    ]);
  });

  it('resolves each composite to renderable CSS values', () => {
    const display = specimens[0]!;
    expect(display.family).toBe('Plus Jakarta Sans');
    expect(display.fontSize).toMatch(/px$/);
    expect(display.fontWeight).toBe('700');
    expect(display.letterSpacing).toMatch(/em$/);
  });
});

describe('dimension scales', () => {
  it('draws the semantic spacing scale in source order and primitives by size', () => {
    const [scale, primitive] = spaceScales(tokens);
    expect(scale!.steps.map((s) => s.name)).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
    const px = primitive!.steps.map((s) => s.px);
    expect(px).toEqual([...px].sort((a, b) => a - b));
    expect(scale!.steps[0]!.cssVar).toBe('--semantic-space-scale-xs');
  });

  it('draws radius roles and primitive steps', () => {
    const [roles, primitive] = radiusScales(tokens);
    expect(roles!.steps.map((s) => s.name)).toEqual(['action', 'control']);
    expect(primitive!.steps.at(-1)!.name).toBe('full');
  });
});

describe('elevationLevels', () => {
  it('maps each level to live CSS variables', () => {
    const levels = elevationLevels(tokens);
    expect(levels.map((l) => l.name)).toEqual(['flat', 'raised', 'floating', 'overlay']);
    expect(levels[0]!.shadow).toBeNull();
    expect(levels[0]!.border).toBe('var(--semantic-color-border-subtle)');
    expect(levels[1]!.shadow).toBe('var(--semantic-shadow-subtle)');
    expect(levels[1]!.shadowToken).toBe('semantic.shadow.subtle');
  });
});

describe('motionTokens', () => {
  it('builds a valid timing function from the curve, never the spring var', () => {
    const motion = motionTokens(tokens);
    expect(motion.map((m) => m.name)).toEqual(['productive', 'expressive', 'spatial', 'exit']);
    for (const m of motion) expect(m.easing).toMatch(/^cubic-bezier\(/);
    expect(motion[0]!.durationVar).toBe('--primitive-duration-short');
    expect(motion[0]!.duration).toBe('150ms');
  });
});
