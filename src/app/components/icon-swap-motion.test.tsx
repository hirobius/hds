/**
 * hds#751 (components: swap): when CodeBlock's copy icon swaps to a check,
 * the new icon pops in (fade + scale) on --hds-anim-appear: the productive
 * duration with the expressive easing. The keyed wrapper remounts on each
 * swap so the animation replays. theme.css zeroes the duration and drops the
 * animation under prefers-reduced-motion.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from './code-block';

afterEach(cleanup);

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');

function swapOf(button: HTMLElement) {
  return button.querySelector('.hds-icon-swap');
}

describe('CodeBlock copy icon swap (hds#751)', () => {
  for (const variant of ['block', 'inline'] as const) {
    it(`remounts a swap wrapper when the ${variant} copy icon changes`, async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });
      render(<CodeBlock code="pnpm i" variant={variant} />);
      const before = swapOf(screen.getByRole('button', { name: 'Copy code' }));
      expect(before).not.toBeNull();
      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy());
      const after = swapOf(screen.getByRole('button', { name: 'Copied' }));
      expect(after).not.toBeNull();
      expect(after).not.toBe(before);
    });
  }

  it('animates the swap on the appear token, never a raw value', () => {
    const rule = theme.match(/\.hds-icon-swap \{[^}]*\}/);
    expect(rule?.[0]).toContain('animation: hds-icon-swap var(--hds-anim-appear)');
    expect(theme).toMatch(/@keyframes hds-icon-swap \{/);
  });

  it('drops the swap animation under prefers-reduced-motion', () => {
    expect(theme).toMatch(
      /\(prefers-reduced-motion: reduce\) \{\s*\.hds-icon-swap \{\s*animation: none;/,
    );
  });
});
