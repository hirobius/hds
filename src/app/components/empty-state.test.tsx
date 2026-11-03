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

describe('EmptyState variant="teaching" (hds#863)', () => {
  const root = (c: HTMLElement) =>
    c.querySelector('[data-hds-component="EmptyState"]') as HTMLElement;

  it('defaults to the inline layout: no tile, no centring, no frame, DOM unchanged', () => {
    const { container } = render(<EmptyState icon={Inbox} title="No roles yet" />);
    const el = root(container);
    expect(el.hasAttribute('data-variant')).toBe(false);
    expect(el.querySelector('[data-hds-empty-state-tile]')).toBeNull();
    expect(el.classList.contains('items-center')).toBe(false);
    expect(el.classList.contains('bg-card')).toBe(false);
  });

  it('centres one column, upright, with the icon in a token-sized muted tile', () => {
    const { container } = render(
      <EmptyState variant="teaching" icon={Inbox} title="No roles yet" />,
    );
    const el = root(container);
    expect(el.getAttribute('data-variant')).toBe('teaching');
    expect(el.classList.contains('items-center')).toBe(true);
    expect(el.classList.contains('text-center')).toBe(true);
    expect(el.classList.contains('not-italic')).toBe(true);
    expect(el.classList.contains('italic')).toBe(false);
    const tile = el.querySelector('[data-hds-empty-state-tile]') as HTMLElement;
    expect(tile.className).toContain('size-[var(--semantic-size-row-compact)]');
    expect(tile.className).toContain('bg-[var(--semantic-color-surface-muted)]');
    expect(tile.className).toContain('text-foreground');
  });

  it('sets the title as Text: body role, bold weight step, primary content colour', () => {
    render(<EmptyState variant="teaching" title="No roles yet" />);
    const title = screen.getByText('No roles yet');
    expect(title.tagName).toBe('P');
    expect(title.className).toContain('hds-type-body');
    expect(title.className).toContain('text-[var(--semantic-color-content-primary)]');
    // tier-ok: the bold step is Text weight="bold", which reads the shipped weight token
    expect(title.className).toContain('[font-weight:var(--primitive-typography-weight-bold)]');
  });

  it('puts the action one more spacing step below the sentence', () => {
    render(
      <EmptyState
        variant="teaching"
        title="No roles yet"
        action={<button type="button">Add a role</button>}
      />,
    );
    const wrapper = screen.getByRole('button', { name: 'Add a role' }).parentElement!;
    expect(wrapper.className).toContain('pt-scale-xs');
  });

  it('framed draws one raised panel with no outline; it has no effect inline', () => {
    const { container, rerender } = render(
      <EmptyState variant="teaching" framed title="No roles yet" />,
    );
    const el = root(container);
    expect(el.getAttribute('data-framed')).toBe('true');
    expect(el.classList.contains('bg-card')).toBe(true);
    expect(el.classList.contains('rounded-lg')).toBe(true);
    expect(el.classList.contains('p-surface-padding')).toBe(true);
    expect(el.className).not.toMatch(/(^|\s)border(\s|$)/);
    rerender(<EmptyState framed title="No roles yet" />);
    expect(root(container).classList.contains('bg-card')).toBe(false);
    expect(root(container).hasAttribute('data-framed')).toBe(false);
  });

  it('keeps italic when asked for it explicitly', () => {
    const { container } = render(<EmptyState variant="teaching" italic title="No roles yet" />);
    expect(root(container).classList.contains('italic')).toBe(true);
  });
});
