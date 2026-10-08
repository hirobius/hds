import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AssetImg } from './asset-img';

afterEach(cleanup);

/** Every element that carries aria-label must have a role (or be natively labellable). */
function unlabelledRoleless(container: HTMLElement) {
  return Array.from(container.querySelectorAll('[aria-label]')).filter(
    (el) => !el.getAttribute('role') && !['IMG', 'BUTTON', 'A', 'INPUT'].includes(el.tagName),
  );
}

describe('AssetImg a11y', () => {
  it('detail placeholder exposes aria-label only with an img role', () => {
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" context="detail" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(unlabelledRoleless(container)).toHaveLength(0);
  });

  it('non-interactive placeholder exposes aria-label only with an img role', () => {
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(unlabelledRoleless(container)).toHaveLength(0);
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Diagram');
  });

  it('interactive placeholder is a labelled button', () => {
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" onClick={() => {}} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('[role="button"]')?.getAttribute('aria-label')).toBe('Diagram');
  });

  it('expandable button wrapper does not suppress the focus outline', () => {
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" onClick={() => {}} />);
    const btn = container.querySelector('[role="button"]') as HTMLElement;
    expect(btn.style.outline).toBe('');
    expect(btn.classList.contains('hds-focus')).toBe(true);
  });

  it('placeholder without alt is hidden from assistive tech, never an unnamed img', () => {
    for (const ctx of [undefined, 'detail'] as const) {
      const { container, unmount } = render(<AssetImg src="/x.png" context={ctx} />);
      fireEvent.error(container.querySelector('img') as HTMLImageElement);
      const unnamed = Array.from(container.querySelectorAll('[role="img"]')).filter(
        (el) => !el.getAttribute('aria-label'),
      );
      expect(unnamed).toHaveLength(0);
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
      unmount();
    }
  });
});

describe('AssetImg failed-state reset (hds#— bugfix)', () => {
  it('recovers from a load error when src changes to a working image', () => {
    const { container, rerender } = render(<AssetImg src="/a.png" alt="x" />);
    const img = container.querySelector('img')!;
    expect(img).not.toBeNull();
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull(); // on error → fallback, no img
    rerender(<AssetImg src="/b.png" alt="x" />);
    const img2 = container.querySelector('img');
    expect(img2).not.toBeNull(); // src changed → failed reset → img back
    expect(img2!.getAttribute('src')).toBe('/b.png');
  });
});
