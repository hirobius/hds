/**
 * StatusTile stories, dark-mode contrast guard (hds#349).
 *
 * The feedback fills flip to their 400 stops in dark, so a hand-rolled label
 * with a literal white foreground fell to 1.7-2.8:1 there. The trailing slot
 * now uses the HDS Badge, whose feedback text/background pair is the
 * theme-aware one. jsdom cannot compute contrast, so this asserts the
 * structure that guarantees it; scripts/check-storybook-axe.mjs is the
 * rendered check (light and dark, no allowlist entry).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import * as stories from './status-tile.stories';

const source = readFileSync(resolve(process.cwd(), 'src/stories/status-tile.stories.tsx'), 'utf8');

type Story = { args?: Record<string, unknown>; render?: (args: unknown, ctx: unknown) => unknown };

function mount(story: Story) {
  const Component = stories.default.component as React.ComponentType<Record<string, unknown>>;
  const args = story.args ?? {};
  return render(
    story.render ? (
      <>{story.render(args, { args }) as React.ReactNode}</>
    ) : (
      <Component {...(args as { title: string })} />
    ),
  );
}

describe('status-tile stories, theme-safe trailing status (hds#349)', () => {
  it('paints no literal colours (a fixed white label fails contrast on the dark feedback fills)', () => {
    expect(source).not.toMatch(/(?:color|background|foreground)\s*[:=]\s*['"{`]*#[0-9a-fA-F]{3,8}/);
    expect(source).not.toMatch(/color:\s*'(white|black)'/);
  });

  it.each(['WithTrailingBadge', 'Warning', 'Danger', 'InGrid'] as const)(
    '%s renders every trailing status as an HDS Badge on the feedback pair',
    (name) => {
      const { container } = mount(stories[name] as Story);
      const trailing = container.querySelectorAll(
        '[data-hds-component="StatusTile"] .shrink-0 > *',
      );
      expect(trailing.length).toBeGreaterThan(0);
      for (const el of trailing) {
        const tone = el.getAttribute('data-tone');
        expect(tone, el.outerHTML).toMatch(/^(success|warning|danger)$/);
        expect(el.classList.contains(`text-feedback-${tone}`)).toBe(true);
        expect(el.classList.contains(`bg-feedback-bg-${tone}`)).toBe(true);
        expect(el.getAttribute('style')).toBeNull();
      }
    },
  );
});
