/**
 * PageHeader stories - the header every screen opens with.
 * @see src/app/components/page-header.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader } from '../app/components/page-header';
import { Badge } from '../app/components/badge';
import { Breadcrumb } from '../app/components/breadcrumb';
import { Button } from '../app/components/button';
import { designParameters } from './design-parameters';

const meta = {
  title: 'Patterns/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    ...designParameters('PageHeader'),
    layout: 'padded',
    docs: {
      description: {
        component:
          'Screen header with breadcrumb, title, status and actions slots. The title is always `heading2` (30px); `level` changes only the DOM element. Every screen has exactly one PageHeader; `display` and `h1` type are for marketing and landing surfaces.',
      },
    },
  },
  argTypes: {
    level: { control: { type: 'select' }, options: [1, 2, 3, 4, 5, 6] },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Acme Co',
    breadcrumb: (
      <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: 'Acme Co' }]} />
    ),
    status: <Badge tone="success">Active</Badge>,
    actions: (
      <>
        <Button variant="secondary">Edit</Button>
        <Button variant="primary">New project</Button>
      </>
    ),
  },
};

export const TitleOnly: Story = {
  args: { title: 'Clients' },
};

export const WithActions: Story = {
  args: {
    title: 'Clients',
    actions: <Button variant="primary">Add client</Button>,
  },
};

export const LongTitleWraps: Story = {
  args: {
    title: 'A very long client name that has to wrap before it pushes the actions off screen',
    status: <Badge tone="warning">Paused</Badge>,
    actions: <Button variant="primary">Resume</Button>,
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const NestedLevel: Story = {
  args: { title: 'Billing', level: 2 },
};
