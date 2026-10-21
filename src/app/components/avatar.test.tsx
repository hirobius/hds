/**
 * Tests for Avatar — image rendering, initials fallback derivation, and the
 * onError → fallback transition. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Avatar } from './avatar';

afterEach(cleanup);

describe('Avatar', () => {
  it('hides initials from assistive tech when alt is empty (decorative beside a name)', () => {
    const { container } = render(<Avatar initials="NR" alt="" />);
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(screen.getByText('NR').getAttribute('aria-hidden')).toBe('true');
  });

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

describe('Avatar failed-state reset (hds#— bugfix)', () => {
  it('shows the new image after a src change following a load error', () => {
    const { container, rerender } = render(<Avatar src="/u.png" alt="Jane Doe" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull(); // fallback initials
    rerender(<Avatar src="/v.png" alt="Jane Doe" />);
    expect(container.querySelector('img')).not.toBeNull(); // recovered
  });
});

describe('Avatar icon fallback (Roleforge signed-out account)', () => {
  it('a11y:avatar.named - fallback="icon" shows a neutral person icon named by alt, no initials', () => {
    const { container } = render(<Avatar alt="Signed out" fallback="icon" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg[data-hds-icon]')).not.toBeNull();
    expect(screen.queryByText('SO')).toBeNull();
    expect(screen.getByRole('img', { name: 'Signed out' })).not.toBeNull();
  });

  it('falls back to the icon when no initials can be derived', () => {
    const { container } = render(<Avatar alt="" />);
    expect(container.querySelector('svg[data-hds-icon]')).not.toBeNull();
  });

  it('still prefers a loaded image over the icon fallback', () => {
    const { container } = render(<Avatar src="/u.png" alt="Adrian Milsap" fallback="icon" />);
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('svg[data-hds-icon]')).toBeNull();
  });
});

describe('Avatar status dot', () => {
  it('a11y:avatar.status-named - renders a Badge dot named by statusLabel', () => {
    render(<Avatar alt="Adrian Milsap" status="warning" statusLabel="Not synced" />);
    const dot = screen.getByRole('img', { name: 'Not synced' });
    expect(dot.getAttribute('data-tone')).toBe('warning');
  });

  it('hides an unnamed dot from assistive technology', () => {
    const { container } = render(<Avatar alt="Adrian Milsap" status="success" />);
    const dot = container.querySelector('[data-tone="success"]');
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
  });

  it('scales the dot with the avatar size', () => {
    const { container } = render(<Avatar alt="A B" size="sm" status="info" />);
    expect(container.querySelector('[data-tone="info"]')?.getAttribute('data-size')).toBe('sm');
  });

  it('renders no dot without status', () => {
    const { container } = render(<Avatar alt="A B" />);
    expect(container.querySelector('[data-tone]')).toBeNull();
  });
});
