/**
 * Contract test: Card
 * Verifies that the card root and its compound parts emit the expected classes
 * and data attributes.
 *
 * @primitive Card
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from '@/app/components/card';

describe('Card contract', () => {
  it('renders without crashing', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).not.toBeNull();
  });

  it('root emits bg-card class', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.className).toContain('bg-card');
  });

  it('root emits rounded-lg class', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.className).toContain('rounded-lg');
  });

  it('is borderless by default and opts into a border via the bordered prop', () => {
    // CLAUDE.md (2026-05-03): cards are borderless by default — the border is
    // expressed via data-bordered + an inline border, not a utility class.
    const def = render(<Card>Content</Card>).container.firstChild as HTMLElement;
    expect(def?.getAttribute('data-bordered')).toBe('false');
    const bordered = render(<Card bordered>Content</Card>).container.firstChild as HTMLElement;
    expect(bordered?.getAttribute('data-bordered')).toBe('true');
  });

  it('data-padding defaults to "component"', () => {
    const { container } = render(<Card>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-padding')).toBe('component');
  });

  it('padding="none" sets data-padding=none', () => {
    const { container } = render(<Card padding="none">Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-padding')).toBe('none');
  });

  it('noPadding=true overrides padding to none', () => {
    const { container } = render(<Card noPadding>Content</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el?.getAttribute('data-padding')).toBe('none');
  });

  it('Card.Header emits flex-col class', () => {
    const { container } = render(
      <Card>
        <Card.Header>Header</Card.Header>
      </Card>,
    );
    const header = container.querySelector('.flex-col');
    expect(header).not.toBeNull();
  });

  it('Card.Title renders an h3', () => {
    const { container } = render(
      <Card>
        <Card.Header>
          <Card.Title>Title</Card.Title>
        </Card.Header>
      </Card>,
    );
    const h3 = container.querySelector('h3');
    expect(h3).not.toBeNull();
    expect(h3?.textContent).toBe('Title');
  });

  it('tone=danger over variant=accent renders the 1px feedback border, not the accent border, with no !', () => {
    // hds#372 / ADR-030: tone wins over variant by tailwind-merge class-group
    // replacement (`border` replaces `border-2`, the feedback colour replaces the
    // accent colour), not by the `!` important modifier.
    const { container } = render(
      <Card variant="accent" tone="danger">
        Content
      </Card>,
    );
    const el = container.firstChild as HTMLElement;
    const classes = el.className.split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining(['border', 'border-[var(--semantic-color-feedback-error)]']),
    );
    expect(classes).not.toContain('border-2');
    expect(classes).not.toContain('border-[var(--semantic-color-border-accent)]');
    expect(el.className).not.toContain('!');
  });

  it('as prop changes the rendered element', () => {
    const { container } = render(<Card as="section">Content</Card>);
    const el = container.querySelector('section');
    expect(el).not.toBeNull();
  });
});
