/**
 * SegmentedControl icon-only options (hds#1439): an option takes an icon and an aria-label, shows
 * no text, keeps a 44px target and works in both the radiogroup and the link mode.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

const Glyph = ({ id }: { id: string }) => <svg data-testid={id} viewBox="0 0 8 8" />;

const ICONS = [
  { value: 'list', icon: <Glyph id="g-list" />, 'aria-label': 'List view' },
  { value: 'grid', icon: <Glyph id="g-grid" />, 'aria-label': 'Grid view' },
];

describe('SegmentedControl icon-only options (hds#1439)', () => {
  it('a11y:segmented-control.icon-only names each radio by its aria-label and shows the icon, no text', () => {
    render(<SegmentedControl aria-label="View" value="list" onChange={() => {}} options={ICONS} />);
    const list = screen.getByRole('radio', { name: 'List view' });
    expect(list.getAttribute('aria-checked')).toBe('true');
    expect(list.querySelector('[data-testid="g-list"]')).not.toBeNull();
    expect(list.textContent).toBe('');
    expect(screen.getByRole('radio', { name: 'Grid view' }).getAttribute('aria-checked')).toBe(
      'false',
    );
  });

  it('hides the icon from assistive tech so the name is the aria-label only', () => {
    render(<SegmentedControl aria-label="View" value="list" onChange={() => {}} options={ICONS} />);
    const icon = screen.getByTestId('g-list');
    expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('selects on click', () => {
    const onChange = vi.fn();
    render(<SegmentedControl aria-label="View" value="list" onChange={onChange} options={ICONS} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Grid view' }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });

  it.each(['sm', 'md'] as const)('keeps a 44px touch target in %s', (size) => {
    render(
      <SegmentedControl
        aria-label="View"
        value="list"
        onChange={() => {}}
        options={ICONS}
        size={size}
      />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.className).toContain('min-h-[var(--semantic-size-touchTarget)]');
      expect(radio.className).toContain('min-w-[var(--semantic-size-touchTarget)]');
    }
  });

  it('text options do not get the 44px floor', () => {
    render(
      <SegmentedControl
        aria-label="View"
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'A' }]}
      />,
    );
    expect(screen.getByRole('radio').className).not.toContain('--semantic-size-touchTarget');
  });

  it('keeps the indicator and concentric wiring', () => {
    render(<SegmentedControl aria-label="View" value="list" onChange={() => {}} options={ICONS} />);
    const radio = screen.getByRole('radio', { name: 'List view' });
    expect(radio.className).toContain('rounded-[var(--seg-inner-radius)]');
    expect(radio.querySelector('[aria-hidden="true"]')!.className).toContain(
      'bg-[var(--semantic-accent-rest)]',
    );
  });

  it('works in link mode: links named by aria-label, current one aria-current', () => {
    render(
      <SegmentedControl
        aria-label="Section"
        value="grid"
        options={[
          { ...ICONS[0], href: '/list' },
          { ...ICONS[1], href: '/grid' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Section' })).not.toBeNull();
    const grid = screen.getByRole('link', { name: 'Grid view' });
    expect(grid.getAttribute('aria-current')).toBe('page');
    expect(grid.getAttribute('href')).toBe('/grid');
    expect(grid.className).toContain('min-h-[var(--semantic-size-touchTarget)]');
    expect(grid.textContent).toBe('');
  });

  it('warns in development when an icon-only option has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <SegmentedControl
        aria-label="View"
        value="x"
        onChange={() => {}}
        // @ts-expect-error aria-label is required on an icon-only option
        options={[{ value: 'x', icon: <Glyph id="g-x" /> }]}
      />,
    );
    expect(warn.mock.calls.some((c) => String(c[0]).includes('icon-only'))).toBe(true);
    warn.mockRestore();
  });
});
