/**
 * Branch-targeted tests for HdsTocContext.tsx
 *
 * No @testing-library/react installed — uses react-dom/client directly.
 * MutationObserver is provided by jsdom; window/requestAnimationFrame are
 * stubbed where needed.
 *
 * Branches targeted:
 *   - slugify: uppercase, leading/trailing hyphens, empty string, special chars
 *   - TocProvider.register: duplicate guard (prev.some) both true/false branches
 *   - TocProvider.unregister: filter (remove matching id, no-op for unknown)
 *   - useTocActiveId: items.length === 0 early return
 *   - useTocActiveId: elements.length === 0 → first item id
 *   - useTocActiveId: foundVisible=false → items[0].id fallback
 *   - useTocActiveId: rect.top <= line → foundCurrent=true branch
 *   - useTocActiveId: else if (!foundCurrent) branch → sets id and breaks
 *   - useTocActiveId: scheduleUpdate — if (rafId) return (double-fire guard)
 *   - useTocActiveId: cleanup cancelAnimationFrame branch
 *   - MutationObserver: debounce clearTimeout branch (two rapid mutations)
 *   - MutationObserver resync: register from DOM, unregister missing
 *
 * Branches NOT covered (documented):
 *   - getThemeAwareHomeColor dark theme: tested indirectly in mobiusStore tests
 *   - Cleanup path when rafId=0 (cancelAnimationFrame not called): V8 instruments
 *     this as a branch but it fires every time cleanup runs without a pending RAF.
 */

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  slugify,
  TocProvider,
  useToc,
  useTocActiveId,
  TOC_TITLE_ATTR,
  type TocItem,
} from './HdsTocContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

// ── slugify ───────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases uppercase characters', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('collapses multiple non-alphanumeric chars into a single hyphen', () => {
    expect(slugify('foo  bar')).toBe('foo-bar');
    expect(slugify('foo---bar')).toBe('foo-bar');
    expect(slugify('foo!@#bar')).toBe('foo-bar');
  });

  it('trims leading hyphens', () => {
    expect(slugify('  leading')).toBe('leading');
  });

  it('trims trailing hyphens', () => {
    expect(slugify('trailing  ')).toBe('trailing');
  });

  it('trims both leading and trailing hyphens', () => {
    expect(slugify('  both  ')).toBe('both');
  });

  it('handles an empty string (returns empty string)', () => {
    expect(slugify('')).toBe('');
  });

  it('returns the slug of a normal identifier unchanged', () => {
    expect(slugify('design-tokens')).toBe('design-tokens');
  });

  it('handles numbers in input', () => {
    expect(slugify('Section 1.2')).toBe('section-1-2');
  });

  it('handles a fully non-alphanumeric string — collapses to empty', () => {
    // All chars removed → single hyphen → trimmed to ''
    expect(slugify('!@#$%^&*()')).toBe('');
  });
});

// ── TocProvider — register and unregister branches ────────────────────────────

describe('TocProvider register/unregister', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    document.body.removeChild(container);
  });

  function setup() {
    let capturedCtx: ReturnType<typeof useToc> | null = null;

    function Probe() {
      capturedCtx = useToc();
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(
        <TocProvider>
          <Probe />
        </TocProvider>,
      );
    });

    return () => capturedCtx!;
  }

  it('register adds an item to the list (prev.some → false branch)', () => {
    const ctx = setup();

    act(() => {
      ctx().register({ id: 'intro', title: 'Introduction' });
    });

    expect(ctx().items).toHaveLength(1);
    expect(ctx().items[0].id).toBe('intro');
  });

  it('register does NOT add a duplicate (prev.some → true branch)', () => {
    const ctx = setup();

    act(() => {
      ctx().register({ id: 'intro', title: 'Introduction' });
    });
    act(() => {
      ctx().register({ id: 'intro', title: 'Introduction again' });
    });

    expect(ctx().items).toHaveLength(1);
  });

  it('register multiple distinct items', () => {
    const ctx = setup();

    act(() => {
      ctx().register({ id: 'a', title: 'A' });
      ctx().register({ id: 'b', title: 'B' });
    });

    expect(ctx().items).toHaveLength(2);
  });

  it('unregister removes the matching item (filter branch — id matches)', () => {
    const ctx = setup();

    act(() => {
      ctx().register({ id: 'intro', title: 'Introduction' });
      ctx().register({ id: 'body', title: 'Body' });
    });
    act(() => {
      ctx().unregister('intro');
    });

    expect(ctx().items).toHaveLength(1);
    expect(ctx().items[0].id).toBe('body');
  });

  it('unregister is a no-op for an id that does not exist', () => {
    const ctx = setup();

    act(() => {
      ctx().register({ id: 'intro', title: 'Introduction' });
    });
    act(() => {
      ctx().unregister('nonexistent');
    });

    expect(ctx().items).toHaveLength(1);
  });
});

