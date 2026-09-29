import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OverflowList } from './overflow-list';

afterEach(cleanup);

describe('OverflowList', () => {
  it('renders every child when max is unset', () => {
    const { container } = render(
      <OverflowList>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </OverflowList>,
    );
    expect(container.querySelectorAll('[role="listitem"]').length).toBe(3);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it('caps to max and shows a +N chip with the correct count and aria-label', () => {
    const { container } = render(
      <OverflowList max={2}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
        <span>d</span>
      </OverflowList>,
    );
    expect(container.querySelectorAll('[role="listitem"]').length).toBe(3);
    expect(screen.getByText('+2')).not.toBeNull();
    expect(screen.getByText('more')).not.toBeNull();
  });

  it('renders every direct child of the list as a listitem, including the overflow node', () => {
    const { container } = render(
      <OverflowList max={1}>
        <span>a</span>
        <span>b</span>
      </OverflowList>,
    );
    const list = container.querySelector('[role="list"]') as HTMLElement;
    expect(list.children.length).toBe(2);
    for (const child of Array.from(list.children)) {
      expect(child.getAttribute('role')).toBe('listitem');
    }
    expect(container.querySelector('span[aria-label]')).toBeNull();
  });

  it('wraps a custom renderOverflow node in a listitem', () => {
    const { container } = render(
      <OverflowList max={1} renderOverflow={(n) => <button>{n} hidden</button>}>
        <span>a</span>
        <span>b</span>
      </OverflowList>,
    );
    const list = container.querySelector('[role="list"]') as HTMLElement;
    expect(list.lastElementChild?.getAttribute('role')).toBe('listitem');
  });

  it('uses a custom renderOverflow node when provided', () => {
    render(
      <OverflowList max={1} renderOverflow={(count) => <span>custom-{count}</span>}>
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </OverflowList>,
    );
    expect(screen.getByText('custom-2')).not.toBeNull();
  });

  it('reflects the overflow count on the data-overflow attribute', () => {
    const { container } = render(
      <OverflowList max={1}>
        <span>a</span>
        <span>b</span>
      </OverflowList>,
    );
    expect(container.querySelector('[role="list"]')?.getAttribute('data-overflow')).toBe('1');
  });
});
