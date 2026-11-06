/**
 * Tests for Table — sortable column aria-sort states + keyboard activation.
 * Plain-DOM assertions (no jest-dom matchers), matching the sibling suites in
 * this directory (menu.test.tsx, skeleton.test.tsx, ...).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TABLE_ROWS as rows } from '../../../tests/primitive-contracts/table-fixtures';
import { Table, type TableColumn } from './table';

afterEach(cleanup);

function columnsWith(overrides: Partial<TableColumn>): TableColumn[] {
  return [
    { key: 'name', label: 'Name', ...overrides },
    { key: 'value', label: 'Value' },
  ];
}

describe('Table — sortable columns', () => {
  it('renders a non-sortable header cell as a columnheader with no aria-sort and no button (pixel parity)', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    expect(screen.queryByRole('button', { name: 'Name' })).toBeNull();
    // The header cell itself carries columnheader semantics (inside the
    // table/row ancestry) but no aria-sort, since it isn't sortable.
    const headerCell = screen.getByRole('columnheader', { name: 'Name' });
    expect(headerCell.getAttribute('aria-sort')).toBeNull();
  });

  it('sets aria-sort="none" on a sortable column with no active direction', () => {
    render(<Table columns={columnsWith({ sortable: true })} rows={rows} />);
    const button = screen.getByRole('button', { name: 'Name' });
    const headerCell = button.closest('[aria-sort]');
    expect(headerCell?.getAttribute('aria-sort')).toBe('none');
  });

  it('a11y:table.aria-sort - sets aria-sort="ascending" when sortDirection is ascending', () => {
    render(
      <Table columns={columnsWith({ sortable: true, sortDirection: 'ascending' })} rows={rows} />,
    );
    const button = screen.getByRole('button', { name: 'Name' });
    const headerCell = button.closest('[aria-sort]');
    expect(headerCell?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('sets aria-sort="descending" when sortDirection is descending', () => {
    render(
      <Table columns={columnsWith({ sortable: true, sortDirection: 'descending' })} rows={rows} />,
    );
    const button = screen.getByRole('button', { name: 'Name' });
    const headerCell = button.closest('[aria-sort]');
    expect(headerCell?.getAttribute('aria-sort')).toBe('descending');
  });

  // check-motion (hds#403): the sort button was the table's only control and
  // had no hover feedback. It now eases its colour on hover over the
  // productive motion token, which the reduced-motion block zeroes.
  it('eases the sort button colour on hover over the productive motion token', () => {
    render(<Table columns={columnsWith({ sortable: true })} rows={rows} />);
    const classes = screen.getByRole('button', { name: 'Name' }).className.split(/\s+/);
    expect(classes).toContain('transition-colors');
    expect(classes).toContain('duration-[var(--hds-motion-productive-duration)]');
    expect(classes).toContain('ease-[var(--hds-motion-productive-easing)]');
    expect(classes).toContain('hover:text-muted-foreground');
  });

  it('fires onSort when the sort button is clicked', () => {
    const onSort = vi.fn();
    render(<Table columns={columnsWith({ sortable: true, onSort })} rows={rows} />);
    fireEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  // Keyboard activation (Enter/Space) is native <button> behaviour — the
  // browser's own default action turns those keys into a click. There is no
  // custom onKeyDown handler to test (a prior version had one purely to
  // satisfy jsdom's fireEvent, which risked a double-fire in real browsers —
  // see hds#294 review). jsdom itself doesn't implement that default action
  // for fireEvent.keyDown/keyUp, so real keyboard-activation coverage needs
  // @testing-library/user-event (not currently a devDependency here); the
  // click test above covers the button's own onClick wiring, which is all
  // this component owns.
});

describe('Table — density follows the data-density dial (hds#336)', () => {
  const COMPACT_ANCESTOR = '[[data-density=compact]_&]:min-h-[var(--semantic-size-row-compact)]';

  function cellsOf(container: HTMLElement) {
    return [
      ...container.querySelectorAll('[role="columnheader"]'),
      ...container.querySelectorAll('[role="cell"]'),
    ];
  }

  it('with no density prop, header and data cells carry the compact-ancestor variant over comfortable defaults', () => {
    const { container } = render(<Table columns={columnsWith({})} rows={rows} />);
    const cells = cellsOf(container);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.className).toContain('min-h-[var(--semantic-size-row-comfortable)]');
      expect(cell.className).toContain(COMPACT_ANCESTOR);
      expect(cell.className).toContain(
        '[[data-density=compact]_&]:py-[var(--semantic-space-scale-xs)]',
      );
    }
  });

  it('explicit density="comfortable" inside a compact scope stays comfortable (no ancestor variant)', () => {
    const { container } = render(
      <div data-density="compact">
        <Table columns={columnsWith({})} rows={rows} density="comfortable" />
      </div>,
    );
    for (const cell of cellsOf(container)) {
      expect(cell.className).toContain('min-h-[var(--semantic-size-row-comfortable)]');
      expect(cell.className).not.toContain('[[data-density=compact]_&]');
    }
  });

  it('explicit density="compact" renders compact rows', () => {
    const { container } = render(<Table columns={columnsWith({})} rows={rows} density="compact" />);
    for (const cell of cellsOf(container)) {
      expect(cell.className).toContain('min-h-[var(--semantic-size-row-compact)]');
      expect(cell.className).not.toContain('min-h-[var(--semantic-size-row-comfortable)]');
      expect(cell.className).not.toContain('[[data-density=compact]_&]');
    }
  });
});

describe('Table — layout and restyle', () => {
  it('gives a column without a width a min-content floor, so content cannot spill out of its cell', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    const grid = screen.getByRole('table');
    expect(grid.style.gridTemplateColumns).toBe(
      'minmax(min-content, 1fr) minmax(min-content, 1fr)',
    );
  });

  it('keeps an explicit column width as its track', () => {
    render(<Table columns={columnsWith({ width: 'max-content' })} rows={rows} />);
    expect(screen.getByRole('table').style.gridTemplateColumns).toBe(
      'max-content minmax(min-content, 1fr)',
    );
  });

  it('draws a column divider before every cell but the first, header included', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    for (const role of ['cell', 'columnheader'] as const) {
      const [first, second] = screen.getAllByRole(role);
      expect(first.className.split(' ')).not.toContain('border-l');
      expect(second.className.split(' ')).toContain('border-l');
    }
  });

  it('sets the body in the regular weight and emphasises the first column only when asked', () => {
    const { unmount } = render(<Table columns={columnsWith({})} rows={rows} />);
    expect(screen.getAllByRole('cell')[0].style.fontWeight).toBe(
      'var(--semantic-typography-uiRegular-font-weight)',
    );
    unmount();
    render(<Table columns={columnsWith({})} rows={rows} emphasizeFirstColumn />);
    const [first, second] = screen.getAllByRole('cell');
    expect(first.style.fontWeight).toBe('var(--semantic-typography-ui-font-weight)');
    expect(second.style.fontWeight).toBe('var(--semantic-typography-uiRegular-font-weight)');
  });

  it('a11y:table.scroll-region-focusable - keeps the scroll region a named tab stop', () => {
    render(<Table caption="Projects" columns={columnsWith({})} rows={rows} />);
    const region = screen.getByRole('region', { name: 'Projects' });
    expect(region.tabIndex).toBe(0);
  });
});

describe('Table — header cell parity (hds#1009)', () => {
  it('a sortable header cell carries the same classes and type style as a plain one in the same slot', () => {
    for (const stickyHeader of [false, true]) {
      for (const align of ['left', 'right'] as const) {
        const plain = render(
          <Table
            stickyHeader={stickyHeader}
            density="compact"
            columns={[
              { key: 'a', label: 'A' },
              { key: 'b', label: 'B', align, width: '8rem' },
            ]}
            rows={rows}
          />,
        );
        const plainCell = plain.container.querySelectorAll('[role="columnheader"]')[1];
        const sorted = render(
          <Table
            stickyHeader={stickyHeader}
            density="compact"
            columns={[
              { key: 'a', label: 'A' },
              { key: 'b', label: 'B', align, width: '8rem', sortable: true, onSort: () => {} },
            ]}
            rows={rows}
          />,
        );
        const sortedCell = sorted.container.querySelectorAll('[role="columnheader"]')[1];
        expect(sortedCell.className).toBe(plainCell.className);
        expect(sortedCell.getAttribute('style')).toBe(plainCell.getAttribute('style'));
        expect(plainCell.getAttribute('aria-sort')).toBeNull();
        expect(sortedCell.getAttribute('aria-sort')).toBe('none');
        plain.unmount();
        sorted.unmount();
      }
    }
  });
});

describe('Table — full outline and vertical centering (hds#1198)', () => {
  const frameOf = () => screen.getByRole('region').parentElement as HTMLElement;
  const FRAME_BORDER = [
    'border-solid',
    '[border-width:var(--semantic-borderWidth-default)]',
    'border-[color:var(--semantic-color-border-default)]',
  ];

  it('outlines the frame with 1px border.default, keeps the rounded radius and clips overflow', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    const frame = frameOf();
    const classes = frame.className.split(' ');
    for (const cls of FRAME_BORDER) expect(classes).toContain(cls);
    // Surface's `border-none` must lose to the frame's border-solid (tailwind-merge).
    expect(classes).not.toContain('border-none');
    expect(classes).toContain('rounded-lg');
    expect(frame.style.overflow).toBe('hidden');
  });

  it('draws no divider under the last row, so the bottom edge is not doubled', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    const cells = screen.getAllByRole('cell');
    const divider = (el: HTMLElement) => el.className.includes('[border-bottom:');
    expect(divider(cells[0])).toBe(true);
    const last = cells.slice(-2);
    for (const cell of last) expect(divider(cell)).toBe(false);
  });

  it('drops the header rule when there are no rows, so the frame line is not doubled', () => {
    render(<Table columns={columnsWith({})} rows={[]} />);
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header.className.includes('[border-bottom:')).toBe(false);
    }
  });

  it('centers every cell vertically with equal top and bottom density padding', () => {
    for (const density of ['comfortable', 'compact'] as const) {
      const { unmount } = render(<Table columns={columnsWith({})} rows={rows} density={density} />);
      for (const cell of [...screen.getAllByRole('cell'), ...screen.getAllByRole('columnheader')]) {
        const classes = cell.className.split(' ');
        expect(classes).toContain('flex');
        expect(classes).toContain('items-center');
        // One `py-*` class (equal top and bottom), no separate pt-/pb-.
        expect(classes.filter((c) => c.startsWith('py-')).length).toBe(1);
        expect(classes.some((c) => /^p[tb]-/.test(c))).toBe(false);
      }
      unmount();
    }
  });
});

// hds#1339: cells read their own paddingX, not semantic.space.surface.padding. A tenant
// that makes surfaces roomy (soft-demo: scale.lg, 40px) no longer inflates every cell,
// which pushed a five-column table past an 868px frame.
describe('Table — cell padding', () => {
  it('header and body cells pad with component.table.cell.paddingX', () => {
    render(<Table columns={columnsWith({})} rows={rows} />);
    const header = screen.getByRole('columnheader', { name: 'Name' });
    const cell = screen.getAllByRole('cell')[0];
    for (const el of [header, cell]) {
      expect(el.className).toContain('px-[var(--component-table-cell-paddingX)]');
      expect(el.className).not.toContain('px-[var(--semantic-space-surface-padding)]');
    }
  });

  it('the token follows the density scale, not the surface padding', async () => {
    const tokens = (await import('../../../hirobius.tokens.json')).default as {
      component: { table?: { cell?: { paddingX?: { $value: string } } } };
    };
    expect(tokens.component.table?.cell?.paddingX?.$value).toBe('{semantic.space.scale.md}');
  });
});
