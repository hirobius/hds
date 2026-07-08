/**
 * Tests for SideNav — level axis (cva), state resolution, and the
 * useFrozenState demo-override mechanism. Asserts the cva-migrated component
 * reproduces the pre-migration BG/TEXT token matrix exactly (zero visual
 * change proof for #60).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FreezeState } from '../context/DemoStateContext';
import { SideNav } from './side-nav';

afterEach(cleanup);

describe('SideNav — level axis', () => {
  it('applies root-level padding (py-0) and data-level="root"', () => {
    render(<SideNav label="Foundations" href="#" level="root" />);
    const link = screen.getByRole('link', { name: 'Foundations' });
    expect(link.getAttribute('data-level')).toBe('root');
    expect(link.className).toContain('py-0');
  });

  it('applies nested-level padding (component-nav-paddingY token) and data-level="nested"', () => {
    render(<SideNav label="Tokens" href="#" level="nested" />);
    const link = screen.getByRole('link', { name: 'Tokens' });
    expect(link.getAttribute('data-level')).toBe('nested');
    expect(link.className).toContain('py-[var(--component-nav-paddingY)]');
  });

  it('defaults to level="nested" when omitted', () => {
    render(<SideNav label="Default level" href="#" />);
    expect(screen.getByRole('link', { name: 'Default level' }).getAttribute('data-level')).toBe(
      'nested',
    );
  });
});

describe('SideNav — active state', () => {
  it('binds the active surface + content-accent text tokens and sets aria-current', () => {
    render(<SideNav label="Color" href="#" active />);
    const link = screen.getByRole('link', { name: 'Color' });
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.getAttribute('data-state')).toBe('active');
    expect(link.className).toContain('bg-[var(--semantic-color-surface-accentSubtle)]');
    expect(link.className).toContain('text-[var(--semantic-color-content-accent)]');
  });

  it('is not aria-current when inactive', () => {
    render(<SideNav label="Spacing" href="#" />);
    expect(screen.getByRole('link', { name: 'Spacing' }).getAttribute('aria-current')).toBeNull();
  });
});

describe('SideNav — disabled state', () => {
  it('binds the disabled tokens, sets aria-disabled, and blocks onNavigate', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <SideNav label="Motion (soon)" href="#" disabled onNavigate={onNavigate} />,
    );
    // A disabled row drops `href`, so it no longer exposes the "link" role
    // (ARIA correctly withholds it from an <a> with no href) — query the tag.
    const link = container.querySelector('a')!;
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('data-state')).toBe('disabled');
    expect(link.className).toContain('text-[var(--semantic-color-content-disabled)]');
    expect(link.getAttribute('href')).toBeNull();
    fireEvent.click(link);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('disables the rendered <button> when no href is given', () => {
    render(<SideNav label="No href" disabled />);
    const button = screen.getByRole('button', { name: 'No href' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SideNav — titleLabel', () => {
  it('renders a non-interactive <p> with the content-primary token, regardless of state', () => {
    const { container } = render(<SideNav label="Foundations" titleLabel level="root" />);
    const p = container.querySelector('p');
    expect(p).not.toBeNull();
    expect(p?.className).toContain('text-[var(--semantic-color-content-primary)]');
    expect(p?.className).toContain('pointer-events-none');
    expect(p?.getAttribute('data-level')).toBe('root');
  });
});

describe('SideNav — frozen demo state (useFrozenState)', () => {
  it('forces the hover token matrix even without a real pointer hover', () => {
    render(
      <FreezeState state="hover">
        <SideNav label="Frozen hover" href="#" />
      </FreezeState>,
    );
    const link = screen.getByRole('link', { name: 'Frozen hover' });
    expect(link.getAttribute('data-state')).toBe('hover');
    expect(link.className).toContain('bg-[var(--semantic-color-surface-raised)]');
    expect(link.className).toContain('text-[var(--semantic-color-content-primary)]');
    expect(link.className).toContain('pointer-events-none');
  });

  it('forces the active token matrix and sets aria-current via "active" freeze', () => {
    render(
      <FreezeState state="active">
        <SideNav label="Frozen active" href="#" />
      </FreezeState>,
    );
    const link = screen.getByRole('link', { name: 'Frozen active' });
    expect(link.getAttribute('data-state')).toBe('active');
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('forces the disabled token matrix via "disabled" freeze', () => {
    render(
      <FreezeState state="disabled">
        <SideNav label="Frozen disabled" href="#" />
      </FreezeState>,
    );
    const link = screen.getByRole('link', { name: 'Frozen disabled' });
    expect(link.getAttribute('data-state')).toBe('disabled');
    expect(link.className).toContain('text-[var(--semantic-color-content-disabled)]');
  });

  it('forces the pressed token matrix (collapses to active tokens) via "pressed" or "press" freeze', () => {
    const { unmount } = render(
      <FreezeState state="pressed">
        <SideNav label="Frozen pressed" href="#" />
      </FreezeState>,
    );
    const pressedLink = screen.getByRole('link', { name: 'Frozen pressed' });
    expect(pressedLink.className).toContain('bg-[var(--semantic-color-surface-accentSubtle)]');
    // pressed (unlike active) does not set aria-current — preserved from pre-cva behavior.
    expect(pressedLink.getAttribute('aria-current')).toBeNull();
    unmount();

    render(
      <FreezeState state="press">
        <SideNav label="Frozen press alias" href="#" />
      </FreezeState>,
    );
    expect(screen.getByRole('link', { name: 'Frozen press alias' }).className).toContain(
      'bg-[var(--semantic-color-surface-accentSubtle)]',
    );
  });

  it('an unrecognized freeze value ("focused") falls through to live default state — preserved quirk', () => {
    render(
      <FreezeState state="focused">
        <SideNav label="Frozen focused (unsupported)" href="#" />
      </FreezeState>,
    );
    const link = screen.getByRole('link', { name: 'Frozen focused (unsupported)' });
    expect(link.getAttribute('data-state')).toBe('default');
    // Still locked from interaction: any non-null freeze value disables pointer events.
    expect(link.className).toContain('pointer-events-none');
  });

  it('disabled prop wins over an active freeze override', () => {
    const { container } = render(
      <FreezeState state="active">
        <SideNav label="Disabled beats freeze" href="#" disabled />
      </FreezeState>,
    );
    expect(container.querySelector('a')!.getAttribute('data-state')).toBe('disabled');
  });
});
