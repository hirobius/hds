/**
 * Table rows shared by src/app/components/table.test.tsx and the
 * screen-reader contract suite, so both drive the same two-row table.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 */
import type { TableRow } from '@/app/components/table';

export const TABLE_ROWS: TableRow[] = [
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
