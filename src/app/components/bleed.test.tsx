import { createRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Bleed } from './bleed';

afterEach(cleanup);

describe('Bleed', () => {
  it('renders children', () => {
    render(<Bleed>content</Bleed>);
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('is polymorphic via the `as` prop', () => {
    const { container } = render(<Bleed as="section">content</Bleed>);
    expect((container.firstChild as HTMLElement).tagName).toBe('SECTION');
  });

  it('forwards the ref to the underlying DOM element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Bleed ref={ref}>content</Bleed>);
    expect(ref.current).not.toBeNull();
  });

  it('defaults to a negative horizontal margin using the normal token', () => {
    const { container } = render(<Bleed>content</Bleed>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginLeft).toBe('calc(-1 * var(--semantic-space-layout-normal))');
    expect(el.style.marginRight).toBe('calc(-1 * var(--semantic-space-layout-normal))');
    expect(el.style.marginTop).toBe('');
  });

  it('applies vertical negative margin when axis="y"', () => {
    const { container } = render(
      <Bleed amount="inset" axis="y">
        content
      </Bleed>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginTop).toBe('calc(-1 * var(--semantic-space-layout-inset))');
    expect(el.style.marginBottom).toBe('calc(-1 * var(--semantic-space-layout-inset))');
    expect(el.style.marginLeft).toBe('');
  });

  it('applies negative margin on all four sides when axis="both"', () => {
    const { container } = render(
      <Bleed amount="tight" axis="both">
        content
      </Bleed>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginLeft).toBe('calc(-1 * var(--semantic-space-layout-tight))');
    expect(el.style.marginTop).toBe('calc(-1 * var(--semantic-space-layout-tight))');
  });
});
