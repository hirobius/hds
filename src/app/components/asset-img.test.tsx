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
    const { container } = render(
      <AssetImg src="/x.png" alt="Diagram" context="detail" />,
    );
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
});
