/**
 * Tests for Tag — toggle semantics (aria-pressed), click, label/title, ref.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Tag } from './tag';

afterEach(cleanup);

describe('Tag', () => {
  it('renders its children in a toggle button', () => {
    render(<Tag>tokens</Tag>);
    const btn = screen.getByRole('button', { name: 'tokens' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('reflects the active state via aria-pressed + data-active', () => {
    render(<Tag active>tokens</Tag>);
    const btn = screen.getByRole('button', { name: 'tokens' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('data-active')).toBe('true');
  });

  it('fires onClick when activated', () => {
    const onClick = vi.fn();
    render(<Tag onClick={onClick}>tokens</Tag>);
    fireEvent.click(screen.getByRole('button', { name: 'tokens' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses aria-label when the visible text is abbreviated', () => {
    render(<Tag aria-label="Design tokens">dt</Tag>);
    expect(screen.getByRole('button', { name: 'Design tokens' })).toBeDefined();
  });

  it('forwards its ref to the button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Tag ref={ref}>tokens</Tag>);
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
