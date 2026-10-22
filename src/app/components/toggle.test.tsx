/**
 * Tests for Toggle — checked/onChange (boolean), disabled, ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Toggle } from './toggle';

afterEach(cleanup);

describe('Toggle', () => {
  it('renders a labelled switch reflecting the checked prop', () => {
    render(<Toggle label="Wi-Fi" checked onChange={() => {}} />);
    expect((screen.getByRole('switch', { name: 'Wi-Fi' }) as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange with the toggled boolean', () => {
    const onChange = vi.fn();
    render(<Toggle label="Wi-Fi" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disables the underlying input', () => {
    render(<Toggle label="Wi-Fi" checked={false} disabled onChange={() => {}} />);
    expect((screen.getByRole('switch') as HTMLInputElement).disabled).toBe(true);
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Toggle ref={ref} label="Wi-Fi" checked={false} onChange={() => {}} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
});

// Pins the thumb's travel to the tokens the track and thumb are painted with, so the
// two can't drift apart again (the track's border was once left out of the travel
// math and the "on" thumb ran 2px past the track's right edge).
describe('Toggle geometry', () => {
  const css = readFileSync(resolve(__dirname, '../../styles/tokens.generated.css'), 'utf8');
  const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const vars = new Map(
    [...rootBlock.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]),
  );
  const tokenPx = (name: string): number => {
    const v = vars.get(name);
    if (v === undefined) throw new Error(`unknown token ${name}`);
    const ref = /^var\((--[\w-]+)\)$/.exec(v);
    return ref ? tokenPx(ref[1]) : parseFloat(v);
  };
  /** Token behind a `prefix-[var(--x)]` / `prefix-[length:var(--x)]` class. */
  const classToken = (el: Element, prefix: string): number => {
    const m = new RegExp(`(?:^|\\s)${prefix}-\\[(?:length:)?var\\((--[\\w-]+)\\)\\]`).exec(
      el.className,
    );
    if (!m) throw new Error(`no ${prefix}-[var(...)] class on ${el.className}`);
    return tokenPx(m[1]);
  };

  const parts = (checked: boolean) => {
    const { container } = render(<Toggle label="Wi-Fi" checked={checked} onChange={() => {}} />);
    const track = container.querySelector('label > span[aria-hidden]')!;
    const thumb = track.firstElementChild as HTMLElement;
    const g = {
      width: classToken(track, 'w'),
      height: classToken(track, 'h'),
      border: classToken(track, 'border'),
      pad: classToken(track, 'p'),
      thumbW: classToken(thumb, 'w'),
      thumbH: classToken(thumb, 'h'),
    };
    const x = parseFloat(/translateX\((-?[\d.]+)px\)/.exec(thumb.style.transform)?.[1] ?? '0');
    return { g, x };
  };

  it('fits the thumb inside the padded track vertically (equal top/bottom inset)', () => {
    const { g } = parts(false);
    expect(g.thumbH + 2 * (g.pad + g.border)).toBe(g.height);
  });

  it('slides the thumb so the on-state right inset equals the off-state left inset', () => {
    const { g, x } = parts(true);
    const rail = g.width - 2 * (g.border + g.pad);
    expect(x).toBe(rail - g.thumbW);
    expect(parts(false).x).toBe(0);
  });
});
