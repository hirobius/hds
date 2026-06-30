/**
 * ComponentInstanceMatrix stories — responsive specimen matrix for variant/state parity.
 * @see src/app/components/component-instance-matrix.tsx
 *
 * Caveat: ComponentInstanceMatrix resolves dimension options by looking up the
 * componentName key in src/app/data/component-api.json. This story uses "Badge"
 * (registered there with a `tone` prop) plus the built-in synthetic "demoState"
 * dimension so both axes resolve to non-empty lists. If either dimension resolves
 * to an empty list the component returns null without throwing.
 */
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ComponentInstanceMatrix } from '../app/components/component-instance-matrix';
import { Badge } from '../app/components/badge';

const meta = {
  title: 'Primitives/component-instance-matrix',
  component: ComponentInstanceMatrix,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Specimen matrix that cross-tabulates two component dimensions (e.g. tone × demoState). ' +
          'Resolves options from component-api.json for prop dimensions, or from built-in synthetic ' +
          'options for "demoState". Returns null if either dimension yields no options.',
      },
    },
  },
} satisfies Meta<typeof ComponentInstanceMatrix>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    componentName: 'Badge',
    dimensionX: 'tone',
    dimensionY: 'demoState',
    title: 'Badge — tone × state',
    isMobile: false,
    renderInstance: (rowKey, columnKey) => (
      <Badge tone={columnKey as 'neutral' | 'info' | 'success' | 'danger' | 'warning'}>
        {columnKey} / {rowKey}
      </Badge>
    ),
  },
};

export const FrozenRowState: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'With freezeRowState=true each row is wrapped in FreezeState so components render the frozen visual state.',
      },
    },
  },
  args: {
    componentName: 'Badge',
    dimensionX: 'tone',
    dimensionY: 'demoState',
    title: 'Badge — frozen state per row',
    isMobile: false,
    freezeRowState: true,
    rowLabelTone: 'secondary',
    renderInstance: (rowKey, columnKey) => (
      <Badge tone={columnKey as 'neutral' | 'info' | 'success' | 'danger' | 'warning'}>
        {columnKey}
      </Badge>
    ),
  },
};

export const MobileLayout: Story = {
  parameters: {
    docs: {
      description: {
        story: 'isMobile=true signals consumer renderInstance callbacks to adapt to narrow layouts.',
      },
    },
  },
  args: {
    componentName: 'Badge',
    dimensionX: 'tone',
    dimensionY: 'demoState',
    title: 'Badge — mobile specimen',
    isMobile: true,
    renderInstance: (rowKey, columnKey) => (
      <Badge tone={columnKey as 'neutral' | 'info' | 'success' | 'danger' | 'warning'}>
        {columnKey}
      </Badge>
    ),
  },
};
