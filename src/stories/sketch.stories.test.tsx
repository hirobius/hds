/**
 * Sketch stories, accessible-name guard (hds#349).
 *
 * WithControls put a bare range input in the controls slot. A visible caption
 * beside an input does not name it, so axe reported a critical `label`
 * violation in light and dark.
 */
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import * as stories from './sketch.stories';

describe('sketch stories, control naming (hds#349)', () => {
  it('WithControls gives the range control an accessible name', () => {
    const story = stories.WithControls as {
      args: React.ComponentProps<typeof stories.default.component>;
      render: (args: unknown, ctx: unknown) => React.ReactNode;
    };
    render(<>{story.render(story.args, { args: story.args })}</>);
    expect(screen.getByRole('slider', { name: 'Speed' })).toBeTruthy();
  });

  it.each(Object.keys(stories).filter((k) => k !== 'default'))(
    '%s leaves no form control without an accessible name',
    (name) => {
      const story = (stories as Record<string, unknown>)[name] as {
        args: React.ComponentProps<typeof stories.default.component>;
        render: (args: unknown, ctx: unknown) => React.ReactNode;
      };
      const { container } = render(<>{story.render(story.args, { args: story.args })}</>);
      for (const el of container.querySelectorAll('input, select, textarea')) {
        const named =
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.closest('label') ||
          (el.id && container.querySelector(`label[for="${el.id}"]`));
        expect(named, el.outerHTML).toBeTruthy();
      }
    },
  );
});
