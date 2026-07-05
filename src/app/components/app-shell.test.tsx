import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AppShell } from './app-shell';

afterEach(cleanup);

describe('AppShell', () => {
  it('renders the header region with a banner role when provided', () => {
    render(
      <AppShell header={<span>Top bar</span>}>
        <div>Content</div>
      </AppShell>,
    );
    expect(screen.getByRole('banner').textContent).toBe('Top bar');
  });

  it('renders the sidebar region with a complementary role when provided', () => {
    render(
      <AppShell sidebar={<nav>Nav</nav>}>
        <div>Content</div>
      </AppShell>,
    );
    expect(screen.getByRole('complementary').textContent).toBe('Nav');
  });

  it('always renders main content with a main role', () => {
    render(
      <AppShell>
        <div>Only content</div>
      </AppShell>,
    );
    expect(screen.getByRole('main').textContent).toBe('Only content');
  });

  it('reflects the sidebarWidth prop on the sidebar data attribute', () => {
    render(
      <AppShell sidebar={<nav>Nav</nav>} sidebarWidth="lg">
        <div>Content</div>
      </AppShell>,
    );
    expect(screen.getByRole('complementary').getAttribute('data-sidebar-width')).toBe('lg');
  });
});
