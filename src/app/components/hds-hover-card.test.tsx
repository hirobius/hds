/**
 * Tests for HdsHoverCard. Plain-DOM assertions. Rendered in a controlled-open
 * state so the portalled content is asserted without simulating hover timing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsHoverCard } from './hds-hover-card';

afterEach(cleanup);

describe('HdsHoverCard', () => {
  it('renders only the trigger while closed', () => {
    render(
      <HdsHoverCard>
        <HdsHoverCard.Trigger>@ada</HdsHoverCard.Trigger>
        <HdsHoverCard.Content>Ada Lovelace</HdsHoverCard.Content>
      </HdsHoverCard>,
    );
    expect(screen.getByText('@ada')).not.toBeNull();
    expect(screen.queryByText('Ada Lovelace')).toBeNull();
  });

  it('renders the content when controlled open', () => {
    render(
      <HdsHoverCard open>
        <HdsHoverCard.Trigger>@ada</HdsHoverCard.Trigger>
        <HdsHoverCard.Content>Ada Lovelace</HdsHoverCard.Content>
      </HdsHoverCard>,
    );
    expect(screen.getByText('Ada Lovelace')).not.toBeNull();
  });
});
