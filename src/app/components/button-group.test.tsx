import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ButtonGroup } from './button-group';
import { Button } from './button';

afterEach(cleanup);

describe('ButtonGroup', () => {
  it('renders its button children within a group', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole('group');
    expect(group.querySelectorAll('button')).toHaveLength(2);
  });

  it('defaults the orientation to horizontal', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group').getAttribute('data-orientation')).toBe('horizontal');
  });

  it('reflects a vertical orientation', () => {
    render(
      <ButtonGroup orientation="vertical">
        <Button>One</Button>
      </ButtonGroup>,
    );
    expect(screen.getByRole('group').getAttribute('data-orientation')).toBe('vertical');
  });
});
