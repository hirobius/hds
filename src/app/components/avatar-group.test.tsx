import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AvatarGroup } from './avatar-group';
import { Avatar } from './avatar';

afterEach(cleanup);

describe('AvatarGroup', () => {
  it('renders every avatar when under the max', () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar alt="Ada Lovelace" />
        <Avatar alt="Alan Turing" />
      </AvatarGroup>,
    );
    expect(screen.getByText('AL')).not.toBeNull();
    expect(screen.getByText('AT')).not.toBeNull();
    expect(container.querySelector('[role="group"]')).not.toBeNull();
  });

  it('caps at max and shows a +N overflow chip', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar alt="Ada Lovelace" />
        <Avatar alt="Alan Turing" />
        <Avatar alt="Grace Hopper" />
        <Avatar alt="Katherine Johnson" />
      </AvatarGroup>,
    );
    expect(screen.getByText('+2')).not.toBeNull();
  });

  // aria-label on a role-less <span> is not reliably announced (ARIA prohibits
  // naming the generic role), so the count is real text: "+2" shown, " more" sr-only.
  it('reads the overflow chip as text, not as an aria-label on a span', () => {
    render(
      <AvatarGroup max={1}>
        <Avatar alt="Ada Lovelace" />
        <Avatar alt="Alan Turing" />
        <Avatar alt="Grace Hopper" />
      </AvatarGroup>,
    );
    const chip = screen.getByText('+2').parentElement as HTMLElement;
    expect(chip.textContent).toBe('+2 more');
    expect(chip.hasAttribute('aria-label')).toBe(false);
    expect(screen.getByText('more').className).toContain('sr-only');
  });

  it('does not render an overflow chip when count equals max', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar alt="Ada Lovelace" />
        <Avatar alt="Alan Turing" />
      </AvatarGroup>,
    );
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
