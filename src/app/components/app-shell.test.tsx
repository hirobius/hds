/**
 * Tests for AppShell (hds#875, slice 1 of #863): regions and landmarks, the
 * collapsible rail from `lg`, the sheet below `lg`, and the persisted collapse
 * state.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './app-shell';

const user = () => userEvent.setup({ pointerEventsCheck: 0 });

/** Stub matchMedia so `(min-width: 1024px)` (lg) matches when `wide`. */
function stubViewport(wide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: wide && /min-width:\s*(\d+)px/.test(query) && Number(RegExp.$1) <= 1024,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  try {
    window.localStorage.clear();
  } catch {
    /* storage unavailable */
  }
});

function Shell(props: Partial<React.ComponentProps<typeof AppShell>>) {
  return (
    <AppShell
      header={<span>Ops</span>}
      sidebar={<a href="#/home">Home</a>}
      aside={<p>Details</p>}
      {...props}
    >
      <h1>Pipeline</h1>
    </AppShell>
  );
}

describe('AppShell regions and landmarks', () => {
  it('renders banner, navigation, main and complementary landmarks (a11y:app-shell.landmarks)', () => {
    stubViewport(true);
    render(<Shell />);
    expect(screen.getByRole('banner').textContent).toContain('Ops');
    expect(screen.getByRole('navigation', { name: 'Main' }).textContent).toContain('Home');
    expect(screen.getByRole('main').textContent).toContain('Pipeline');
    expect(screen.getByRole('complementary', { name: 'Details' }).textContent).toContain('Details');
  });

  it('omits the aside when none is given', () => {
    stubViewport(true);
    render(<Shell aside={undefined} />);
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('names the sidebar and aside from props', () => {
    stubViewport(true);
    render(<Shell sidebarLabel="Sections" asideLabel="Job" />);
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Job' })).toBeTruthy();
  });

  it('marks itself for the manifest', () => {
    stubViewport(true);
    const { container } = render(<Shell />);
    expect(container.firstElementChild.getAttribute('data-hds-component')).toBe('AppShell');
  });
});

describe('AppShell rail (lg and up)', () => {
  it('starts expanded and collapses with the toggle', async () => {
    stubViewport(true);
    render(<Shell />);
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await user().click(toggle);
    const expand = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('navigation', { name: 'Main' }).getAttribute('data-collapsed')).toBe(
      'true',
    );
  });

  it('points the toggle at the navigation (a11y:app-shell.toggle-expanded)', () => {
    stubViewport(true);
    render(<Shell />);
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(toggle.getAttribute('aria-controls')).toBe(nav.id);
  });

  it('passes the collapse state to a sidebar render function', async () => {
    stubViewport(true);
    render(<Shell sidebar={({ collapsed }) => <span>{collapsed ? 'icons' : 'labels'}</span>} />);
    expect(screen.getByRole('navigation').textContent).toContain('labels');
    await user().click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('navigation').textContent).toContain('icons');
  });

  it('is controllable', async () => {
    stubViewport(true);
    const onCollapsedChange = vi.fn();
    render(<Shell collapsed onCollapsedChange={onCollapsedChange} />);
    const toggle = screen.getByRole('button', { name: 'Expand sidebar' });
    await user().click(toggle);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    // Controlled: stays collapsed until the parent changes the prop.
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
  });

  it('persists the collapse state under persistKey', async () => {
    stubViewport(true);
    const { unmount } = render(<Shell persistKey="ops-shell" />);
    await user().click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    unmount();
    render(<Shell persistKey="ops-shell" />);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy();
  });
});

describe('AppShell sheet (below lg)', () => {
  it('hides the sidebar behind a Menu button that opens a sheet named by sidebarLabel (a11y:app-shell.sheet-named)', async () => {
    stubViewport(false);
    render(<Shell />);
    expect(screen.queryByRole('navigation')).toBeNull();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    await user().click(menu);
    const dialog = await screen.findByRole('dialog', { name: 'Main' });
    expect(within(dialog).getByRole('navigation', { name: 'Main' }).textContent).toContain('Home');
  });

  it('closes the sheet with Escape and returns focus to the Menu button', async () => {
    stubViewport(false);
    render(<Shell />);
    const u = user();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    await u.click(menu);
    await screen.findByRole('dialog');
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(menu);
  });

  it('closes the sheet when a link in it is followed', async () => {
    stubViewport(false);
    render(<Shell />);
    const u = user();
    await u.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('link', { name: 'Home' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
