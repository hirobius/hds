/**
 * Contract test: EmptyState accessibility rules (hds#863, teaching variant). EmptyState
 * is a message, not a control, so its rules are about what assistive technology reads:
 * the icon (and the teaching icon tile) is decorative, and the reading order matches
 * the visual order in both layouts. Each `it` title carries the `a11y:<id>` the
 * EmptyState `@a11y component` tags point at.
 *
 * @primitive EmptyState
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from '@/app/components/empty-state';

afterEach(cleanup);

const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('EmptyState accessibility contract', () => {
  it('a11y:empty-state.icon-decorative - the icon, and the teaching icon tile, are hidden from assistive technology', () => {
    const { container, rerender } = render(<EmptyState icon={Inbox} title="No roles yet" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    rerender(<EmptyState variant="teaching" icon={Inbox} title="No roles yet" />);
    const tile = container.querySelector('[data-hds-empty-state-tile]');
    expect(tile).not.toBeNull();
    expect(tile?.getAttribute('aria-hidden')).toBe('true');
    expect(tile?.querySelector('svg')).not.toBeNull();
    // Nothing but the message is exposed: the root's text is the title alone.
    expect(container.textContent).toBe('No roles yet');
  });

  it('a11y:empty-state.reading-order - title, description and action are read in the order they are shown, inline and teaching', () => {
    for (const variant of ['inline', 'teaching'] as const) {
      render(
        <EmptyState
          variant={variant}
          framed={variant === 'teaching'}
          icon={Inbox}
          title="No roles yet"
          description="Paste a posting to start."
          action={<button type="button">Add a role</button>}
        />,
      );
      const title = screen.getByText('No roles yet');
      const description = screen.getByText('Paste a posting to start.');
      const action = screen.getByRole('button', { name: 'Add a role' });
      expect(follows(title, description)).toBe(true);
      expect(follows(description, action)).toBe(true);
      // The title is a paragraph, never a heading, so it does not join the page outline.
      expect(screen.queryByRole('heading')).toBeNull();
      cleanup();
    }
  });
});
