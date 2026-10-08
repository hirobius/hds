/**
 * Seam under test: `buildTokenSections(tokens, page)` — the build-time generator
 * behind every `{/* generated: tokens *\/}` marker in content/docs (content-model
 * Rule 1: token tables are generated from the token pipeline, never hand-written).
 *
 * Expected values below are worked examples, not recomputed from the code.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildTokenSections,
  cssVarFor,
  resolveTokenValue,
  tokenRow,
} from '../../docs-site/lib/token-tables';

const fixture = {
  primitive: {
    color: { neutral: { white: { $value: '#ffffff' }, 900: { $value: '#171717' } } },
    duration: { short: { $value: { value: 150, unit: 'ms' } } },
    easing: { decelerate: { $value: [0, 0, 0.2, 1] } },
    typography: { family: { mono: { $value: ['IBM Plex Mono', 'monospace'] } } },
  },
  semantic: {
    color: {
      surface: {
        $description: 'Surface group',
        page: {
          $value: '{primitive.color.neutral.white}',
          $description: 'Page background.',
          $extensions: {
            'com.figma.variables': {
              modes: {
                Light: '{primitive.color.neutral.white}',
                Dark: '{primitive.color.neutral.900}',
              },
            },
          },
        },
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
      'IBM Plex Mono, monospace',
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
      darkValue: '#171717',
      description: 'Page background.',
      swatch: true,
    });
  });

  it('leaves darkValue null for a token with no Dark mode', () => {
    const [, content] = buildTokenSections(fixture, 'color');
    expect(content?.rows[0]?.darkValue).toBeNull();
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

describe('tokenRow', () => {
  it('resolves one token by dotted path, with its dark value', () => {
    expect(tokenRow(fixture, 'semantic.color.surface.page')?.darkValue).toBe('#171717');
    expect(tokenRow(fixture, 'primitive.color.neutral.900')?.value).toBe('#171717');
  });

  it('returns null for a path that is not a token, so a stale mapping does not break a page', () => {
    expect(tokenRow(fixture, 'semantic.color.nope')).toBeNull();
    expect(tokenRow(fixture, 'semantic.color.surface')).toBeNull();
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

  it('puts surface.page in the color table at its known light and dark values', () => {
    const rows = buildTokenSections(real, 'color').flatMap((s) => s.rows);
    const page = rows.find((r) => r.token === 'semantic.color.surface.page');
    expect(page?.value).toBe('#ffffff');
    expect(page?.darkValue).toBe('#000000');
  });

  it('never leaves a dark value unresolved', () => {
    for (const row of buildTokenSections(real, 'color').flatMap((s) => s.rows)) {
      if (row.darkValue !== null) expect(row.darkValue).not.toMatch(/[{}]/);
    }
  });
});
