/**
 * StepperField stories — integer, decimal, and bounded range demos.
 * @see src/app/components/stepper-field.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { StepperField } from '../app/components/stepper-field';

const meta = {
  title: 'Primitives/stepper-field',
  component: StepperField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Numeric input with decrement/increment controls. Clamps to min/max and supports integer or decimal precision.',
      },
    },
  },
} satisfies Meta<typeof StepperField>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [value, setValue] = useState(1);
  return (
    <StepperField
      label="Quantity"
      value={value}
      min={1}
      max={99}
      step={1}
      onChange={setValue}
    />
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function ColumnCountDemo() {
  const [value, setValue] = useState(3);
  return (
    <StepperField
      label="Columns"
      value={value}
      min={1}
      max={12}
      step={1}
      onChange={setValue}
    />
  );
}

export const ColumnCount: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Integer stepper — grid column count clamped between 1 and 12.',
      },
    },
  },
  render: () => <ColumnCountDemo />,
};

function DecimalDemo() {
  const [value, setValue] = useState(1.0);
  return (
    <StepperField
      label="Scale"
      value={value}
      min={0.25}
      max={4}
      step={0.25}
      onChange={setValue}
    />
  );
}

export const Decimal: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Decimal step — scale factor with 0.25 increments.',
      },
    },
  },
  render: () => <DecimalDemo />,
};

function FontSizeDemo() {
  const [value, setValue] = useState(16);
  return (
    <StepperField
      label="Font size (px)"
      value={value}
      min={8}
      max={96}
      step={2}
      onChange={setValue}
    />
  );
}

export const FontSize: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Typography control — font size in 2px steps from 8 to 96.',
      },
    },
  },
  render: () => <FontSizeDemo />,
};

function PanelDemo() {
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(240);
  const [gap, setGap] = useState(16);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <StepperField label="Width" value={width} min={64} max={1920} step={8} onChange={setWidth} />
      <StepperField label="Height" value={height} min={64} max={1080} step={8} onChange={setHeight} />
      <StepperField label="Gap" value={gap} min={0} max={64} step={4} onChange={setGap} />
    </div>
  );
}

export const DimensionPanel: Story = {
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Three steppers forming a dimension control panel.',
      },
    },
  },
  render: () => <PanelDemo />,
};