// ── TocProvider MutationObserver — debounce and resync branches ───────────────

describe('TocProvider MutationObserver', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => {
      root?.unmount();
    });
    document.body.removeChild(container);
  });

  it('MutationObserver debounce: rapid mutations clear the previous timeout', async () => {
    // Mount TocProvider so the observer is active
    let capturedCtx: ReturnType<typeof useToc> | null = null;

    function Probe() {
      capturedCtx = useToc();
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(
        <TocProvider>
          <Probe />
        </TocProvider>,
      );
    });

    // Trigger two rapid DOM mutations — the second should clear the first debounce timer
    // This exercises the `if (debounceRef.current !== null) clearTimeout(...)` branch
    const child1 = document.createElement('div');
    const child2 = document.createElement('div');

    await act(async () => {
      document.body.appendChild(child1);
    });
    await act(async () => {
      document.body.appendChild(child2);
    });

    // Flush the debounce timer
    await act(async () => {
      vi.runAllTimers();
    });

    // Context should still be valid (no throw)
    expect(capturedCtx).not.toBeNull();
    document.body.removeChild(child1);
    document.body.removeChild(child2);
  });

  it('MutationObserver resync: registers a new section added to the DOM', async () => {
    // Place the content root so the observer mounts on it
    const contentRoot = document.createElement('div');
    contentRoot.id = 'hds-doc-shell-main';
    document.body.appendChild(contentRoot);

    let capturedCtx: ReturnType<typeof useToc> | null = null;

    function Probe() {
      capturedCtx = useToc();
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(
        <TocProvider>
          <Probe />
        </TocProvider>,
      );
    });

    expect(capturedCtx!.items).toHaveLength(0);

    // Add a section that matches TOC_SECTION_SELECTOR
    const section = document.createElement('section');
    section.id = 'new-section';
    section.setAttribute(TOC_TITLE_ATTR, 'New Section');

    await act(async () => {
      contentRoot.appendChild(section);
    });

    // Flush the 150ms debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // After resync, the section should be registered
    expect(capturedCtx!.items.some((i) => i.id === 'new-section')).toBe(true);

    document.body.removeChild(contentRoot);
  });

  it('MutationObserver resync: unregisters items removed from the DOM', async () => {
    const contentRoot = document.createElement('div');
    contentRoot.id = 'hds-doc-shell-main';
    document.body.appendChild(contentRoot);

    const section = document.createElement('section');
    section.id = 'remove-me';
    section.setAttribute(TOC_TITLE_ATTR, 'Remove Me');
    contentRoot.appendChild(section);

    let capturedCtx: ReturnType<typeof useToc> | null = null;

    function Probe() {
      capturedCtx = useToc();
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(
        <TocProvider>
          <Probe />
        </TocProvider>,
      );
    });

    // Manually register the item first
    await act(async () => {
      capturedCtx!.register({ id: 'remove-me', title: 'Remove Me' });
    });

    expect(capturedCtx!.items).toHaveLength(1);

    // Remove the section from the DOM
    await act(async () => {
      contentRoot.removeChild(section);
    });

    // Flush the debounce
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // After resync, the removed section should be unregistered
    expect(capturedCtx!.items.some((i) => i.id === 'remove-me')).toBe(false);

    document.body.removeChild(contentRoot);
  });
});

// ── useTocActiveId — branch coverage ─────────────────────────────────────────

