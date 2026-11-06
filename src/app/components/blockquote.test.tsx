import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Blockquote } from './blockquote';

afterEach(cleanup);

describe('Blockquote', () => {
  it('renders quoted content inside a <blockquote>', () => {
    const { container } = render(<Blockquote>Stay hungry</Blockquote>);
    const el = container.querySelector('blockquote');
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('Stay hungry');
  });

  it('renders an attribution footer when provided', () => {
    render(<Blockquote attribution="— Ada">Quote</Blockquote>);
    expect(screen.getByText('— Ada').tagName.toLowerCase()).toBe('footer');
  });

  // A <footer> outside sectioning content maps to the contentinfo landmark, so an
  // attribution would add a page-footer landmark per quote. It reads as plain text.
  it('does not expose the attribution as a contentinfo landmark', () => {
    render(<Blockquote attribution="Ada Lovelace">Quote</Blockquote>);
    expect(screen.queryByRole('contentinfo')).toBeNull();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  });

  it('omits the footer when no attribution is given', () => {
    const { container } = render(<Blockquote>Quote</Blockquote>);
    expect(container.querySelector('footer')).toBeNull();
  });

  it('reflects the size on the data attribute', () => {
    const { container } = render(<Blockquote size="lg">Q</Blockquote>);
    expect(container.querySelector('blockquote')?.getAttribute('data-size')).toBe('lg');
  });
});
