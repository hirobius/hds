/**
 * StatusListItem stories, dark-mode contrast guard (hds#349).
 *
 * WithTrailing painted a literal white label on the feedback fills, which flip
 * to their 400 stops in dark (1.7-2.8:1). The trailing slot now uses the HDS
 * Badge, whose feedback text/background pair is theme-aware. jsdom cannot
 * compute contrast, so this asserts the structure that guarantees it;
 * scripts/check-storybook-axe.mjs is the rendered check.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import * as stories from './status-list-item.stories';

const source = readFileSync(
  resolve(process.cwd(), 'src/stories/status-list-item.stories.tsx'),
  'utf8',
);

describe('status-list-item stories, theme-safe trailing status (hds#349)', () => {
  it('paints no literal colours (a fixed white label fails contrast on the dark feedback fills)', () => {
    expect(source).not.toMatch(/(?:color|background|foreground)\s*[:=]\s*['"{`]*#[0-9a-fA-F]{3,8}/);
    expect(source).not.toMatch(/color:\s*'(white|black)'/);
  });

  it('WithTrailing renders every trailing status as an HDS Badge on the feedback pair', () => {
    const story = stories.WithTrailing as unknown as { render: () => React.ReactNode };
    const { container } = render(<>{story.render()}</>);
    const items = container.querySelectorAll('[data-tone]:has(> .shrink-0)');
    const trailing = container.querySelectorAll('.shrink-0 > *');
    expect(items.length).toBeGreaterThan(0);
    expect(trailing.length).toBe(3);
    for (const el of trailing) {
      const tone = el.getAttribute('data-tone');
      expect(tone, el.outerHTML).toMatch(/^(success|warning|danger)$/);
      expect(el.classList.contains(`text-feedback-${tone}`)).toBe(true);
      expect(el.classList.contains(`bg-feedback-bg-${tone}`)).toBe(true);
      expect(el.getAttribute('style')).toBeNull();
    }
  });
});