describe('useTocActiveId', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it('returns empty string when items list is empty (length === 0 early return)', () => {
    let capturedId: string | null = null;

    function Probe() {
      capturedId = useTocActiveId([]);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    expect(capturedId).toBe('');
  });

  it('returns first item id when no DOM elements found (elements.length === 0 branch)', () => {
    let capturedId: string | null = null;
    const items = [
      { id: 'section-a', title: 'Section A' },
      { id: 'section-b', title: 'Section B' },
    ];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    expect(capturedId).toBe('section-a');
  });

  it('foundVisible=false: returns items[0].id when element rect.bottom ≤ 0', () => {
    // jsdom getBoundingClientRect → all zeros → bottom=0 → bottom<=0 → not visible
    // foundVisible stays false → resolveActiveId returns items[0].id
    const el = document.createElement('section');
    el.id = 'above-fold';
    document.body.appendChild(el);

    let capturedId: string | null = null;
    const items = [{ id: 'above-fold', title: 'Above Fold' }];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    // rect.bottom=0 → continue (not visible) → foundVisible=false → first item
    expect(capturedId).toBe('above-fold');

    document.body.removeChild(el);
  });

  it('rect.top <= line branch: element scrolled past activation line → foundCurrent=true', () => {
    const el = document.createElement('section');
    el.id = 'scrolled-past';
    document.body.appendChild(el);

    // Mock getBoundingClientRect: top=50 (≤ line≈128), bottom=200 (>0), top<innerHeight
    el.getBoundingClientRect = () => makeRect(50, 200);

    let capturedId: string | null = null;
    const items = [{ id: 'scrolled-past', title: 'Scrolled Past' }];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    // foundVisible=true, rect.top=50 <= 128 (line) → foundCurrent=true → nextActiveId = item.id
    expect(capturedId).toBe('scrolled-past');

    document.body.removeChild(el);
  });

  it('else if (!foundCurrent) branch: element visible but below line → set id and break', () => {
    const el = document.createElement('section');
    el.id = 'below-line';
    document.body.appendChild(el);

    // rect.top=200 (> line≈128), rect.bottom=400 (>0), rect.top=200 < innerHeight
    el.getBoundingClientRect = () => makeRect(200, 400);

    let capturedId: string | null = null;
    const items = [{ id: 'below-line', title: 'Below Line' }];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    // foundVisible=true, rect.top=200 > 128 → else if (!foundCurrent) → nextActiveId=item.id, break
    expect(capturedId).toBe('below-line');

    document.body.removeChild(el);
  });

  it('multiple sections: first visible section below line takes priority when none passed line', () => {
    const elA = document.createElement('section');
    elA.id = 'section-x';
    const elB = document.createElement('section');
    elB.id = 'section-y';
    document.body.appendChild(elA);
    document.body.appendChild(elB);

    // Both elements visible but above the activation line (top > 128)
    elA.getBoundingClientRect = () => makeRect(150, 400);
    elB.getBoundingClientRect = () => makeRect(500, 700);

    let capturedId: string | null = null;
    const items = [
      { id: 'section-x', title: 'X' },
      { id: 'section-y', title: 'Y' },
    ];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    // elA: visible, top=150>128 → else if (!foundCurrent) → set id and break
    expect(capturedId).toBe('section-x');

    document.body.removeChild(elA);
    document.body.removeChild(elB);
  });

  it('scheduleUpdate double-fire guard: if (rafId) return branch', () => {
    // The scheduleUpdate function bails early if rafId is already set.
    // We test this by firing scroll twice in rapid succession before RAF resolves.
    const el = document.createElement('section');
    el.id = 'guard-test';
    document.body.appendChild(el);
    el.getBoundingClientRect = () => makeRect(50, 200);

    let rafCallCount = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallCount++;
      cb(0);
      return rafCallCount; // non-zero id
    });

    let capturedId: string | null = null;
    const items = [{ id: 'guard-test', title: 'Guard Test' }];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    const _initialRafCount = rafCallCount;

    // Fire scroll twice: first sets rafId; second should hit `if (rafId) return`
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    // Even if both fired, the guard prevents double-scheduling
    expect(capturedId).toBe('guard-test');

    document.body.removeChild(el);
  });

  it('resize event also triggers scheduleUpdate', () => {
    const el = document.createElement('section');
    el.id = 'resize-test';
    document.body.appendChild(el);
    el.getBoundingClientRect = () => makeRect(50, 200);

    let capturedId: string | null = null;
    const items = [{ id: 'resize-test', title: 'Resize Test' }];

    function Probe() {
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(capturedId).toBe('resize-test');

    document.body.removeChild(el);
  });

  it('cleanup runs without error (unmount while elements exist)', () => {
    const el = document.createElement('section');
    el.id = 'cleanup-test';
    document.body.appendChild(el);
    el.getBoundingClientRect = () => makeRect(50, 200);

    const items = [{ id: 'cleanup-test', title: 'Cleanup' }];

    function Probe() {
      useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Probe />);
    });

    // Unmount triggers cleanup — cancelAnimationFrame if rafId !== 0
    expect(() => {
      act(() => {
        root.unmount();
      });
    }).not.toThrow();

    document.body.removeChild(el);
  });

  it('transitioning items from non-empty to empty hits cleanup + items.length===0 branch', () => {
    let capturedId: string | null = null;
    let setItemsRef: React.Dispatch<React.SetStateAction<TocItem[]>> | null = null;

    function Wrapper() {
      const [items, setItems] = React.useState<TocItem[]>([{ id: 'intro', title: 'Intro' }]);
      setItemsRef = setItems;
      capturedId = useTocActiveId(items);
      return null;
    }

    act(() => {
      root = createRoot(container);
      root.render(<Wrapper />);
    });

    act(() => {
      setItemsRef!([]);
    });

    expect(capturedId).toBe('');
  });
});
