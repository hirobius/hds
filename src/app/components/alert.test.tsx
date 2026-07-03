/**
 * Tests for Alert — alert role, title + body slots, and ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { Alert } from './alert';

afterEach(cleanup);

describe('Alert', () => {
  it('renders its body content in an alert region', () => {
    render(<Alert tone="info">Settings saved.</Alert>);
    const region = screen.getByRole('alert');
    expect(region.textContent).toContain('Settings saved.');
  });

  it('renders a title above the body when provided', () => {
    render(
      <Alert tone="danger" title="Export failed">
        Check your API key.
      </Alert>,
    );
    const region = screen.getByRole('alert');
    expect(region.textContent).toContain('Export failed');
    expect(region.textContent).toContain('Check your API key.');
  });

  it('renders body-only without a title', () => {
    render(<Alert tone="success">Done.</Alert>);
    expect(screen.getByRole('alert').textContent).toContain('Done.');
  });

  it('forwards its ref to the alert element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Alert tone="warning" ref={ref}>
        Careful.
      </Alert>,
    );
    expect(ref.current?.getAttribute('role')).toBe('alert');
  });
});
