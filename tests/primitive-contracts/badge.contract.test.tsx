/**
 * Contract test: Badge
 * Verifies that Badge renders the expected feedback-background utility class for
 * each tone. Tone + layout are class-based via CVA (not inline styles), so we
 * assert className. ThemeContext has a default value so no Provider is needed.
 *
 * @primitive Badge
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from '@/app/components/badge';

describe('Badge contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Badge>v1.0</Badge>);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders children content', () => {
    const { container } = render(<Badge>v1.0</Badge>);
    expect(container.textContent).toContain('v1.0');
  });

  it('renders a span element by default', () => {
    const { container } = render(<Badge>Label</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el?.tagName.toLowerCase()).toBe('span');
  });

  it('tone=info binds the component.badge.info.bg token', () => {
    const { container } = render(<Badge tone="info">Info</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('bg-[color:var(--component-badge-info-bg)]')).toBe(true);
  });

  it('tone=success binds the component.badge.success.bg token', () => {
    const { container } = render(<Badge tone="success">OK</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('bg-[color:var(--component-badge-success-bg)]')).toBe(true);
  });

  it('tone=danger binds the component.badge.danger.bg token', () => {
    const { container } = render(<Badge tone="danger">Error</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('bg-[color:var(--component-badge-danger-bg)]')).toBe(true);
  });

  it('tone=warning binds the component.badge.warning.bg token', () => {
    const { container } = render(<Badge tone="warning">Warn</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('bg-[color:var(--component-badge-warning-bg)]')).toBe(true);
  });

  it('as="div" renders a div element', () => {
    const { container } = render(<Badge as="div">Label</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el?.tagName.toLowerCase()).toBe('div');
  });

  it('has the inline-flex layout class', () => {
    const { container } = render(<Badge>Label</Badge>);
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains('inline-flex')).toBe(true);
  });
});
