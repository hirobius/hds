/**
 * Sketch stories — generative canvas / WebGL shell demos.
 * @see src/app/components/sketch.tsx
 *
 * Caveat: Sketch is a dark-theme shell designed to host WebGL canvases and
 * generative content. The stories render a placeholder content area in place
 * of a real canvas. Real canvas content (three.js, p5, etc.) requires
 * browser WebGL and will not run in jsdom.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { Sketch } from '../app/components/sketch';
import { Text } from '../app/components/text';

const meta = {
  title: 'Layout/sketch',
  component: Sketch,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Shared dark-theme shell for generative canvases and WebGL sketches. Renders a titled header bar with optional controls slot and a flex-grow canvas area. Real generative content (three.js, p5, shader, etc.) is provided as children.',
      },
    },
  },
} satisfies Meta<typeof Sketch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Particle System',
  },
  render: (args) => (
    <div style={{ width: '640px', height: '400px' }}>
      <Sketch {...args}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" className="text-secondary">
            Canvas content renders here
          </Text>
        </div>
      </Sketch>
    </div>
  ),
};

export const WithControls: Story = {
  args: {
    title: 'Noise Field',
    controls: (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Text variant="caption" className="text-secondary">Speed</Text>
        <input type="range" min={1} max={10} defaultValue={5} style={{ width: '80px' }} />
      </div>
    ),
  },
  render: (args) => (
    <div style={{ width: '640px', height: '400px' }}>
      <Sketch {...args}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" className="text-secondary">
            Generative canvas — controls in header
          </Text>
        </div>
      </Sketch>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Optional controls slot rendered in the header bar alongside the title.',
      },
    },
  },
};

export const NarrowCanvas: Story = {
  args: {
    title: 'Typography Sketch',
  },
  render: (args) => (
    <div style={{ width: '320px', height: '240px' }}>
      <Sketch {...args}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" className="text-secondary">
            Compact canvas area
          </Text>
        </div>
      </Sketch>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shell adapts to any container size — canvas area fills remaining flex height.',
      },
    },
  },
};
