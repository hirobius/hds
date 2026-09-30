/**
 * Tests for HoverCard. Plain-DOM assertions. Rendered in a controlled-open
 * state so the portalled content is asserted without simulating hover timing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { HoverCard } from './hover-card';

afterEach(cleanup);

describe('HoverCard', () => {
  it('renders only the trigger while closed', () => {
    render(
      <HoverCard>
        <HoverCard.Trigger>@ada</HoverCard.Trigger>
        <HoverCard.Content>Ada Lovelace</HoverCard.Content>
      </HoverCard>,
    );
    expect(screen.getByText('@ada')).not.toBeNull();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  it('renders the content when controlled open', () => {
    render(
      <HoverCard open>
        <HoverCard.Trigger>@ada</HoverCard.Trigger>
        <HoverCard.Content>Ada Lovelace</HoverCard.Content>
      </HoverCard>,
    );
    expect(screen.getByText('Ada Lovelace')).not.toBeNull();
  });
});

describe('HoverCard compound assembly (hds#365)', () => {
  const PARTS = ['Trigger', 'Content'] as const;

  it('does not write the parts onto the Radix Root export', () => {
    // The old assembly was `HoverCard = HoverCardPrimitive.Root as …; HoverCard.Trigger = …`,
    // the exact cast hds#367 removed from AlertDialog, Dialog and Card.
    expect(HoverCard).not.toBe(HoverCardPrimitive.Root);
    const root = HoverCardPrimitive.Root as unknown as Record<string, unknown>;
    for (const part of PARTS) expect(root[part], `Radix Root.${part}`).toBeUndefined();
  });

  it('keeps every static part and the display name', () => {
    expect(HoverCard.displayName).toBe('HoverCard');
    for (const part of PARTS) expect(HoverCard[part], part).toBeDefined();
    expect(HoverCard.Trigger).toBe(HoverCardPrimitive.Trigger);
  });

  it('still forwards root props to Radix (uncontrolled defaultOpen)', () => {
    render(
      <HoverCard defaultOpen>
        <HoverCard.Trigger>@ada</HoverCard.Trigger>
        <HoverCard.Content>Ada Lovelace</HoverCard.Content>
      </HoverCard>,
    );
    expect(screen.getByText('Ada Lovelace')).not.toBeNull();
  });
});
