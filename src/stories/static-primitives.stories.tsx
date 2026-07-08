/**
 * Static-primitives (CSS-only) stories — proves `@hirobius/design-system/static.css`
 * renders Badge/Card/Alert/Divider/Tag with plain HTML elements + `.hds-*`
 * classes, no HDS React components, in both light and dark via `data-theme`.
 * @see src/styles/static.css
 * @see docs/CONSUMING.md §14
 */
import type { Meta, StoryObj } from '@storybook/react';
import '../styles/static.css';

const meta = {
  title: 'Primitives/static-css',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The CSS-only static-primitive layer (#64) — plain HTML + `.hds-*` classes, zero React, zero JS. Pairs with `variables.css` for the token spine.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function StaticPrimitivesDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="hds-badge">Neutral</span>
        <span className="hds-badge hds-badge--info">Info</span>
        <span className="hds-badge hds-badge--success">Success</span>
        <span className="hds-badge hds-badge--danger">Danger</span>
        <span className="hds-badge hds-badge--warning">Warning</span>
        <span className="hds-badge hds-badge--in-progress">In progress</span>
      </section>

      <hr className="hds-divider" />

      <div className="hds-card hds-card--bordered" style={{ maxWidth: '360px' }}>
        <div className="hds-card__header">
          <div className="hds-card__header-meta">
            <span className="hds-badge hds-badge--info">In progress</span>
          </div>
          <h3 className="hds-card__title">Discovery phase</h3>
          <p className="hds-card__description">Stakeholder interviews and audit prep.</p>
        </div>
        <div className="hds-card__body">
          <p style={{ margin: 0 }}>Rendered from `.hds-card` + parts — no React Card component.</p>
        </div>
        <div className="hds-card__footer">
          <span className="hds-card__description">Updated 2 days ago</span>
        </div>
      </div>

      <div className="hds-alert hds-alert--warning" role="alert">
        <span className="hds-alert__body">Your session expires in 5 minutes.</span>
      </div>

      <hr className="hds-divider hds-divider--strong" />

      <section style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button type="button" className="hds-tag" aria-pressed="false">
          <span className="hds-tag__pill">Design</span>
        </button>
        <button type="button" className="hds-tag hds-tag--active" aria-pressed="true">
          <span className="hds-tag__pill">Engineering</span>
        </button>
      </section>
    </div>
  );
}

export const Light: Story = {
  render: () => (
    <div data-theme="light" style={{ background: 'var(--semantic-color-surface-page)', padding: '24px' }}>
      <StaticPrimitivesDemo />
    </div>
  ),
};

export const Dark: Story = {
  render: () => (
    <div data-theme="dark" style={{ background: 'var(--semantic-color-surface-page)', padding: '24px' }}>
      <StaticPrimitivesDemo />
    </div>
  ),
};

export const SideBySide: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Light and dark rendered side-by-side from the same `.hds-*` markup, switched purely by `data-theme`.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: '24px' }}>
      <div data-theme="light" style={{ flex: 1, background: 'var(--semantic-color-surface-page)', padding: '24px' }}>
        <StaticPrimitivesDemo />
      </div>
      <div data-theme="dark" style={{ flex: 1, background: 'var(--semantic-color-surface-page)', padding: '24px' }}>
        <StaticPrimitivesDemo />
      </div>
    </div>
  ),
};
