/**
 * static.css stories — proves the CSS-only static-primitive layer (#64) renders
 * Badge/Card/Alert/Divider/Tag correctly in both light and dark WITHOUT React
 * component logic: every node below is raw `<div className="hds-...">`
 * markup styled entirely by `src/styles/static.css` (the same source
 * `pnpm build:lib` emits as `dist/static.css` / the `/static.css` subpath).
 *
 * @see src/styles/static.css
 * @see docs/CONSUMING.md §14
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import '../styles/static.css';

// No backing React component — this stylesheet is designed for pages with
// ZERO React. `StaticPrimitivesShowcase` is a thin wrapper so Storybook's
// `Meta<typeof X>` typing has something to point at; the interesting part is
// entirely the plain `className` markup in each story's `render`.
function StaticPrimitivesShowcase({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

const meta = {
  title: 'Primitives/static-css',
  component: StaticPrimitivesShowcase,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'CSS-only static-primitive layer for pages with no React (Astro/plain HTML). Plain `.hds-badge` / `.hds-card` / `.hds-alert` / `.hds-divider` / `.hds-tag` classes bound to the same design tokens the React components use — theme-aware via `data-theme`/`data-brand`, zero JS. Ships as the `@hirobius/design-system/static.css` subpath.',
      },
    },
  },
} satisfies Meta<typeof StaticPrimitivesShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Shared markup — reused by both the light and dark panes below ───────────

function AllPrimitives() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="hds-badge">Neutral</span>
        <span className="hds-badge hds-badge--info">Info</span>
        <span className="hds-badge hds-badge--success">Success</span>
        <span className="hds-badge hds-badge--danger">Danger</span>
        <span className="hds-badge hds-badge--warning">Warning</span>
        <span className="hds-badge hds-badge--in-progress">In progress</span>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div className="hds-card" style={{ maxWidth: '220px' }}>
          Borderless default card.
        </div>
        <div className="hds-card hds-card--bordered" style={{ maxWidth: '220px' }}>
          Opt-in neutral border.
        </div>
        <div className="hds-card hds-card--accent" style={{ maxWidth: '220px' }}>
          Accent variant (recommended entry).
        </div>
        <div className="hds-card hds-card--danger" style={{ maxWidth: '220px' }}>
          Danger tone — the border is the signal.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="hds-alert hds-alert--info" role="alert">
          <span className="hds-alert__body">Info alert — no title.</span>
        </div>
        <div className="hds-alert hds-alert--success hds-alert--with-title" role="alert">
          <span>
            <span className="hds-alert__title">Saved</span>
            <span className="hds-alert__body">Your changes were saved successfully.</span>
          </span>
        </div>
        <div className="hds-alert hds-alert--danger hds-alert--with-title" role="alert">
          <span>
            <span className="hds-alert__title">Something went wrong</span>
            <span className="hds-alert__body">The build failed on step 3.</span>
          </span>
        </div>
        <div className="hds-alert hds-alert--warning" role="alert">
          <span className="hds-alert__body">Warning alert — no title.</span>
        </div>
      </div>

      <hr className="hds-divider hds-divider--horizontal" />
      <hr className="hds-divider hds-divider--horizontal hds-divider--strong" />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className="hds-tag" aria-pressed="false">
          <span className="hds-tag__pill">Filter</span>
        </button>
        <button type="button" className="hds-tag hds-tag--active" aria-pressed="true">
          <span className="hds-tag__pill">Selected</span>
        </button>
      </div>
    </div>
  );
}

export const Light: Story = {
  parameters: {
    docs: {
      description: {
        story: 'All five static primitives in the light theme (`data-theme="light"`).',
      },
    },
  },
  render: () => (
    <div
      data-theme="light"
      style={{
        background: 'var(--semantic-color-surface-page)',
        padding: '24px',
        borderRadius: '8px',
      }}
    >
      <AllPrimitives />
    </div>
  ),
};

export const Dark: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The identical markup as Light, re-themed by `data-theme="dark"` + `.dark` alone — zero class changes, zero JS.',
      },
    },
  },
  render: () => (
    <div
      data-theme="dark"
      className="dark"
      style={{
        background: 'var(--semantic-color-surface-page)',
        padding: '24px',
        borderRadius: '8px',
      }}
    >
      <AllPrimitives />
    </div>
  ),
};

export const SideBySide: Story = {
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Light and dark panes rendered together to visually confirm the token flip.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '0' }}>
      <div
        data-theme="light"
        style={{
          flex: 1,
          background: 'var(--semantic-color-surface-page)',
          padding: '24px',
        }}
      >
        <AllPrimitives />
      </div>
      <div
        data-theme="dark"
        className="dark"
        style={{
          flex: 1,
          background: 'var(--semantic-color-surface-page)',
          padding: '24px',
        }}
      >
        <AllPrimitives />
      </div>
    </div>
  ),
};
