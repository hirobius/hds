import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, within } from '@testing-library/react';
import { Board, BoardColumn } from './board';

afterEach(cleanup);

const TONES = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
const DRAG_PROPS = [
  'draggable',
  'onDragStart',
  'onDragOver',
  'onDrop',
  'onDragEnd',
  'onDragEnter',
  'onDragLeave',
];

function renderBoard() {
  return render(
    <Board aria-label="Pipeline">
      <BoardColumn title="On fire" count={2} tone="danger">
        <a className="hds-focus" href="/leads/1">
          Lead one
        </a>
        <a className="hds-focus" href="/leads/2">
          Lead two
        </a>
      </BoardColumn>
      <BoardColumn title="Warm" count={1} tone="warning">
        <a className="hds-focus" href="/leads/3">
          Lead three
        </a>
      </BoardColumn>
      <BoardColumn title="Cold" tone="neutral">
        <span>a</span>
        <span>b</span>
        <span>c</span>
      </BoardColumn>
    </Board>,
  );
}

describe('Board', () => {
  it('renders a region per column, in the order given, each named by its heading', () => {
    renderBoard();
    const regions = screen.getAllByRole('region');
    expect(regions.map((r) => r.getAttribute('aria-labelledby'))).toHaveLength(3);
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      'On fire2, 2 items',
      'Warm1, 1 item',
      'Cold3, 3 items',
    ]);
    regions.forEach((region, i) => {
      expect(region.getAttribute('aria-labelledby')).toBe(headings[i].id);
    });
  });

  it('announces the count in the heading name: explicit count, or counted from children', () => {
    renderBoard();
    expect(screen.getByRole('heading', { name: 'On fire, 2 items' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Warm, 1 item' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cold, 3 items' })).toBeTruthy();
  });

  it('shows the count visually, hidden from the accessibility tree twice-over', () => {
    renderBoard();
    const heading = screen.getByRole('heading', { name: 'On fire, 2 items' });
    const visible = heading.querySelector('span[aria-hidden="true"]:not([data-hds-board-dot])');
    expect(visible?.textContent).toBe('2');
  });

  it('maps tone to data-tone and a feedback token class on the dot', () => {
    for (const tone of TONES) {
      const { container, unmount } = render(
        <BoardColumn title="T" count={0} tone={tone}>
          <i />
        </BoardColumn>,
      );
      const column = container.firstElementChild as HTMLElement;
      expect(column.getAttribute('data-tone')).toBe(tone);
      const dot = column.querySelector('[data-hds-board-dot]') as HTMLElement;
      expect(dot.className).toContain(tone === 'neutral' ? 'bg-border' : `bg-feedback-${tone}`);
      unmount();
    }
  });

  it('defaults tone to neutral', () => {
    const { container } = render(
      <BoardColumn title="T" count={0}>
        <i />
      </BoardColumn>,
    );
    expect((container.firstElementChild as HTMLElement).getAttribute('data-tone')).toBe('neutral');
  });

  it('lays columns on a wrapping grid with a min width, so a narrow container stacks them in DOM order', () => {
    const { container } = renderBoard();
    const board = container.querySelector('[data-hds-grid]') as HTMLElement;
    expect(board.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(16rem, 100%), 1fr))');
    // Stacked order is DOM order: no CSS order, no row-reverse, no explicit placement.
    for (const el of board.querySelectorAll<HTMLElement>('*')) {
      expect(el.style.order).toBe('');
      expect(el.style.gridColumnStart).toBe('');
      expect(el.style.gridRowStart).toBe('');
    }
    expect(board.style.direction).toBe('');
    const titles = within(board)
      .getAllByRole('heading')
      .map((h) => h.textContent);
    expect(titles[0]).toContain('On fire');
  });

  it('keeps each column from shrinking below the min width contract (minmax floor, min-w-0 content)', () => {
    const { container } = renderBoard();
    const col = container.querySelector('[data-hds-component="BoardColumn"]') as HTMLElement;
    expect(col.className).toContain('min-w-0');
  });

  it('leaves card clicks and links to the consumer', () => {
    renderBoard();
    expect(screen.getByRole('link', { name: 'Lead two' }).getAttribute('href')).toBe('/leads/2');
  });

  it('is a labelled group so aria-label on the wrapper is valid', () => {
    renderBoard();
    expect(screen.getByRole('group', { name: 'Pipeline' })).toBeTruthy();
  });

  it('is read-only: no element is draggable and no drag handler is attached', () => {
    const { container } = renderBoard();
    for (const el of container.querySelectorAll('*')) {
      expect(el.getAttribute('draggable')).toBeNull();
    }
    const html = container.innerHTML;
    for (const prop of DRAG_PROPS) expect(html).not.toContain(prop.toLowerCase());
  });

  it('declares no drag props in its types (rejects them at the call site)', () => {
    // @ts-expect-error read-only: Board and BoardColumn expose no drag API
    void (<BoardColumn title="x" count={0} onDrop={() => {}} />);
    // @ts-expect-error read-only
    void (<Board draggable={false}>{null}</Board>);
    expect(true).toBe(true);
  });
});
