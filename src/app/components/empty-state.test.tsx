/**
 * Tests for EmptyState — title/description rendering and the optional
 * action slot. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from './empty-state';

afterEach(cleanup);

describe('EmptyState', () => {
  it('renders title and description with no action node', () => {
    const { container } = render(
      <EmptyState title="No snippets yet" description="Create your first snippet." />,
    );
    expect(screen.getByText('No snippets yet')).not.toBeNull();
    expect(screen.getByText('Create your first snippet.')).not.toBeNull();
    // Unchanged output: only the two message paragraphs, no action node.
    const root = container.querySelector('[data-hds-component="EmptyState"]');
    expect(root?.children.length).toBe(2);
    expect(root?.querySelector('button')).toBeNull();
  });

  it('renders the action after the description in DOM order', () => {
    render(
      <EmptyState
        title="No snippets yet"
        description="Create your first snippet."
        action={<button type="button">New snippet</button>}
      />,
    );
    const description = screen.getByText('Create your first snippet.');
    const action = screen.getByRole('button', { name: 'New snippet' });
    expect(action).not.toBeNull();
    expect(
      Boolean(description.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it('keeps the action focusable', () => {
    render(
      <EmptyState title="No snippets yet" action={<button type="button">New snippet</button>} />,
    );
    const action = screen.getByRole('button', { name: 'New snippet' });
    action.focus();
    expect(document.activeElement).toBe(action);
  });

  it('does not italicize the action with the message text', () => {
    const { container } = render(
      <EmptyState title="No snippets yet" action={<button type="button">New snippet</button>} />,
    );
    const action = screen.getByRole('button', { name: 'New snippet' });
    // The root is italic for the message; the action must opt back out.
    expect(action.closest('.not-italic')).not.toBeNull();
    expect(container.querySelector('[data-hds-component="EmptyState"]')).not.toBeNull();
  });

  it('renders no icon unless one is given', () => {
    const { container } = render(<EmptyState title="No snippets yet" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders a decorative icon at the medium icon size above the title (hds#825)', () => {
    const { container } = render(<EmptyState icon={Inbox} title="No snippets yet" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    // tier-ok: asserts the emitted primitive
    expect(svg?.style.width).toBe('var(--primitive-size-20)');
    const title = screen.getByText('No snippets yet');
    expect(Boolean(svg!.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );
  });

  it('sets the title in italic by default', () => {
    const { container } = render(<EmptyState title="No snippets yet" />);
    const root = container.querySelector('[data-hds-component="EmptyState"]');
    expect(root?.classList.contains('italic')).toBe(true);
  });

  it('sets the title upright with italic={false} (hds#863)', () => {
    const { container } = render(<EmptyState title="No snippets yet" italic={false} />);
    const root = container.querySelector('[data-hds-component="EmptyState"]');
    expect(root?.classList.contains('italic')).toBe(false);
    expect(root?.classList.contains('not-italic')).toBe(true);
  });
});
