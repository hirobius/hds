/**
 * Contract test: Tag
 * Verifies that Tag emits the expected cva-driven classes and data attributes
 * for active/inactive states (converted off the former .hds-tag-btn/
 * .hds-tag-pill theme.css classes for #60 — see src/app/components/tag.tsx).
 *
 * @primitive Tag
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Star } from 'lucide-react';
import { Tag } from '@/app/components/tag';

describe('Tag contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Tag>Label</Tag>);
    expect(container.querySelector('button')).not.toBeNull();
  });

  it('root element is a button', () => {
    const { container } = render(<Tag>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.tagName.toLowerCase()).toBe('button');
  });

  it('root button carries the shared group interaction class (tagButtonVariants)', () => {
    const { container } = render(<Tag>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.classList.contains('group')).toBe(true);
  });

  it('inner pill (tagPillVariants) is a span carrying the tag radius token class', () => {
    const { container } = render(<Tag>Label</Tag>);
    const pill = container.querySelector('button > span');
    expect(pill).not.toBeNull();
    expect(pill?.className).toContain('rounded-[var(--component-tag-radius)]');
  });

  it('active=false sets aria-pressed="false"', () => {
    const { container } = render(<Tag active={false}>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
  });

  it('active=true sets aria-pressed="true"', () => {
    const { container } = render(<Tag active={true}>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('active=true sets data-active="true"', () => {
    const { container } = render(<Tag active={true}>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('data-active')).toBe('true');
  });

  it('active=false does not set data-active', () => {
    const { container } = render(<Tag active={false}>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('data-active')).toBeNull();
  });

  it('aria-label prop sets aria-label on the button', () => {
    const { container } = render(<Tag aria-label="Filter by React">React</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('aria-label')).toBe('Filter by React');
  });

  it('a11y:tag.focus-ring hds-focus class is applied to the button', () => {
    const { container } = render(<Tag>Label</Tag>);
    const btn = container.querySelector('button');
    expect(btn?.classList.contains('hds-focus')).toBe(true);
  });

  it('a11y:tag.icon-decorative the leading icon is aria-hidden and the label names the tag', () => {
    const { container, getByRole } = render(<Tag icon={Star}>Label</Tag>);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(getByRole('button', { name: 'Label' })).toBeTruthy();
  });

  it('a11y:tag.copied-announced copied swaps the label and a polite status announces it', () => {
    const { getByRole, rerender } = render(<Tag copied={false}>Label</Tag>);
    const status = getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('');
    rerender(<Tag copied>Label</Tag>);
    expect(getByRole('status').textContent).toBe('Copied');
    expect(getByRole('button', { name: 'Copied' })).toBeTruthy();
  });
});
