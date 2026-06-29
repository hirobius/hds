/**
 * Tests for Avatar — image rendering, initials fallback derivation, and the
 * onError → fallback transition. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Avatar } from './avatar';

afterEach(cleanup);

describe('Avatar', () => {
  it('renders the image when src is provided', () => {
    const { container } = render(<Avatar src="/u.png" alt="Adrian Milsap" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('Adrian Milsap');
  });

  it('derives two-letter initials from a multi-word alt when no src', () => {
    const { container } = render(<Avatar alt="Adrian Milsap" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AM')).not.toBeNull();
  });

  it('uses the first two letters for a single-word name', () => {
    render(<Avatar alt="Cher" />);
    expect(screen.getByText('Ch')).not.toBeNull();
  });

  it('prefers explicit initials over the derived ones', () => {
    render(<Avatar alt="Adrian Milsap" initials="HD" />);
    expect(screen.getByText('HD')).not.toBeNull();
  });

  it('falls back to initials when the image fails to load', () => {
    const { container } = render(<Avatar src="/broken.png" alt="Adrian Milsap" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AM')).not.toBeNull();
  });
});
