/**
 * Tests for Lightbox — verifies the Radix Dialog a11y contract that the
 * prior hand-rolled version was missing. Focus trap + focus restore are Radix
 * guarantees (not re-tested here); this covers the dismissal/semantics surface:
 * role + accessible name, Escape-to-close, close-button, and closed = no dialog.
 *
 * Plain-DOM assertions (the repo does not load jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Lightbox } from './image-lightbox';

afterEach(cleanup);

const baseProps = {
  src: '/assets/example.webp',
  alt: 'Example case study image',
};

describe('Lightbox', () => {
  it('renders nothing when closed', () => {
    render(<Lightbox open={false} onClose={() => {}} {...baseProps} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders a dialog labelled from alt when open', () => {
    render(<Lightbox open onClose={() => {}} {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Example case study image');
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Lightbox open onClose={onClose} {...baseProps} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is activated', () => {
    const onClose = vi.fn();
    render(<Lightbox open onClose={onClose} {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close image' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('falls back to a generic accessible label when alt is absent', () => {
    render(<Lightbox open onClose={() => {}} src="/x.webp" />);
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Expanded image');
  });
});
