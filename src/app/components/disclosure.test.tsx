/**
 * Tests for Disclosure — trigger a11y (aria-expanded/controls), open/close
 * toggling, controlled mode, and ref. Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Disclosure } from './disclosure';

afterEach(cleanup);

describe('Disclosure', () => {
  it('renders a collapsed trigger by default', () => {
    render(<Disclosure label="Details">Hidden body</Disclosure>);
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Hidden body')).toBeNull();
  });

  it('reveals content when defaultOpen', () => {
    render(
      <Disclosure label="Details" defaultOpen>
        Shown body
      </Disclosure>,
    );
    expect(screen.getByRole('button', { name: 'Details' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(screen.getByText('Shown body')).toBeDefined();
  });

  it('toggles open on click and fires onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(
      <Disclosure label="Details" onOpenChange={onOpenChange}>
        Body
      </Disclosure>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('Body')).toBeDefined();
  });

  it('respects the controlled open prop', () => {
    const onOpenChange = vi.fn();
    render(
      <Disclosure label="Details" open={false} onOpenChange={onOpenChange}>
        Body
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    // Controlled: internal state does not change; parent is notified instead.
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('links the trigger to the panel via aria-controls when open', () => {
    render(
      <Disclosure label="Details" defaultOpen>
        Body
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Details' });
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).not.toBeNull();
  });

  it('forwards its ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Disclosure ref={ref} label="Details">
        Body
      </Disclosure>,
    );
    expect(ref.current).not.toBeNull();
  });
});
