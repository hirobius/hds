/**
 * Tests for InlineCode: the plain chip, the copyable chip's button (named
 * "Copy", then "Copied"), and its rendered markup. The copy button moved off
 * the icon-button wrapper onto Button iconOnly in hds#392; the markup snapshots
 * were taken before that swap so it cannot change what InlineCode draws.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { InlineCode } from './inline-code';

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('InlineCode', () => {
  it('renders only the code chip when not copyable', () => {
    const { container } = render(<InlineCode>semantic.color.brand.primary</InlineCode>);
    expect(container.querySelector('code')?.textContent).toBe('semantic.color.brand.primary');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('puts a copy button named "Copy" before the code when copyable', () => {
    const { container } = render(<InlineCode copyable>var(--x)</InlineCode>);
    const button = screen.getByRole('button', { name: 'Copy' });
    const code = container.querySelector('code') as HTMLElement;
    expect(button.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.textContent).toBe('');
    expect(button.getAttribute('data-variant')).toBe('tertiary');
    expect(button.getAttribute('data-size')).toBe('sm');
    const glyph = button.querySelector('svg') as SVGElement;
    expect(glyph.getAttribute('aria-hidden')).toBe('true');
    // A 16px glyph from the icon ramp, not the 14px the sm button gives a bare svg.
    expect(glyph.style.width).toBe('var(--primitive-size-16)'); // tier-ok: pins Icon's rendered size; the tokens.ts bridge (hds.iconSize) emits it as a primitive var, this test only reads it back
  });

  it('copies the text and renames the button "Copied" in the accent colour, then back after 2s', async () => {
    vi.useFakeTimers();
    render(<InlineCode copyable>var(--x)</InlineCode>);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('var(--x)');
    await act(async () => {});
    const copied = screen.getByRole('button', { name: 'Copied' });
    expect(copied.style.color).toBe('var(--semantic-color-content-accent)');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('button', { name: 'Copy' }).style.color).toBe('');
  });

  it('renders the copyable chip byte-for-byte as before, in both states', async () => {
    const { container } = render(<InlineCode copyable>var(--x)</InlineCode>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      // tier-ok: byte-for-byte snapshot of rendered markup; the primitive size var is Icon's bridge output, not a style written here
      `"<span style="display: inline-flex; align-items: center; gap: var(--semantic-space-subgrid-gap);"><button type="button" data-variant="tertiary" data-size="sm" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[colors,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 text-foreground hover:bg-accent h-8 text-xs [&amp;_svg]:size-3.5 p-0 w-8" aria-label="Copy"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy" style="width: var(--primitive-size-16); height: var(--primitive-size-16); min-width: var(--primitive-size-16); min-height: var(--primitive-size-16); display: block; flex-shrink: 0; aspect-ratio: 1 / 1;" aria-hidden="true" data-hds-icon=""><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button><code data-density="comfortable" class="inline-flex max-w-[var(--semantic-typography-mono-max-width)] items-center whitespace-nowrap rounded-none border-0 bg-[var(--component-badge-bg)] px-[var(--semantic-space-subgrid-gap)] text-foreground [font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)] py-[var(--semantic-space-subgrid-gap)] align-[-0.08em] leading-[1]">var(--x)</code></span>"`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await act(async () => {});
    expect(container.innerHTML).toMatchInlineSnapshot(
      // tier-ok: byte-for-byte snapshot of rendered markup; the primitive size var is Icon's bridge output, not a style written here
      `"<span style="display: inline-flex; align-items: center; gap: var(--semantic-space-subgrid-gap);"><button type="button" data-variant="tertiary" data-size="sm" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[colors,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 text-foreground hover:bg-accent h-8 text-xs [&amp;_svg]:size-3.5 p-0 w-8" aria-label="Copied" style="color: var(--semantic-color-content-accent);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" style="width: var(--primitive-size-16); height: var(--primitive-size-16); min-width: var(--primitive-size-16); min-height: var(--primitive-size-16); display: block; flex-shrink: 0; aspect-ratio: 1 / 1;" aria-hidden="true" data-hds-icon=""><path d="M20 6 9 17l-5-5"></path></svg></button><code data-density="comfortable" class="inline-flex max-w-[var(--semantic-typography-mono-max-width)] items-center whitespace-nowrap rounded-none border-0 bg-[var(--component-badge-bg)] px-[var(--semantic-space-subgrid-gap)] text-foreground [font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)] py-[var(--semantic-space-subgrid-gap)] align-[-0.08em] leading-[1]">var(--x)</code></span>"`,
    );
  });
});
