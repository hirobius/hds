/**
 * Tests for EmptyState — title/description rendering and the optional
 * action slot. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
});
