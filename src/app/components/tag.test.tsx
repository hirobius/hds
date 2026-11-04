import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);
import { Tag } from './tag';

// A disabled Tag must not look like Default: the pill paints its own text
// colour, so the button's disabled:text-* alone never reaches the label.
describe('Tag disabled state', () => {
  it.each([false, true])('paints the disabled content colour on the pill (active=%s)', (active) => {
    render(
      <Tag disabled active={active}>
        Remote
      </Tag>,
    );
    const pill = screen.getByText('Remote');
    expect(pill.className).toContain(
      'group-disabled:text-[var(--semantic-color-content-disabled)]',
    );
  });
});
