import { describe, it, expect, afterEach, vi } from 'vitest';
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

  it('clickable placeholder (no src) carries the hds-focus ring and no inline outline override', () => {
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" onClick={() => {}} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    const btn = container.querySelector('[role="button"]') as HTMLElement;
    expect(btn.getAttribute('tabindex')).toBe('0');
    expect(btn.style.outline).toBe('');
    expect(btn.classList.contains('hds-focus')).toBe(true);
  });

  it('clickable placeholder keeps a caller className alongside hds-focus', () => {
    const { container } = render(
      <AssetImg src="/x.png" alt="Diagram" className="hds-extra" onClick={() => {}} />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    const btn = container.querySelector('[role="button"]') as HTMLElement;
    expect(btn.classList.contains('hds-extra')).toBe(true);
    expect(btn.classList.contains('hds-focus')).toBe(true);
  });

  it('non-interactive placeholder is not given a focus ring', () => {
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('.hds-focus')).toBeNull();
  });

  it('clickable placeholder activates on Enter and Space, not other keys', () => {
    const onClick = vi.fn();
    const { container } = render(<AssetImg src="/x.png" alt="Diagram" onClick={onClick} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    const btn = container.querySelector('[role="button"]') as HTMLElement;
    expect(fireEvent.keyDown(btn, { key: 'Enter' })).toBe(false); // default prevented
    expect(fireEvent.keyDown(btn, { key: ' ' })).toBe(false); // Space must not scroll the page
    expect(onClick).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(btn, { key: 'a' });
    expect(onClick).toHaveBeenCalledTimes(2);
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
