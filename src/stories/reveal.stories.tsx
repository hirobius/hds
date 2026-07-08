/**
 * Reveal stories — CSS scroll-driven reveal-on-enter, plus a pinned scale-reveal
 * scene built from Pin + useScrollProgress (the "award-winning" hero zoom, done
 * on our stack: zero GSAP, zero Lenis required). Scroll the canvas to feel it.
 * @see src/app/components/reveal.tsx
 */
/* eslint-disable no-restricted-syntax -- story fixtures use raw grid/flex to showcase the primitive */
import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { Reveal } from '../app/components/reveal';
import { Pin } from '../app/components/pin';
import { useScrollProgress } from '../scroll/use-scroll-progress';

const Panel = ({ label }: { label: string }) => (
  <div
    // inline-ok: storybook-fixture
    style={{
      height: 220,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--semantic-radius-action, 12px)',
      background: 'var(--semantic-color-surface-raised, #f4f4f5)',
      border: '1px solid var(--semantic-color-border-default, #d4d4d8)',
      color: 'var(--semantic-color-content-primary, #18181b)',
      fontSize: 14,
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Primitives/reveal',
  component: Reveal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Reveal-on-scroll via CSS `animation-timeline: view()` — zero JS, zero deps. Content is visible by default; the effect applies only where supported and when reduced motion is not requested. Scroll the canvas to see it.',
      },
    },
  },
  argTypes: {
    animation: {
      control: { type: 'select' },
      options: ['fade', 'fade-up', 'fade-down', 'scale'],
    },
  },
} satisfies Meta<typeof Reveal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each animation variant, stacked in a tall scroll area. */
export const Animations: Story = {
  args: { animation: 'fade-up' },
  render: () => (
    <div
      style={{ padding: '40vh 24px', display: 'grid', gap: 96, maxWidth: 640, margin: '0 auto' }}
    >
      {(['fade', 'fade-up', 'fade-down', 'scale'] as const).map((a) => (
        <Reveal key={a} animation={a}>
          <Panel label={`animation="${a}"`} />
        </Reveal>
      ))}
    </div>
  ),
};

/**
 * Pinned scale-reveal — the luxury hero zoom. `Pin` holds the scene while the
 * tall section scrolls; `useScrollProgress` drives a Motion scale/radius. No
 * GSAP ScrollTrigger, no Lenis. Scroll the canvas.
 */
export const ScaleRevealScene: StoryObj = {
  render: () => {
    function Scene() {
      const ref = useRef<HTMLDivElement>(null);
      const progress = useScrollProgress(ref, { offset: ['start start', 'end end'] });
      const scale = useTransform(progress, [0, 1], [0.4, 1]);
      const radius = useTransform(progress, [0, 1], [28, 0]);
      return (
        <div ref={ref} style={{ height: '300vh', position: 'relative' }}>
          <Pin
            style={{
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'var(--semantic-color-surface-page, #fafafa)',
            }}
          >
            <motion.div
              style={{
                scale,
                borderRadius: radius,
                width: '62vw',
                height: '62vh',
                background: 'var(--semantic-color-surface-accent, #6366f1)',
              }}
            />
          </Pin>
        </div>
      );
    }
    return <Scene />;
  },
};
