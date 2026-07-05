/**
 * Tests for HoverCard. Plain-DOM assertions. Rendered in a controlled-open
 * state so the portalled content is asserted without simulating hover timing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
