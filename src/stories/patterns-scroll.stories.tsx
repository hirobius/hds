/**
 * Golden-path scroll recipes — canonical scroll-driven sections built purely
 * from HDS scroll primitives (Reveal, Pin, useScrollProgress). Cheapest tool
 * first: CSS `animation-timeline` before JS, JS before an opt-in dependency
 * (`SmoothScroll`/Lenis, not shown here — see `src/scroll/smooth-scroll.tsx`).
 * No GSAP, no Lenis required for any of these. See `public/llms.txt` → "How
 * To Build A Scroll-Driven Section" for the recipe these stories demonstrate,
 * and `reveal.stories.tsx` for the per-primitive controls/argTypes playground.
 * @see docs/adr/021-animation-engine-motion-core-gsap-downstream.md
 */
/* eslint-disable no-restricted-syntax -- story fixtures use raw grid/flex to showcase the primitives */
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
      height: 200,
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
  title: 'Patterns/Scroll',
  component: Reveal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Golden-path scroll-driven sections assembled entirely from HDS scroll primitives — the shape an agent should reach for before hand-rolling IntersectionObserver, sticky positioning, or a GSAP/Lenis stack. Scroll each canvas to see the effect.',
      },
    },
  },
} satisfies Meta<typeof Reveal>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Reveal sequence ─────────────────────────────────────────────────────────
// Skeleton: a stack of Reveal-wrapped panels, each with its own entrance
// animation, driven purely by CSS `animation-timeline: view()` — zero JS.

function RevealSequenceDemo() {
  return (
    <div
      style={{ padding: '30vh 24px', display: 'grid', gap: 64, maxWidth: 640, margin: '0 auto' }}
    >
      <Reveal animation="fade-up">
        <Panel label='Reveal animation="fade-up"' />
      </Reveal>
      <Reveal animation="fade">
        <Panel label='Reveal animation="fade"' />
      </Reveal>
      <Reveal animation="scale">
        <Panel label='Reveal animation="scale"' />
      </Reveal>
      <Reveal animation="fade-down">
        <Panel label='Reveal animation="fade-down"' />
      </Reveal>
    </div>
  );
}

export const RevealSequence: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'A stack of `Reveal`-wrapped panels, each entering on scroll via CSS `animation-timeline: view()` — no JS, no IntersectionObserver. Content is visible by default; the effect applies only where supported and reduced motion is not requested.',
      },
    },
  },
  render: () => <RevealSequenceDemo />,
};

// ── Pinned scale-reveal scene ───────────────────────────────────────────────
// Skeleton: a tall scroll region > Pin (sticky scene) > useScrollProgress
// driving a Motion scale/radius transform — the "award-winning" hero zoom,
// done with zero GSAP ScrollTrigger and zero Lenis.

function PinnedScaleRevealDemo() {
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

export const PinnedScaleReveal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`Pin` holds the scene in view (`position: sticky`) while the 300vh section scrolls beneath it; `useScrollProgress` returns the 0→1 travel as a Motion value, bound to `scale`/`borderRadius` via `useTransform`. Reach for `useScrollProgress` only when CSS `animation-timeline` cannot express the effect — here, a value driven into a Motion transform.',
      },
    },
  },
  render: () => <PinnedScaleRevealDemo />,
};

// ── Simple parallax ─────────────────────────────────────────────────────────
// Skeleton: a tall scroll region > two layered panels, each translated at a
// different rate from the same useScrollProgress value — the minimal
// parallax recipe, no separate library.

function SimpleParallaxDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref, { offset: ['start end', 'end start'] });
  const backgroundY = useTransform(progress, [0, 1], ['-10%', '10%']);
  const foregroundY = useTransform(progress, [0, 1], ['-30%', '30%']);

  return (
    <div
      ref={ref}
      style={{
        height: '140vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          y: backgroundY,
          width: '70vw',
          height: '50vh',
          borderRadius: 'var(--semantic-radius-action, 12px)',
          background: 'var(--semantic-color-surface-raised, #f4f4f5)',
          border: '1px solid var(--semantic-color-border-default, #d4d4d8)',
        }}
      />
      <motion.div
        style={{
          position: 'relative',
          y: foregroundY,
          width: '40vw',
          height: '30vh',
          borderRadius: 'var(--semantic-radius-action, 12px)',
          background: 'var(--semantic-color-surface-accent, #6366f1)',
        }}
      />
    </div>
  );
}

export const SimpleParallax: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Two layers translated at different rates off a single `useScrollProgress` value — the background panel drifts less (`-10% → 10%`), the foreground panel more (`-30% → 30%`), producing depth with no separate parallax library.',
      },
    },
  },
  render: () => <SimpleParallaxDemo />,
};
