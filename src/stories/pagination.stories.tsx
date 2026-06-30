/**
 * Pagination stories — paged navigation control demos.
 * @see src/app/components/pagination.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Pagination } from '../app/components/pagination';

const meta = {
  title: 'Primitives/pagination',
  component: Pagination,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Paged navigation with first/last anchors, sibling pages, and ellipsis truncation. Controlled: pass page + onPageChange. Returns null when count <= 1.',
      },
    },
  },
  argTypes: {
    siblingCount: {
      control: { type: 'number', min: 0, max: 3 },
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Named demo components (hooks-in-arrow rule) ───────────────────────────────

function DefaultDemo() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} count={10} onPageChange={setPage} />;
}

function MiddlePageDemo() {
  const [page, setPage] = useState(5);
  return <Pagination page={page} count={20} onPageChange={setPage} />;
}

function LastPageDemo() {
  const [page, setPage] = useState(20);
  return <Pagination page={page} count={20} onPageChange={setPage} />;
}

function FewPagesDemo() {
  const [page, setPage] = useState(2);
  return <Pagination page={page} count={5} onPageChange={setPage} />;
}

function WideSiblingsDemo() {
  const [page, setPage] = useState(10);
  return <Pagination page={page} count={30} onPageChange={setPage} siblingCount={2} />;
}

// ── Stories ───────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <DefaultDemo />,
};

export const MiddlePage: Story = {
  render: () => <MiddlePageDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Page 5 of 20 — both left and right ellipses are visible.',
      },
    },
  },
};

export const LastPage: Story = {
  render: () => <LastPageDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Final page — next button is disabled, left ellipsis visible.',
      },
    },
  },
};

export const FewPages: Story = {
  render: () => <FewPagesDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Small count (5 pages) — no ellipses needed; all pages render as buttons.',
      },
    },
  },
};

export const WideSiblings: Story = {
  render: () => <WideSiblingsDemo />,
  parameters: {
    docs: {
      description: {
        story: 'siblingCount=2 shows two pages either side of the current page before truncating.',
      },
    },
  },
};
