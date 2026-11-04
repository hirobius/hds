import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useResetActiveOnListChange } from './listbox-nav';

type Row = { key: string; disabled?: boolean };

function setup(initial: { open: boolean; list: Row[] }) {
  return renderHook(
    (props: { open: boolean; list: Row[] }) => {
      const [activeIndex, setActiveIndex] = React.useState(5);
      useResetActiveOnListChange(props.open, props.list, (r) => r.key, setActiveIndex);
      return { activeIndex, setActiveIndex };
    },
    { initialProps: initial },
  );
}

describe('useResetActiveOnListChange', () => {
  it('does nothing on first render', () => {
    const { result } = setup({ open: true, list: [{ key: 'a' }] });
    expect(result.current.activeIndex).toBe(5);
  });

  it('moves the cursor to the first enabled row when the list changes', () => {
    const { result, rerender } = setup({ open: true, list: [{ key: 'a' }] });
    rerender({ open: true, list: [{ key: 'a', disabled: true }, { key: 'b' }] });
    expect(result.current.activeIndex).toBe(1);
  });

  it('moves the cursor when the list opens', () => {
    const list = [{ key: 'a' }, { key: 'b' }];
    const { result, rerender } = setup({ open: false, list });
    rerender({ open: true, list });
    expect(result.current.activeIndex).toBe(0);
  });

  it('keeps the cursor when a re-render passes an equal list', () => {
    const { result, rerender } = setup({ open: true, list: [{ key: 'a' }, { key: 'b' }] });
    act(() => result.current.setActiveIndex(1));
    rerender({ open: true, list: [{ key: 'a' }, { key: 'b' }] });
    expect(result.current.activeIndex).toBe(1);
  });
});
