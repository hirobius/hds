/**
 * Contract test: SegmentedControl
 * Verifies the radiogroup/radio semantics (Radix ToggleGroup, type="single"):
 * role="radiogroup" container, role="radio" items, and aria-checked on the
 * selected option. (Upgraded from the prior aria-pressed toggle-button model.)
 *
 * @primitive SegmentedControl
 * @unit 12p-test-contract-tests-primitives
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SegmentedControl } from '@/app/components/segmented-control';

const OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('SegmentedControl contract', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a button for each option', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(OPTIONS.length);
  });

  it('each option renders as role="radio"', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />,
    );
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(OPTIONS.length);
  });

  it('active option has aria-checked="true"', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="b" onChange={() => {}} />,
    );
    const buttons = container.querySelectorAll('button');
    const activeBtn = Array.from(buttons).find((b) => b.textContent?.includes('Option B'));
    expect(activeBtn?.getAttribute('aria-checked')).toBe('true');
  });

  it('inactive options have aria-checked="false"', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />,
    );
    const buttons = container.querySelectorAll('button');
    const inactiveButtons = Array.from(buttons).filter((b) => !b.textContent?.includes('Option A'));
    inactiveButtons.forEach((btn) => {
      expect(btn.getAttribute('aria-checked')).toBe('false');
    });
  });

  it('renders a radiogroup role container', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} aria-label="View mode" />,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group).not.toBeNull();
  });

  it('aria-label is applied to the radiogroup', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} aria-label="View mode" />,
    );
    const group = container.querySelector('[role="radiogroup"]');
    expect(group?.getAttribute('aria-label')).toBe('View mode');
  });

  it('label prop renders visible label text', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} label="Sort by" />,
    );
    expect(container.textContent).toContain('Sort by');
  });

  it('hds-focus class is applied to each button', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />,
    );
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.classList.contains('hds-focus')).toBe(true);
    });
  });
});
