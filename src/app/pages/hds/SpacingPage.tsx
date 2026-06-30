import hds from '../../design-system/tokens';
import { FoundationSwatch } from '../../components/foundation-swatch';
import { Grid } from '../../components/grid';
import { Table } from '../../components/table';
import { Token } from '../../components/token';
import { HdsFoundationSection, HdsFoundationTableStack, useIsMobile } from './HdsDocPrimitives';
import { FoundationDocPage } from './FoundationDocPage';

const SPACE_SCALE: Array<{ key: string; value: string; pixelValue: number }> = [
  { key: '0', value: '0px', pixelValue: 0 },
  { key: 'px1', value: '1px', pixelValue: 1 },
  { key: 'px2', value: '2px', pixelValue: 2 },
  { key: 'px4', value: '4px', pixelValue: 4 },
  { key: 'px6', value: '6px', pixelValue: 6 },
  { key: 'px8', value: '8px', pixelValue: 8 },
  { key: 'px10', value: '10px', pixelValue: 10 },
  { key: 'px12', value: '12px', pixelValue: 12 },
  { key: 'px16', value: '16px', pixelValue: 16 },
  { key: 'px20', value: '20px', pixelValue: 20 },
  { key: 'px24', value: '24px', pixelValue: 24 },
  { key: 'px32', value: '32px', pixelValue: 32 },
  { key: 'px40', value: '40px', pixelValue: 40 },
  { key: 'px48', value: '48px', pixelValue: 48 },
  { key: 'px64', value: '64px', pixelValue: 64 },
  { key: 'px80', value: '80px', pixelValue: 80 },
  { key: 'px96', value: '96px', pixelValue: 96 },
  { key: 'px128', value: '128px', pixelValue: 128 },
];

const SPACE_TIERS = [
  {
    key: 'subgrid',
    label: 'Sub-grid',
    tokenPath: 'semantic.space.subgrid.gap',
    value: '4px',
    pixelValue: 4,
    note: 'Hairline offsets and dense internal alignment.',
  },
  {
    key: 'component-gap',
    label: 'Component gap',
    tokenPath: 'semantic.space.component.gap',
    value: '8px',
    pixelValue: 8,
    note: 'Label-to-input rhythm and close control spacing.',
  },
  {
    key: 'component-padding',
    label: 'Component padding',
    tokenPath: 'semantic.space.component.padding',
    value: '24px',
    pixelValue: 24,
    note: 'The default inset for cards, forms, and grouped surfaces.',
  },
  {
    key: 'layout-gap',
    label: 'Layout gap',
    tokenPath: 'semantic.space.layout.gap',
    value: '48px',
    pixelValue: 48,
    note: 'Major section separation and documentation rail rhythm.',
  },
] as const;

const SCALE_BAR_MAX = 128;
const SCALE_PREVIEW_MAX = 144;

const spacingPageStyles = {
  scaleFillBase: {
    display: 'block',
    maxWidth: '100%',
    overflow: 'hidden',
    height: hds.size[8],
    borderRadius: hds.borderRadius.full,
    background: 'var(--semantic-accent-rest)',
  } satisfies React.CSSProperties,
  gridOverlayBase: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(8px, 1fr))',
    gap: 0,
    background: 'linear-gradient(90deg, var(--semantic-color-accent-rest) 1px, transparent 1px)',
    height: '240px',
    borderRadius: `${hds.borderRadius[6]}`,
    border: `1px solid var(--semantic-color-border-default)`,
    padding: hds.semantic.space.component.padding,
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
  } satisfies React.CSSProperties,
} as const;

const spacingBarContainerStyle = {
  display: 'grid',
  gap: hds.semantic.space.component.gap,
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
  boxSizing: 'border-box',
  paddingInline: hds.semantic.space.component.gap,
  justifyItems: 'flex-start',
} as const;
const spacingBarLabelStyle = {
  ...hds.typeStyles.technical,
  color: 'var(--semantic-color-content-primary)',
  display: 'inline-block',
  maxWidth: '100%',
} as const;

function SpacingBar({ pixelValue, label }: { pixelValue: number; label: string }) {
  const width =
    pixelValue === 0
      ? hds.semantic.space.subgrid.xs
      : `max(${hds.space.px2}, ${(pixelValue / SCALE_BAR_MAX) * SCALE_PREVIEW_MAX}px)`;

  return (
    <div style={spacingBarContainerStyle}>
      <div aria-hidden="true" style={{ ...spacingPageStyles.scaleFillBase, width }} />
      <span style={spacingBarLabelStyle}>{label}</span>
    </div>
  );
}

