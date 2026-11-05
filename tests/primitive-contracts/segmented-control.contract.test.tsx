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

/** Render a labelled control and return its radiogroup container. */
function renderGroup() {
  const { container } = render(
    <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} aria-label="View mode" />,
  );
  return container.querySelector('[role="radiogroup"]');
}

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
    const group = renderGroup();
    expect(group).not.toBeNull();
  });

  it('aria-label is applied to the radiogroup', () => {
    const group = renderGroup();
    expect(group?.getAttribute('aria-label')).toBe('View mode');
  });

  it('label prop renders visible label text', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} label="Sort by" />,
    );
    expect(container.textContent).toContain('Sort by');
  });

  it('a11y:segmented-control.focus-ring hds-focus class is applied to each button', () => {
    const { container } = render(
      <SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />,
    );
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.classList.contains('hds-focus')).toBe(true);
    });
  });
});

// hds#1214: the sm label's line box must fit the 22px segment (rail 32px, Button sm), and the
// selected primary label sits on the face above its 3px inset edge, not on the edge.
describe('SegmentedControl label fit (hds#1214)', () => {
  const labels = (size: 'sm' | 'md') => {
    const { container } = render(
      <SegmentedControl size={size} options={OPTIONS} value="a" onChange={() => {}} />,
    );
    return [...container.querySelectorAll('[role="radio"] > span:not([aria-hidden])')];
  };

  it('sm labels drop the 24px ui line box so the segment stays 22px', () => {
    for (const l of labels('sm')) expect(l.className).toContain('lineHeight-none');
  });

  it('md labels keep the ui line box', () => {
    for (const l of labels('md')) expect(l.className).not.toContain('lineHeight-none');
  });

  it('lifts only the selected primary label off the inset edge', () => {
    const [active, ...rest] = labels('sm');
    expect(active.className).toContain('-translate-y-px');
    for (const l of rest) expect(l.className).not.toContain('-translate-y-px');
  });

  it('does not lift the secondary label, which has no bottom edge', () => {
    const { container } = render(
      <SegmentedControl variant="secondary" options={OPTIONS} value="a" onChange={() => {}} />,
    );
    const active = container.querySelector('[aria-checked="true"] > span:not([aria-hidden])')!;
    expect(active.className).not.toContain('-translate-y-px');
  });
});
