/**
 * HdsSlider stories — integer, decimal, and multi-slider demos.
 * @see src/app/components/slider.tsx
 */
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { HdsSlider } from '../app/components/slider';

const meta = {
  title: 'Primitives/slider',
  component: HdsSlider,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Range slider with label and animated value display. Accepts min, max, step, and a controlled value.',
      },
    },
  },
} satisfies Meta<typeof HdsSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultDemo() {
  const [value, setValue] = useState(40);
  return (
    <div style={{ width: '320px' }}>
      <HdsSlider label="Opacity" min={0} max={100} value={value} onChange={setValue} />
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultDemo />,
};

function SteppedDemo() {
  const [value, setValue] = useState(3);
  return (
    <div style={{ width: '320px' }}>
      <HdsSlider label="Columns" min={1} max={6} step={1} value={value} onChange={setValue} />
    </div>
  );
}

export const Stepped: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Integer step — snaps to whole-number column counts.',
      },
    },
  },
  render: () => <SteppedDemo />,
};

function DecimalDemo() {
  const [value, setValue] = useState(1.5);
  return (
    <div style={{ width: '320px' }}>
      <HdsSlider
        label="Scale factor"
        min={0.5}
        max={3}
        step={0.1}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

export const Decimal: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Decimal step — used for scale or ratio inputs.',
      },
    },
  },
  render: () => <DecimalDemo />,
};

function MultiSliderDemo() {
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [letterSpacing, setLetterSpacing] = useState(0);
  return (
    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <HdsSlider label="Font size" min={8} max={96} step={1} value={fontSize} onChange={setFontSize} />
      <HdsSlider
        label="Line height"
        min={1}
        max={2.5}
        step={0.05}
        value={lineHeight}
        onChange={setLineHeight}
      />
      <HdsSlider
        label="Letter spacing"
        min={-2}
        max={10}
        step={0.5}
        value={letterSpacing}
        onChange={setLetterSpacing}
      />
    </div>
  );
}

export const TypographyControls: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Three sliders working together to control typographic properties.',
      },
    },
  },
  render: () => <MultiSliderDemo />,
};
