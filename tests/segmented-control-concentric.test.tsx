/**
 * hds#1468: the selected pill and each segment round at the rail's radius minus its padding and
 * border, so the curves stay concentric. jsdom cannot measure radii, so this pins the wiring
 * (the browser measurement is tests/visual/segmented-control-corners.spec.ts): the rail exposes
 * the inset as --seg-rail-pad from railPadding, and the segment and indicator read
 * --seg-inner-radius instead of a fixed rounded-md.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SegmentedControl } from '../src/app/components/segmented-control';

const options = [
  { value: 'a', label: 'Day' },
  { value: 'b', label: 'Week' },
];

function rail(railPadding?: string | number) {
  render(
    <SegmentedControl
      aria-label="Range"
      options={options}
      value="a"
      onChange={() => {}}
      railPadding={railPadding}
    />,
  );
  return screen.getByRole('radiogroup');
}

afterEach(cleanup);

describe('SegmentedControl concentric corners (hds#1468)', () => {
  it('derives the inner radius from the rail radius, padding and border', () => {
    const el = rail();
    expect(el.className).toContain(
      '[--seg-rail-radius:calc(var(--role-radius)+min(var(--role-radius),4px))]',
    );
    expect(el.className).toContain(
      '[--seg-inner-radius:max(0px,calc(var(--seg-rail-radius)-var(--seg-rail-pad)-1px))]',
    );
    expect(el.className).toContain('rounded-[var(--seg-rail-radius)]');
  });

  it('segments and the indicator use the inner radius, not a fixed rounded-md', () => {
    const el = rail();
    const seg = screen.getAllByRole('radio')[0];
    const indicator = seg.querySelector('[aria-hidden="true"]')!;
    for (const node of [seg, indicator]) {
      expect(node.className).toContain('rounded-[var(--seg-inner-radius)]');
      expect(node.className).not.toMatch(/(^|\s)rounded-md(\s|$)/);
    }
    expect(el.style.getPropertyValue('--seg-rail-pad')).toBe('4px');
  });

  it.each([
    ['2px', '2px'],
    [6, '6px'],
    ['4px 12px', '4px'],
  ])('railPadding %s sets --seg-rail-pad to %s', (padding, expected) => {
    const el = rail(padding);
    expect(el.style.getPropertyValue('--seg-rail-pad')).toBe(expected);
  });
});
