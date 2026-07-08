/**
 * Tests for HeadingStack — proves the Tailwind + cva migration is a
 * zero-visual-change refactor: each `level` still resolves the same
 * semantic typography tokens the removed LEVEL_STYLES CSSProperties map did.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { HeadingStack, headingStackVariants, headingStackLevelVariants } from './heading-stack';

afterEach(cleanup);

const LEVEL_TOKEN_CLASSES = {
  heading1: [
    '[font-size:var(--semantic-typography-h1-font-size)]',
    '[font-weight:var(--semantic-typography-h1-font-weight)]',
    '[line-height:var(--semantic-typography-h1-line-height)]',
    '[letter-spacing:var(--semantic-typography-h1-letter-spacing)]',
  ],
  heading2: [
    '[font-size:var(--semantic-typography-h2-font-size)]',
    '[font-weight:var(--semantic-typography-h2-font-weight)]',
    '[line-height:var(--semantic-typography-h2-line-height)]',
    '[letter-spacing:var(--semantic-typography-h2-letter-spacing)]',
  ],
  heading3: [
    '[font-size:var(--semantic-typography-h3-font-size)]',
    '[font-weight:var(--semantic-typography-h3-font-weight)]',
    '[line-height:var(--semantic-typography-h3-line-height)]',
    '[letter-spacing:var(--semantic-typography-h3-letter-spacing)]',
  ],
} as const;

describe('HeadingStack', () => {
  it.each(['heading1', 'heading2', 'heading3'] as const)(
    'binds the %s level to the matching semantic typography tokens (cva output)',
    (level) => {
      const classes = headingStackLevelVariants({ level }).split(' ');
      for (const tokenClass of LEVEL_TOKEN_CLASSES[level]) {
        expect(classes).toContain(tokenClass);
      }
      // Never leaks a sibling level's tokens.
      for (const otherLevel of Object.keys(
        LEVEL_TOKEN_CLASSES,
      ) as (keyof typeof LEVEL_TOKEN_CLASSES)[]) {
        if (otherLevel === level) continue;
        for (const tokenClass of LEVEL_TOKEN_CLASSES[otherLevel]) {
          expect(classes).not.toContain(tokenClass);
        }
      }
    },
  );

  it.each(['heading1', 'heading2', 'heading3'] as const)(
    'renders the %s level with the default heading tag and token-bound className',
    (level) => {
      const { container } = render(
        <HeadingStack level={level} heading="Title" subheading="Subtitle" />,
      );
      const defaultTag = { heading1: 'H1', heading2: 'H2', heading3: 'H3' }[level];
      const headingEl = container.querySelector(defaultTag.toLowerCase());
      expect(headingEl).not.toBeNull();
      expect(headingEl?.tagName).toBe(defaultTag);
      expect(headingEl?.textContent).toBe('Title');
      const expectedClassName = headingStackLevelVariants({ level });
      expect(headingEl?.className).toBe(expectedClassName);
    },
  );

  it('defaults gap to px8', () => {
    expect(headingStackVariants({})).toBe(headingStackVariants({ gap: 'px8' }));
  });

  it('binds gap px8 (default) and px4 to their distinct primitive space tokens', () => {
    expect(headingStackVariants({ gap: 'px8' })).toContain('gap-[var(--primitive-space-2)]');
    expect(headingStackVariants({ gap: 'px4' })).toContain('gap-[var(--primitive-space-1)]');
  });

  it('applies the resolved gap className to the root element', () => {
    const { container } = render(
      <HeadingStack level="heading1" heading="Title" subheading="Subtitle" gap="px4" />,
    );
    expect(container.firstElementChild?.className).toBe(headingStackVariants({ gap: 'px4' }));
  });

  it('renders the subheading with the fixed body typography + secondary color tokens', () => {
    const { container } = render(
      <HeadingStack level="heading2" heading="Title" subheading="Subtitle copy" />,
    );
    const subheadingEl = container.querySelector('p');
    expect(subheadingEl?.textContent).toBe('Subtitle copy');
    expect(subheadingEl?.className).toContain(
      '[font-size:var(--semantic-typography-body-font-size)]',
    );
    expect(subheadingEl?.className).toContain(
      'text-[color:var(--semantic-color-content-secondary)]',
    );
  });

  it('respects as / headingAs / subheadingAs tag overrides without altering applied classes', () => {
    const { container } = render(
      <HeadingStack
        level="heading3"
        heading="Title"
        subheading="Subtitle"
        as="section"
        headingAs="h4"
        subheadingAs="span"
      />,
    );
    expect(container.querySelector('section')).not.toBeNull();
    const headingEl = container.querySelector('h4');
    expect(headingEl?.className).toBe(headingStackLevelVariants({ level: 'heading3' }));
    expect(container.querySelector('span')).not.toBeNull();
  });
});