export default function SpacingPage() {
  const isMobile = useIsMobile();
  const swatchColSpan = isMobile ? 6 : 3;

  return (
    <FoundationDocPage
      title="Spacing"
      description="Spacing stays on an explicit scale so component rhythm, padding, and page cadence remain predictable."
    >
      <HdsFoundationSection
        title="Primitive scale"
        intro="The primitive space scale is the raw ladder. Every higher-level spacing decision resolves back to one of these explicit steps."
        marginTop={0}
      >
        <Grid columns={12} gap="normal">
          {SPACE_SCALE.map((space) => (
            <Grid.Item key={space.key} colSpan={swatchColSpan}>
              <FoundationSwatch
                label={space.key}
                tokenPath={`primitive.space.${space.key}`}
                tokenDisplayPreset="depth1"
                previewPosition="center"
                background="var(--semantic-color-surface-raised)"
                bordered={true}
                specimen={<SpacingBar pixelValue={space.pixelValue} label={space.value} />}
                note={space.pixelValue === 0 ? 'Zero reset' : `${space.pixelValue}px step`}
              />
            </Grid.Item>
          ))}
        </Grid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Semantic defaults"
        intro="A small semantic layer turns the primitive ladder into consistent product usage: micro offsets, control rhythm, shared padding, and larger layout gaps."
      >
        <Grid columns={12} gap="normal">
          {SPACE_TIERS.map((tier) => (
            <Grid.Item key={tier.key} colSpan={swatchColSpan}>
              <FoundationSwatch
                label={tier.label}
                tokenPath={tier.tokenPath}
                tokenDisplayPreset="depth2"
                previewPosition="center"
                background="var(--semantic-color-surface-raised)"
                bordered={true}
                specimen={<SpacingBar pixelValue={tier.pixelValue} label={tier.value} />}
                note={tier.note}
              />
            </Grid.Item>
          ))}
        </Grid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Usage tiers"
        intro="The system groups the scale by intent so small offsets do not leak into page rhythm and section spacing does not leak into control internals."
      >
        <HdsFoundationTableStack marginTop={0}>
          <Table
            caption="Primitive space scale"
            columns={[
              { key: 'token', label: 'Token', width: '32%' },
              { key: 'value', label: 'Value', width: '18%' },
              { key: 'tier', label: 'Tier', width: '18%' },
              { key: 'use', label: 'Use', width: '32%' },
            ]}
            rows={SPACE_SCALE.map((space) => ({
              key: space.key,
              cells: [
                {
                  slot: 'token',
                  content: (
                    <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={1}>
                      {`primitive.space.${space.key}`}
                    </Token>
                  ),
                },
                { slot: 'code', content: space.value },
                {
                  slot: 'token',
                  content:
                    space.pixelValue <= 6
                      ? 'Sub-grid'
                      : space.pixelValue <= 16
                        ? 'Component'
                        : space.pixelValue <= 48
                          ? 'Layout'
                          : 'Section',
                },
                {
                  slot: 'description',
                  content:
                    space.pixelValue <= 6
                      ? 'Hairline offsets, badge internals, tight icon spacing.'
                      : space.pixelValue <= 16
                        ? 'Button padding, field spacing, compact internal layout.'
                        : space.pixelValue <= 48
                          ? 'Card padding, rails, and grid gutters.'
                          : 'Page cadence, section separation, and hero rhythm.',
                },
              ],
            }))}
          />

          <Table
            caption="Tier guidance"
            columns={[
              { key: 'tokens', label: 'Tokens', width: '24%' },
              { key: 'tier', label: 'Tier', width: '18%' },
              { key: 'use', label: 'Use for', width: '58%' },
            ]}
            rows={[
              ['px2 - px6', 'Sub-grid', 'Icon padding, badge internals, hairline offsets.'],
              ['px8 - px16', 'Component', 'Button and input padding, tight internal layout.'],
              ['px24 - px48', 'Layout', 'Shared surface padding, gutters, and component gaps.'],
              ['px64 - px128', 'Section', 'Page-level rhythm and major section separation.'],
            ].map(([tokens, tier, use]) => ({
              key: tier,
              cells: [
                { slot: 'code', content: tokens },
                { slot: 'token', content: tier },
                { slot: 'description', content: use },
              ],
            }))}
          />
        </HdsFoundationTableStack>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="8px grid system"
        intro="The 8px base unit creates predictable rhythm across all layouts. Every spacing value aligns to this fundamental grid, establishing consistent visual relationships whether at micro (sub-grid) or macro (section) scales."
      >
        {/* hds-bypass: demo-grid-visualization — explicit pixel values intentionally show the 8px grid step */}
        <div
          style={{
            ...spacingPageStyles.gridOverlayBase,
            backgroundSize: `${hds.space.px8} 100%`,
            marginTop: hds.semantic.space.layout.gap,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: hds.semantic.space.component.gap,
              left: hds.semantic.space.component.gap,
              ...hds.typeStyles.technical,
              color: 'var(--semantic-color-content-secondary)',
            }}
          >
            8px column grid overlay
          </div>
        </div>

        <HdsFoundationTableStack marginTop={0}>
          <Table
            caption="Grid guidance"
            columns={[
              { key: 'context', label: 'Context', width: '20%' },
              { key: 'multiple', label: 'Multiple', width: '16%' },
              { key: 'example', label: 'Example value', width: '16%' },
              { key: 'use', label: 'Use for', width: '48%' },
            ]}
            rows={[
              {
                key: 'subgrid',
                cells: [
                  { slot: 'label', content: 'Sub-grid' },
                  { slot: 'code', content: '1x' },
                  { slot: 'code', content: '4px' },
                  {
                    slot: 'description',
                    content: 'Micro offsets: badge spacing, icon padding, typography baselines.',
                  },
                ],
              },
              {
                key: 'component',
                cells: [
                  { slot: 'label', content: 'Component' },
                  { slot: 'code', content: '1-2x' },
                  { slot: 'code', content: '8-16px' },
                  {
                    slot: 'description',
                    content: 'Button padding, input spacing, close internal layout.',
                  },
                ],
              },
              {
                key: 'layout',
                cells: [
                  { slot: 'label', content: 'Layout' },
                  { slot: 'code', content: '3-6x' },
                  { slot: 'code', content: '24-48px' },
                  {
                    slot: 'description',
                    content: 'Card padding, section gutters, component rhythm.',
                  },
                ],
              },
              {
                key: 'section',
                cells: [
                  { slot: 'label', content: 'Section' },
                  { slot: 'code', content: '8x+' },
                  { slot: 'code', content: '64px+' },
                  {
                    slot: 'description',
                    content: 'Page cadence, major section breaks, hero spacing.',
                  },
                ],
              },
            ]}
          />
        </HdsFoundationTableStack>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Responsive breakpoints"
        intro="The system defines explicit viewport thresholds for responsive layout. Each breakpoint aligns with device capabilities and the clamp() function provides fluid scaling between fixed steps."
      >
        <HdsFoundationTableStack marginTop={0}>
          <Table
            caption="Breakpoint tokens"
            columns={[
              { key: 'token', label: 'Token', width: '20%' },
              { key: 'px', label: 'Pixels', width: '15%' },
              { key: 'rem', label: 'Rem (16px base)', width: '15%' },
              { key: 'use', label: 'Use case', width: '50%' },
            ]}
            rows={[
              {
                key: 'xs',
                cells: [
                  { slot: 'token', content: 'primitive.breakpoint.xs' },
                  { slot: 'code', content: '375px' },
                  { slot: 'code', content: '23.4rem' },
                  { slot: 'description', content: 'Small phones: initial mobile layout floor.' },
                ],
              },
              {
                key: 'sm',
                cells: [
                  { slot: 'token', content: 'primitive.breakpoint.sm' },
                  { slot: 'code', content: '640px' },
                  { slot: 'code', content: '40rem' },
                  { slot: 'description', content: 'Tablets in portrait: two-column layout start.' },
                ],
              },
              {
                key: 'md',
                cells: [
                  { slot: 'token', content: 'primitive.breakpoint.md' },
                  { slot: 'code', content: '768px' },
                  { slot: 'code', content: '48rem' },
                  {
                    slot: 'description',
                    content: 'Tablets in landscape: three-column layout start.',
                  },
                ],
              },
              {
                key: 'lg',
                cells: [
                  { slot: 'token', content: 'primitive.breakpoint.lg' },
                  { slot: 'code', content: '1024px' },
                  { slot: 'code', content: '64rem' },
                  {
                    slot: 'description',
                    content: 'Desktops: full-width container layout, secondary panels.',
                  },
                ],
              },
              {
                key: 'xl',
                cells: [
                  { slot: 'token', content: 'primitive.breakpoint.xl' },
                  { slot: 'code', content: '1280px' },
                  { slot: 'code', content: '80rem' },
                  {
                    slot: 'description',
                    content: 'Large displays: multi-section layouts, sidebar expansions.',
                  },
                ],
              },
            ]}
          />

          <Table
            caption="Clamp philosophy"
            columns={[
              { key: 'scenario', label: 'Scenario', width: '24%' },
              { key: 'approach', label: 'Approach', width: '38%' },
              { key: 'example', label: 'Example', width: '38%' },
            ]}
            rows={[
              {
                key: 'fluid-sizing',
                cells: [
                  { slot: 'label', content: 'Fluid typography' },
                  {
                    slot: 'description',
                    content:
                      'Use clamp() to scale smoothly between min and max sizes as viewport grows.',
                  },
                  { slot: 'code', content: 'font-size: clamp(14px, 2vw, 24px)' },
                ],
              },
              {
                key: 'container-width',
                cells: [
                  { slot: 'label', content: 'Container width' },
                  {
                    slot: 'description',
                    content:
                      'Apply clamp() to max-width for graceful scaling without media query jumps.',
                  },
                  { slot: 'code', content: 'max-width: clamp(320px, 90vw, 1200px)' },
                ],
              },
              {
                key: 'spacing-scale',
                cells: [
                  { slot: 'label', content: 'Responsive spacing' },
                  {
                    slot: 'description',
                    content:
                      'Scale padding and gaps fluidly between breakpoints for visual harmony.',
                  },
                  { slot: 'code', content: 'padding: clamp(16px, 5vw, 48px)' },
                ],
              },
            ]}
          />
        </HdsFoundationTableStack>
      </HdsFoundationSection>
    </FoundationDocPage>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/spacing',
  title: 'Spacing',
  description: 'Spacing scale',
  section: 'Foundations',
  order: 3,
} satisfies import('../../data/nav-model').HdsPageMeta;
