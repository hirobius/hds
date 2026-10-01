/**
 * Tests for Tooltip (hds-tooltip.tsx). Plain-DOM assertions. Rendered in a
 * controlled-open state so the portalled bubble is asserted without hover
 * timing; the shared jsdom setup polyfills what Radix/Floating UI touch.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Tooltip } from './hds-tooltip';

afterEach(cleanup);

describe('Tooltip', () => {
  it('renders only the trigger while closed', () => {
    render(
      <Tooltip>
        <Tooltip.Trigger>Copy</Tooltip.Trigger>
        <Tooltip.Content>Copy link</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Copy' })).not.toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders the bubble with role=tooltip when controlled open, without an app-level provider', () => {
    render(
      <Tooltip open>
        <Tooltip.Trigger>Copy</Tooltip.Trigger>
        <Tooltip.Content>Copy link</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Copy link');
    expect(screen.getByRole('button', { name: 'Copy' }).getAttribute('data-state')).not.toBe(
      'closed',
    );
  });

  // hds#393: a tooltip is a floating surface (semantic.elevation.floating), like
  // a popover or dropdown; shadow.overlay is reserved for dialogs and sheets.
  // Figma 93:15 binds shadow/floating too.
  it('casts the floating shadow, not the modal overlay shadow', () => {
    render(
      <Tooltip open>
        <Tooltip.Trigger>Copy</Tooltip.Trigger>
        <Tooltip.Content>Copy link</Tooltip.Content>
      </Tooltip>,
    );
    const bubble = document.querySelector('[data-side]') as HTMLElement;
    expect(bubble.textContent).toContain('Copy link');
    expect(bubble.className).toContain('shadow-floating');
    expect(bubble.className).not.toContain('shadow-overlay');
  });
});

describe('Tooltip compound assembly (hds#365)', () => {
  const PARTS = ['Trigger', 'Content'] as const;

  it('does not write the parts onto the Radix Root export', () => {
    expect(Tooltip).not.toBe(TooltipPrimitive.Root);
    const root = TooltipPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of PARTS) expect(root[part], `Radix Root.${part}`).toBeUndefined();
  });

  it('keeps every static part and the display name', () => {
    expect(Tooltip.displayName).toBe('Tooltip');
    for (const part of PARTS) expect(Tooltip[part], part).toBeDefined();
    expect(Tooltip.Trigger).toBe(TooltipPrimitive.Trigger);
  });
});
