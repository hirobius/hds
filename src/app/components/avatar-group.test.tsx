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
    expect(screen.getByLabelText('+2 more')).not.toBeNull();
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
