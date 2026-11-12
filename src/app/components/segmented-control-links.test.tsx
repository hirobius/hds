/**
 * SegmentedControl link mode (hds#1438): options with an `href` render a nav holding a list of
 * links, the current one marked aria-current="page", routed through the router adapter.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { HdsRouterProvider } from '../context/RouterContext';
import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

const LINKS = [
  { value: 'find', label: 'Find', href: '/find' },
  { value: 'apply', label: 'Apply', href: '/apply' },
  { value: 'docs', label: 'Docs', href: 'https://example.com/docs' },
];

function setup(value = 'find', extra: Record<string, unknown> = {}) {
  return render(
    <SegmentedControl aria-label="Sections" value={value} options={LINKS} {...extra} />,
  );
}

describe('SegmentedControl link mode (hds#1438)', () => {
  it('a11y:segmented-control.link-mode is a named nav holding a list of links, not a radiogroup', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const list = within(nav).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(nav).getAllByRole('link')).toHaveLength(3);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders real anchors with the href', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Apply' }).getAttribute('href')).toBe('/apply');
  });

  it('marks only the current segment aria-current="page"', () => {
    setup('apply');
    expect(screen.getByRole('link', { name: 'Apply' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Find' }).getAttribute('aria-current')).toBeNull();
  });

  it('marks none current when the value matches no option', () => {
    setup('missing');
    for (const a of screen.getAllByRole('link')) expect(a.getAttribute('aria-current')).toBeNull();
  });

  it('keeps the selected pill indicator and the concentric radius wiring', () => {
    setup('find');
    const a = screen.getByRole('link', { name: 'Find' });
    const indicator = a.querySelector('[aria-hidden="true"]')!;
    expect(indicator.className).toContain('rounded-[var(--seg-inner-radius)]');
    expect(indicator.className).toContain('bg-[var(--semantic-accent-rest)]');
    expect(a.className).toContain('rounded-[var(--seg-inner-radius)]');
    const rail = screen.getByRole('list');
    expect(rail.className).toContain('rounded-[var(--seg-rail-radius)]');
    expect(rail.style.getPropertyValue('--seg-rail-pad')).toBe('4px');
  });

  it('calls onChange with the value on click without blocking navigation', () => {
    const onChange = vi.fn();
    setup('find', { onChange });
    const link = screen.getByRole('link', { name: 'Apply' });
    const notPrevented = fireEvent.click(link);
    expect(onChange).toHaveBeenCalledWith('apply');
    expect(notPrevented).toBe(true);
  });

  it('routes internal hrefs through the router adapter link component', () => {
    const seen: string[] = [];
    render(
      <HdsRouterProvider
        adapter={{
          navigate: () => {},
          currentPath: '/find',
          LinkComponent: ({ to, children, ...rest }) => {
            seen.push(to);
            return (
              <a href={to} data-router="1" {...rest}>
                {children}
              </a>
            );
          },
        }}
      >
        <SegmentedControl aria-label="Sections" value="find" options={LINKS} />
      </HdsRouterProvider>,
    );
    expect(seen).toContain('/find');
    expect(screen.getByRole('link', { name: 'Find' }).getAttribute('data-router')).toBe('1');
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('data-router')).toBeNull();
  });

  it('refuses a javascript: href', () => {
    render(
      <SegmentedControl
        aria-label="S"
        value="a"
        options={[{ value: 'a', label: 'A', href: 'javascript:alert(1)' }]}
      />,
    );
    expect(screen.getByRole('link', { name: 'A' }).getAttribute('href')).toBe(
      'about:blank#blocked',
    );
  });

  it('shows the visible label above the nav and names it', () => {
    render(<SegmentedControl label="Section" value="find" options={LINKS} />);
    expect(screen.getByRole('navigation', { name: 'Section' })).not.toBeNull();
  });
});
