/**
 * A label that turns semibold when selected must not change its box, or its neighbours
 * shift on every selection (the SegmentedControl md shot went 103px to 104px, #1593).
 * Plain-text labels carry data-text; CSS draws a hidden zero-height semibold copy, so the
 * box is always the semibold width and the DOM still holds one text.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SelectedWidth } from './selected-width';
import { Tabs, TabsList, TabsTrigger } from './tabs';
import { Tag } from './tag';
import { SegmentedControl } from './segmented-control';

afterEach(cleanup);

describe('SelectedWidth', () => {
  it('carries the label as data-text for the hidden semibold copy, with one DOM text', () => {
    const { container } = render(<SelectedWidth>Overview</SelectedWidth>);
    const box = container.firstElementChild!;
    expect(box.className).toContain('hds-selected-width');
    expect(box.getAttribute('data-text')).toBe('Overview');
    expect(screen.getAllByText('Overview')).toHaveLength(1);
  });

  it('renders non-text children unchanged, with no copy', () => {
    const { container } = render(
      <SelectedWidth>
        <b>rich</b>
      </SelectedWidth>,
    );
    expect(container.querySelector('.hds-selected-width')).toBeNull();
    expect(container.innerHTML).toBe('<b>rich</b>');
  });
});

describe('selected labels reserve their semibold width', () => {
  it('Tabs trigger, Tag and SegmentedControl keep one accessible name', () => {
    render(
      <>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">Overview</TabsTrigger>
            <TabsTrigger value="b">Props</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tag active>Remote</Tag>
        <SegmentedControl
          aria-label="Mode"
          value="r"
          onChange={() => {}}
          options={[
            { value: 'r', label: 'Review' },
            { value: 'a', label: 'Apply' },
          ]}
        />
      </>,
    );
    for (const el of [
      screen.getByRole('tab', { name: 'Overview' }),
      screen.getByRole('button', { name: 'Remote' }),
      screen.getByRole('radio', { name: 'Apply' }),
    ]) {
      expect(el.querySelector('.hds-selected-width')).not.toBeNull();
    }
  });
});
