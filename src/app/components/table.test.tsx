/**
 * Tests for Table — sortable column aria-sort states + keyboard activation.
 * Plain-DOM assertions (no jest-dom matchers), matching the sibling suites in
 * this directory (menu.test.tsx, skeleton.test.tsx, ...).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Table, type TableColumn, type TableRow } from './table';

afterEach(cleanup);

const rows: TableRow[] = [
  {
    key: 'a',
    cells: [
      { slot: 'label', content: 'Alpha' },
      { slot: 'value', content: '1' },
    ],
  },
  {
    key: 'b',
    cells: [
      { slot: 'label', content: 'Beta' },
      { slot: 'value', content: '2' },
    ],
  },
];

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

  it('sets aria-sort="ascending" when sortDirection is ascending', () => {
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
