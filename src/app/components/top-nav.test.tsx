import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TopNav } from './top-nav';

afterEach(cleanup);

describe('TopNav', () => {
  it('renders the brand slot', () => {
    render(<TopNav brand={<span>HDS</span>} />);
    expect(screen.getByText('HDS')).not.toBeNull();
  });

  it('wraps children in a <nav> alongside the trailing slot', () => {
    const { container } = render(
      <TopNav trailing={<button type="button">Sign in</button>}>
        <a href="/docs" className="hds-focus">
          Docs
        </a>
      </TopNav>,
    );
    expect(container.querySelector('nav')).not.toBeNull();
    expect(screen.getByText('Docs')).not.toBeNull();
    expect(screen.getByText('Sign in')).not.toBeNull();
  });

  it('renders as a banner landmark', () => {
    render(<TopNav brand={<span>HDS</span>} />);
    expect(screen.getByRole('banner')).not.toBeNull();
  });

  it('reflects the sticky prop on the data attribute and class list', () => {
    const { container } = render(<TopNav sticky brand={<span>HDS</span>} />);
    const header = container.querySelector('header');
    expect(header?.getAttribute('data-sticky')).toBe('true');
    expect(header?.className).toContain('sticky');
  });
});
