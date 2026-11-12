import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Hash } from 'lucide-react';

afterEach(cleanup);
import { Tag } from './tag';

// A disabled Tag must not look like Default: the pill paints its own text
// colour, so the button's disabled:text-* alone never reaches the label.
describe('Tag disabled state', () => {
  it.each([false, true])('paints the disabled content colour on the pill (active=%s)', (active) => {
    render(
      <Tag disabled active={active}>
        Remote
      </Tag>,
    );
    const pill = screen.getByText('Remote');
    expect(pill.className).toContain(
      'group-disabled:text-[var(--semantic-color-content-disabled)]',
    );
  });
});

describe('Tag leading icon', () => {
  it('renders the icon before the label, hidden from assistive tech', () => {
    const { container } = render(<Tag icon={Hash}>tokens</Tag>);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('button', { name: 'tokens' })).toBeTruthy();
  });

  it('spaces the icon from the label with the shared token gap', () => {
    render(<Tag icon={Hash}>tokens</Tag>);
    const pill = screen.getByText('tokens').closest('span');
    expect(pill?.className).toContain('gap-scale-xs');
  });

  it('adds nothing without an icon', () => {
    const { container } = render(<Tag>tokens</Tag>);
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('shows the icon on a dismissible tag too', () => {
    const { container } = render(
      <Tag icon={Hash} onDismiss={() => {}}>
        tokens
      </Tag>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });
});

describe('Tag copied state', () => {
  it('swaps the label to "Copied" with a check icon and announces it politely', () => {
    const { container, rerender } = render(
      <Tag icon={Hash} copied={false}>
        #4f46e5
      </Tag>,
    );
    const live = screen.getByRole('status');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('');
    rerender(
      <Tag icon={Hash} copied>
        #4f46e5
      </Tag>,
    );
    expect(screen.getByRole('status').textContent).toBe('Copied');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    expect(screen.queryByText('#4f46e5')).toBeNull();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('takes a custom copiedLabel', () => {
    render(
      <Tag copied copiedLabel="Link copied">
        share
      </Tag>,
    );
    expect(screen.getByRole('status').textContent).toBe('Link copied');
  });

  it('works with onDismiss', () => {
    render(
      <Tag copied onDismiss={() => {}}>
        term
      </Tag>,
    );
    expect(screen.getByRole('status').textContent).toBe('Copied');
    expect(screen.getAllByText('Copied')).toHaveLength(2); // pill + live region
    expect(screen.getByRole('button', { name: 'Remove term' })).toBeTruthy();
  });
});
