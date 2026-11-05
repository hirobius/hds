/**
 * hds#751 (components: open / stack): a new toast eases up into the stack on
 * the productive motion token instead of popping in. Radix still owns mounting,
 * swipe and the CSS slide-out; the swipe follow moves to the CSS `translate`
 * property so it composes with the enter's inline transform. Under
 * prefers-reduced-motion the duration is zero and the toast appears at rest.
 * toast.tsx carries no motion-ok exemption.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }));

import hds from '../design-system/tokens';
import { ToastProvider, useToast } from './toast';

const src = readFileSync(join(__dirname, 'toast.tsx'), 'utf8');
const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const toastCss = theme.slice(theme.indexOf('Toast swipe + exit'));

beforeAll(() => {
  // @ts-expect-error — minimal jsdom polyfill for Radix Toast.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(() => {
  cleanup();
  reduced.value = false;
});

function Trigger() {
  const { toast } = useToast();
  return <button onClick={() => toast({ title: 'Saved' })}>fire</button>;
}

function fire() {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByText('fire'));
  return screen.getByText('Saved').closest('li') as HTMLElement;
}

describe('Toast enter (hds#751)', () => {
  it('carries no motion-ok exemption', () => {
    expect(src).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
  });

  it('times the enter on the productive motion token', () => {
    expect(src).toMatch(/useHdsMotion\('productive'\)/);
    expect(hds.motion.productive.duration).toBeGreaterThan(0);
  });

  it('starts a new toast transparent so it eases into the stack', () => {
    const root = fire();
    expect(root.className).toMatch(/(^|\s)hds-toast(\s|$)/);
    expect(root.getAttribute('data-state')).toBe('open');
    expect(root.style.opacity).toBe('0');
  });

  it('shows the toast at rest under prefers-reduced-motion', async () => {
    reduced.value = true;
    const root = fire();
    await waitFor(() => expect(root.style.opacity).toBe('1'));
  });

  it('swipe follow uses the translate property, so it composes with the enter transform', () => {
    const move = toastCss.slice(toastCss.indexOf(".hds-toast[data-swipe='move']")).split('}')[0];
    expect(move).toMatch(/\btranslate:\s*var\(--radix-toast-swipe-move-x, 0\)/);
    expect(move).not.toMatch(/\btransform:/);
    const cancel = toastCss
      .slice(toastCss.indexOf(".hds-toast[data-swipe='cancel']"))
      .split('}')[0];
    expect(cancel).toMatch(/\btranslate:\s*0 0/);
    expect(cancel).toContain('transition: translate var(--hds-motion-productive-duration)');
    const reducedBlock = toastCss.slice(toastCss.indexOf('prefers-reduced-motion'));
    expect(reducedBlock).toContain('translate: none');
  });
});
