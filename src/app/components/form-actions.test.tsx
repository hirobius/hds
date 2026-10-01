import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FormActions } from './form-actions';

afterEach(cleanup);

const follows = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

const row = (container: HTMLElement) =>
  container.querySelector(
    '[data-hds-component="FormActions"] > [data-hds-component="Stack"]',
  ) as HTMLElement;

describe('FormActions', () => {
  it('puts the primary after the secondary in DOM order', () => {
    render(
      <FormActions
        primary={<button type="submit">Save</button>}
        secondary={<button type="button">Cancel</button>}
      />,
    );
    expect(follows(screen.getByText('Cancel'), screen.getByText('Save'))).toBe(true);
  });

  it('puts the primary last of all, after a destructive action', () => {
    render(
      <FormActions
        primary={<button type="submit">Save</button>}
        secondary={<button type="button">Cancel</button>}
        destructive={<button type="button">Delete</button>}
      />,
    );
    const delBtn = screen.getByText('Delete');
    expect(follows(delBtn, screen.getByText('Cancel'))).toBe(true);
    expect(follows(screen.getByText('Cancel'), screen.getByText('Save'))).toBe(true);
  });

  it('right-aligns the row when there is no destructive action', () => {
    const { container } = render(<FormActions primary={<button type="submit">Save</button>} />);
    expect(row(container).style.justifyContent).toBe('flex-end');
  });

  it('separates a destructive action from the primary/secondary group', () => {
    const { container } = render(
      <FormActions
        primary={<button type="submit">Save</button>}
        destructive={<button type="button">Delete</button>}
      />,
    );
    expect(row(container).style.justifyContent).toBe('space-between');
  });

  it('is not sticky by default and sticks to the bottom when asked', () => {
    const off = render(<FormActions primary={<button type="submit">Save</button>} />);
    expect(off.container.querySelector('[data-sticky="true"]')).toBeNull();
    off.unmount();
    const on = render(<FormActions sticky primary={<button type="submit">Save</button>} />);
    const root = on.container.querySelector('[data-hds-component="FormActions"]') as HTMLElement;
    expect(root.getAttribute('data-sticky')).toBe('true');
    expect(root.style.position).toBe('sticky');
  });

  it('keeps the primary/secondary group right-aligned when the row wraps', () => {
    const { container } = render(
      <FormActions
        primary={<button type="submit">Save</button>}
        secondary={<button type="button">Cancel</button>}
        destructive={<button type="button">Delete</button>}
      />,
    );
    const group = screen.getByText('Save').closest('[data-slot="group"]') as HTMLElement;
    expect(group).not.toBeNull();
    expect(group.classList.contains('ml-auto')).toBe(true);
    expect(group.contains(screen.getByText('Cancel'))).toBe(true);
    expect(container.querySelector('[data-slot="destructive"]')?.contains(group)).toBe(false);
  });
});
