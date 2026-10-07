/**
 * Seam under test: `buildTokenSections(tokens, page)` — the build-time generator
 * behind every `{/* generated: tokens *\/}` marker in content/docs (content-model
 * Rule 1: token tables are generated from the token pipeline, never hand-written).
 *
 * Expected values below are worked examples, not recomputed from the code.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildTokenSections, cssVarFor, resolveTokenValue } from '../../docs-site/lib/token-tables';

const fixture = {
  primitive: {
    color: { neutral: { white: { $value: '#ffffff' }, 900: { $value: '#171717' } } },
    duration: { short: { $value: { value: 150, unit: 'ms' } } },
    easing: { decelerate: { $value: [0, 0, 0.2, 1] } },
    typography: { family: { mono: { $value: ['Geist Mono', 'monospace'] } } },
  },
  semantic: {
    color: {
      surface: {
        $description: 'Surface group',
        page: { $value: '{primitive.color.neutral.white}', $description: 'Page background.' },
      },
      content: { primary: { $value: '{primitive.color.neutral.900}' } },
    },
    space: { scale: { sm: { $value: '{primitive.space.4}' } } },
    motion: {
      productive: {
        $value: { duration: '{primitive.duration.short}', easing: '{primitive.easing.decelerate}' },
        $description: 'Micro-interactions.',
      },
    },
  },
};

describe('cssVarFor', () => {
  it('joins the path with dashes under the -- prefix', () => {
    expect(cssVarFor('semantic.color.surface.page')).toBe('--semantic-color-surface-page');
  });

  it('keeps camelCase segments verbatim, as the CSS build emits them', () => {
    expect(cssVarFor('semantic.color.content.onAccent')).toBe('--semantic-color-content-onAccent');
  });
});

describe('resolveTokenValue', () => {
  it('follows alias references to the primitive value', () => {
    expect(resolveTokenValue(fixture, '{primitive.color.neutral.white}')).toBe('#ffffff');
  });

  it('renders dimension and duration objects as value+unit', () => {
    expect(resolveTokenValue(fixture, { value: 150, unit: 'ms' })).toBe('150ms');
  });

  it('renders arrays as comma lists (font stacks, cubic-beziers)', () => {
    expect(resolveTokenValue(fixture, '{primitive.typography.family.mono}')).toBe(
      'Geist Mono, monospace',
    );
  });

  it('renders composite tokens as resolved key: value pairs', () => {
    expect(resolveTokenValue(fixture, fixture.semantic.motion.productive.$value)).toBe(
      'duration: 150ms; easing: 0, 0, 0.2, 1',
    );
  });

  it('fails loud on a dangling reference, naming it', () => {
    expect(() => resolveTokenValue(fixture, '{primitive.nope}')).toThrow(/primitive\.nope/);
  });
});

describe('buildTokenSections', () => {
  it('groups color tokens by their first path segment, with resolved value and variable', () => {
    const sections = buildTokenSections(fixture, 'color');
    expect(sections.map((s) => s.title)).toEqual(['Surface', 'Content']);
    expect(sections[0]?.rows[0]).toEqual({
      token: 'semantic.color.surface.page',
      cssVar: '--semantic-color-surface-page',
      value: '#ffffff',
      description: 'Page background.',
      swatch: true,
    });
  });

  it('marks only color rows as swatches', () => {
    const [motion] = buildTokenSections(fixture, 'motion');
    expect(motion?.rows[0]?.swatch).toBe(false);
    // composites have no single CSS variable
    expect(motion?.rows[0]?.cssVar).toBeNull();
    expect(motion?.rows[0]?.value).toBe('duration: 150ms; easing: 0, 0, 0.2, 1');
  });

  it('rejects an unknown page so a stray marker breaks the build instead of rendering nothing', () => {
    expect(() => buildTokenSections(fixture, 'button')).toThrow(/button/);
  });
});

describe('against the real hirobius.tokens.json', () => {
  const real = JSON.parse(readFileSync('hirobius.tokens.json', 'utf8'));

  it.each(['color', 'spacing', 'typography', 'motion'])(
    'resolves every %s token without dangling references',
    (page) => {
      const sections = buildTokenSections(real, page);
      const rows = sections.flatMap((s) => s.rows);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row.value).not.toMatch(/[{}]/);
    },
  );

  it('puts surface.page in the color table at its known light value', () => {
    const rows = buildTokenSections(real, 'color').flatMap((s) => s.rows);
    expect(rows.find((r) => r.token === 'semantic.color.surface.page')?.value).toBe('#ffffff');
  });
});
