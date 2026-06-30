/**
 * Pagination stories — paged navigation.
 * @see src/app/components/pagination.tsx
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from '../app/components/pagination';

const meta = {
  title: 'Patterns/pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Paged navigation with first/last anchors, sibling pages, and ellipsis truncation. Controlled via `page` + `onPageChange`.',
      },
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

function PaginationDemo() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} count={10} onPageChange={setPage} />;
}

export const Default: Story = { render: () => <PaginationDemo /> };
