/**
 * hds#751 (components: check / swap): InlineCode's Copy -> Check glyph swap is
 * a token-timed crossfade, so the copy confirmation reads as a response rather
 * than a jump, and the file carries no motion-ok exemption. Under
 * prefers-reduced-motion the duration is zero and the glyph swaps instantly.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }));

import hds from '../design-system/tokens';
import { InlineCode } from './inline-code';

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  reduced.value = false;
});

const glyphs = () =>
  [...screen.getByRole('button').querySelectorAll('[data-copy-glyph]')] as HTMLElement[];

async function copy() {
  fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await act(async () => {});
}

describe('InlineCode copy glyph swap (hds#751)', () => {
  it('carries no motion-ok exemption', () => {
    const src = readFileSync(join(__dirname, 'inline-code.tsx'), 'utf8');
    expect(src).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
  });

  it('crossfades Copy out and Check in, both stacked in one cell', async () => {
    render(<InlineCode copyable>npm i</InlineCode>);
    expect(glyphs().map((g) => g.dataset.copyGlyph)).toEqual(['copy']);
    await copy();
    const during = glyphs();
    expect(during.map((g) => g.dataset.copyGlyph).sort()).toEqual(['check', 'copy']);
    for (const g of during) expect(g.className).toContain('col-start-1 row-start-1');
    // The exiting Copy glyph is hidden from assistive tech while it fades.
    expect(during.find((g) => g.dataset.copyGlyph === 'copy')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('times the crossfade on the productive motion token', () => {
    const src = readFileSync(join(__dirname, 'inline-code.tsx'), 'utf8');
    expect(src).toMatch(/useHdsMotion\('productive'\)/);
    expect(src).toMatch(/crossfadeFade\(/);
    expect(hds.motion.productive.duration).toBeGreaterThan(0);
  });

  it('swaps instantly under prefers-reduced-motion', async () => {
    reduced.value = true;
    render(<InlineCode copyable>npm i</InlineCode>);
    await copy();
    await waitFor(() => expect(glyphs().map((g) => g.dataset.copyGlyph)).toEqual(['check']));
  });
});
