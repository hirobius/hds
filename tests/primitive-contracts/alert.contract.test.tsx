/**
 * Contract test: Alert
 * Verifies that Alert renders with role="alert" and that the `tone` prop drives
 * the feedback-background utility class (bg-feedback-bg-*) on the container.
 * (Tone is class-based via CVA — not an inline style — so we assert className.)
 *
 * @primitive Alert
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Alert } from '@/app/components/alert';

describe('Alert contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Alert>Message</Alert>);
    expect(container.firstChild).not.toBeNull();
  });

  it('has role="alert"', () => {
    const { container } = render(<Alert>Message</Alert>);
    const el = container.querySelector('[role="alert"]');
    expect(el).not.toBeNull();
  });

  it('renders children content', () => {
    const { container } = render(<Alert>Error occurred</Alert>);
    expect(container.textContent).toContain('Error occurred');
  });

  it('tone=success applies the feedback-bg-success class', () => {
    const { container } = render(<Alert tone="success">OK</Alert>);
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.classList.contains('bg-feedback-bg-success')).toBe(true);
  });

  it('tone=danger applies the feedback-bg-danger class', () => {
    const { container } = render(<Alert tone="danger">Fail</Alert>);
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.classList.contains('bg-feedback-bg-danger')).toBe(true);
  });

  it('tone=warning applies the feedback-bg-warning class', () => {
    const { container } = render(<Alert tone="warning">Warn</Alert>);
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.classList.contains('bg-feedback-bg-warning')).toBe(true);
  });

  it('defaults to the feedback-bg-info class', () => {
    const { container } = render(<Alert>Info</Alert>);
    const el = container.querySelector('[role="alert"]') as HTMLElement;
    expect(el.classList.contains('bg-feedback-bg-info')).toBe(true);
  });

  it('title prop renders heading text', () => {
    const { container } = render(
      <Alert title="Heads up" tone="warning">
        Detail
      </Alert>,
    );
    expect(container.textContent).toContain('Heads up');
  });
});
