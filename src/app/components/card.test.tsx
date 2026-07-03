/**
 * Tests for Card — compound anatomy, tone/bordered hooks, Progress + Metric
 * slots, and ref forwarding. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { Card } from './card';

afterEach(cleanup);

describe('Card', () => {
  it('renders its compound anatomy', () => {
    render(
      <Card>
        <Card.Header>
          <Card.Title>Discovery</Card.Title>
          <Card.Description>Audit prep</Card.Description>
        </Card.Header>
        <Card.Body>Body copy</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>,
    );
    expect(screen.getByText('Discovery')).toBeDefined();
    expect(screen.getByText('Audit prep')).toBeDefined();
    expect(screen.getByText('Body copy')).toBeDefined();
    expect(screen.getByText('Footer')).toBeDefined();
  });

  it('reflects tone + bordered on data hooks', () => {
    const { container } = render(
      <Card tone="warning" bordered>
        <Card.Body>x</Card.Body>
      </Card>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-tone')).toBe('warning');
    expect(root.getAttribute('data-bordered')).toBe('true');
  });

  it('exposes Card.Progress as a clamped progressbar', () => {
    render(<Card.Progress value={150} max={100} label="done" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(screen.getByText('done')).toBeDefined();
  });

  it('renders Card.Metric label, value, and sub-line', () => {
    render(<Card.Metric label="Retainer" value="$3,500" sub="Active" />);
    expect(screen.getByText('Retainer')).toBeDefined();
    expect(screen.getByText('$3,500')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('forwards its ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Card ref={ref}>
        <Card.Body>x</Card.Body>
      </Card>,
    );
    expect(ref.current?.getAttribute('data-tone')).toBe('default');
  });
});
