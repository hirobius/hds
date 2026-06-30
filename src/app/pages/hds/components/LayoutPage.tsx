/**
 * LayoutPage - /hds/components/layout
 *
 * Components: Disclosure, Stack, Divider, Container, Grid, TileGrid, Page, Sketch, CaseStudyLayout
 * Category validated against: Ant Design (Layout > Divider), Chakra UI (Layout > Stack/Divider),
 * Radix UI (Separator, Flex, Accordion) - structural layout primitives that define spatial
 * relationships between content regions or govern the reveal of optional supporting content
 * are grouped under "Layout".
 */

import { type ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { CategoryComponentDocs } from '../../../components/CategoryComponentDocs';
import { Disclosure } from '../../../components/disclosure';
import { Divider } from '../../../components/divider';
import { Stack } from '../../../components/stack';
import { Container } from '../../../components/container';
import { Grid } from '../../../components/grid';
import { TileGrid } from '../../../components/tile-grid';
import { Sketch } from '../../../components/sketch';
import { DemoBlock } from '../../../components/demo-block';
import hds from '../../../design-system/tokens';
import { ComponentDocPageShell } from './ComponentDocPageShell';

const layoutPageStyles = {
  slotRow: {
    padding: hds.semantic.space.component.gap,
    background: 'var(--semantic-color-surface-raised)',
    borderRadius: 4,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: hds.semantic.space.component.gap,
  } satisfies React.CSSProperties,
} as const;

export default function LayoutPage() {
  const { isDark } = useTheme();

  const configs = {
    Disclosure: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="tight" align="start">
            <Disclosure label="Panel variant" variant="panel">
              Supporting content revealed on expand.
            </Disclosure>
            <Disclosure label="Card variant" variant="card" defaultOpen>
              Content visible by default.
            </Disclosure>
          </Stack>
        </DemoBlock>
      ),
    },
    Stack: {
      matrix: (
        <DemoBlock heading="Directions">
          <Stack gap="normal" align="start">
            <Stack gap="tight" direction="row" align="center">
              {/* demo placeholder divs — illustrative fixed sizes for Stack layout showcase */}
              <div
                style={{
                  width: 48, // audit-ok: demo placeholder div illustrating Stack layout — fixed px intentional for visual demo
                  height: 24, // audit-ok: demo placeholder div illustrating Stack layout — fixed px intentional for visual demo
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              />{' '}
              {/* audit-ok: demo placeholder — not a component dimension */}
              <div
                style={{
                  width: 72,
                  height: 24,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              />{' '}
              {/* audit-ok: demo placeholder */}
              <div
                style={{
                  width: 40,
                  height: 24,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              />{' '}
              {/* audit-ok: demo placeholder */}
            </Stack>
            <Stack gap="tight">
              {/* demo placeholder divs — illustrative fixed sizes for Stack layout showcase */}
              <div
                style={{
                  width: 120,
                  height: 20,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              />{' '}
              {/* audit-ok: demo placeholder */}
              <div
                style={{
                  width: 96,
                  height: 20,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              />{' '}
              {/* audit-ok: demo placeholder */}
              <div
                style={{
                  width: 108,
                  height: 20,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              />{' '}
              {/* audit-ok: demo placeholder */}
            </Stack>
          </Stack>
        </DemoBlock>
      ),
    },
    Divider: {
      matrix: (
        <DemoBlock heading="Variants">
          <Stack gap="normal" align="stretch" style={{ width: 240 }}>
            <Divider />
            <Divider strong />
          </Stack>
        </DemoBlock>
      ),
    },
    Container: {
      matrix: (
        <DemoBlock heading="Max widths">
          <Stack gap="tight" align="start">
            <Container maxWidth="content">
              <span
                style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
              >
                content — 760px prose width
              </span>
            </Container>
            <Container maxWidth="max">
              <span
                style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
              >
                max — 1200px full layout
              </span>
            </Container>
          </Stack>
        </DemoBlock>
      ),
    },
    Grid: {
      matrix: (
        <DemoBlock heading="Columns">
          <Grid columns={2} gap="normal">
            <Grid.Item colSpan={1}>
              <div
                style={{
                  padding: hds.semantic.space.component.gap,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              >
                <span
                  style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
                >
                  Col 1
                </span>
              </div>
            </Grid.Item>
            <Grid.Item colSpan={1}>
              <div
                style={{
                  padding: hds.semantic.space.component.gap,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                }}
              >
                <span
                  style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
                >
                  Col 2
                </span>
              </div>
            </Grid.Item>
          </Grid>
        </DemoBlock>
      ),
    },
    TileGrid: {
      matrix: (
        <DemoBlock heading="Auto-fill">
          <TileGrid minTileWidth="120px" gap="sm">
            {(['Tokens', 'Color', 'Space', 'Typography', 'Motion'] as const).map((label) => (
              <div
                key={label}
                style={{
                  padding: hds.semantic.space.component.gap,
                  background: 'var(--semantic-color-surface-raised)',
                  borderRadius: 4,
                  textAlign: 'center',
                }}
              >
                <span
                  style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
                >
                  {label}
                </span>
              </div>
            ))}
          </TileGrid>
        </DemoBlock>
      ),
    },
    Page: {
      matrix: (
        <DemoBlock heading="Padding zones">
          <Stack gap="tight" align="stretch">
            {(
              [
                { label: 'paddingY="default"', detail: '48px top / 64px bottom' },
                { label: 'paddingY="compact"', detail: '24px top / 32px bottom' },
                { label: 'paddingY="none"', detail: 'no vertical padding' },
              ] as const
            ).map(({ label, detail }) => (
              <div key={label} style={layoutPageStyles.slotRow}>
                <span
                  style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)' }}
                >
                  {label}
                </span>
                <span
                  style={{
                    ...hds.typeStyles.labelDescriptive,
                    color: 'var(--semantic-color-content-secondary)',
                  }}
                >
                  {detail}
                </span>
              </div>
            ))}
          </Stack>
        </DemoBlock>
      ),
    },
    Sketch: {
      matrix: (
        <DemoBlock heading="Shell">
          <div style={{ height: 160 }}>
            <Sketch title="Generative canvas">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <span
                  style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-secondary)' }}
                >
                  canvas content
                </span>
              </div>
            </Sketch>
          </div>
        </DemoBlock>
      ),
    },
    CaseStudyLayout: {
      matrix: (
        <DemoBlock heading="Slot anatomy">
          <Stack gap="tight" align="stretch">
            {(
              [
                { slot: 'heroSlot', width: 'max', desc: 'hero image + headline' },
                { slot: 'introSlot', width: 'content', desc: 'narrative prose' },
                { slot: 'metricsSlot', width: 'max', desc: 'KPI cards (optional)' },
                { slot: 'contentSlot', width: 'max', desc: 'chapters + galleries' },
              ] as const
            ).map(({ slot, width, desc }) => (
              <div key={slot} style={layoutPageStyles.slotRow}>
                <div
                  style={{
                    display: 'flex',
                    gap: hds.semantic.space.component.gap,
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{ ...hds.typeStyles.ui, color: 'var(--semantic-color-content-primary)' }}
                  >
                    {slot}
                  </span>
                  <span
                    style={{
                      ...hds.typeStyles.labelDescriptive,
                      color: 'var(--semantic-color-content-secondary)',
                    }}
                  >
                    {desc}
                  </span>
                </div>
                <span
                  style={{
                    ...hds.typeStyles.labelDescriptive,
                    color: 'var(--semantic-color-content-tertiary)',
                  }}
                >
                  maxWidth=&quot;{width}&quot;
                </span>
              </div>
            ))}
          </Stack>
        </DemoBlock>
      ),
    },
  } satisfies Record<string, { matrix?: ReactNode; children?: ReactNode }>;

  return (
    <ComponentDocPageShell
      title="Layout"
      isDark={isDark}
      intro="Structural primitives that define spatial relationships."
    >
      <CategoryComponentDocs
        category="Layout"
        isDark={isDark}
        preferredOrder={[
          'Disclosure',
          'Stack',
          'Divider',
          'Container',
          'Grid',
          'TileGrid',
          'Page',
          'Sketch',
          'CaseStudyLayout',
        ]}
        configs={configs}
        hideDetails
        hideVariantDeck
        hideHero
      />
    </ComponentDocPageShell>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/components/layout',
  title: 'Layout',
  description: 'Layout primitives',
  section: 'Components',
  order: 6,
} satisfies import('../../../data/nav-model').HdsPageMeta;
