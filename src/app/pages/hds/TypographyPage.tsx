import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import hds from '../../design-system/tokens';
import { tokenValues } from '../../design-system/generated-token-values';
import typographyData from '../../data/foundations/typography.json';
import { Grid } from '../../components/grid';
import { Token } from '../../components/token';
import { Table } from '../../components/table';
import { Stack } from '../../components/stack';
import { TextLockup } from '../../components/text-lockup';
import { FoundationSwatch } from '../../components/foundation-swatch';
import { DocLayout } from '../../layouts/DocLayout';
import { HdsFoundationSection, HdsFoundationTableStack, DocFinePrint } from './HdsDocPrimitives';

// hds-bypass: typography reference page intentionally exposes primitive specimen values

const {
  typeScale: TYPE_SCALE,
  fontSizes: FONT_SIZES,
  fontWeights: FONT_WEIGHTS,
  lineHeights: LINE_HEIGHTS,
  letterSpacings: LETTER_SPACINGS,
} = typographyData;

const TYPE_RAMP_KEYS = new Set(['display', 'h1', 'h2', 'h3', 'body', 'small', 'caption', 'mono']);

const FONT_FAMILIES = [
  {
    key: 'primary',
    token: 'primitive.typography.family.primary',
    specimen: 'Satoshi',
    style: { ...hds.typeStyles.body, fontFamily: hds.fontFamily } as CSSProperties,
  },
  {
    key: 'display',
    token: 'primitive.typography.family.display',
    specimen: 'Clash Display',
    // tier-ok: typography reference page renders the display-family primitive directly to specimen the font itself
    style: {
      ...hds.typeStyles.h2,
      fontFamily: 'var(--primitive-typography-family-display)',
    } as CSSProperties,
  },
  {
    key: 'mono',
    token: 'primitive.typography.family.mono',
    specimen: 'Geist Mono',
    style: { ...hds.typeStyles.small, fontFamily: hds.monoFamily } as CSSProperties,
  },
] as const;

const CONTENT_SWATCHES = [
  {
    key: 'primary',
    token: 'semantic.color.content.primary',
    color: 'var(--semantic-color-content-primary)',
    background: 'var(--semantic-color-surface-page)',
  },
  {
    key: 'secondary',
    token: 'semantic.color.content.secondary',
    color: 'var(--semantic-color-content-secondary)',
    background: 'var(--semantic-color-surface-page)',
  },
  {
    key: 'disabled',
    token: 'semantic.color.content.disabled',
    color: 'var(--semantic-color-content-disabled)',
    background: 'var(--semantic-color-surface-page)',
  },
  {
    key: 'inverse',
    token: 'semantic.color.content.inverse',
    color: 'var(--semantic-color-content-inverse)',
    background: 'var(--semantic-color-surface-inverse)',
  },
  {
    key: 'accent',
    token: 'semantic.color.content.accent',
    color: 'var(--semantic-color-content-accent)',
    background: 'var(--semantic-color-surface-page)',
  },
  {
    key: 'onAccent',
    token: 'semantic.color.content.onAccent',
    color: 'var(--semantic-color-content-onAccent)',
    background: 'var(--semantic-color-surface-accent)',
  },
] as const;

const FEEDBACK_SWATCHES = [
  {
    key: 'error',
    token: 'semantic.color.feedback.error',
    color: 'var(--semantic-color-feedback-error)',
    background: 'var(--semantic-color-feedback-bg-error)',
  },
  {
    key: 'success',
    token: 'semantic.color.feedback.success',
    color: 'var(--semantic-color-feedback-success)',
    background: 'var(--semantic-color-feedback-bg-success)',
  },
  {
    key: 'warning',
    token: 'semantic.color.feedback.warning',
    color: 'var(--semantic-color-feedback-warning)',
    background: 'var(--semantic-color-feedback-bg-warning)',
  },
  {
    key: 'info',
    token: 'semantic.color.feedback.info',
    color: 'var(--semantic-color-feedback-info)',
    background: 'var(--semantic-color-feedback-bg-info)',
  },
] as const;

const TYPE_SPECIMEN_STYLES = {
  display: hds.typeStyles.display,
  h1: hds.typeStyles.h1,
  h2: hds.typeStyles.h2,
  h3: hds.typeStyles.h3,
  body: hds.typeStyles.body,
  small: hds.typeStyles.small,
  caption: hds.typeStyles.caption,
  mono: hds.typeStyles.mono,
} satisfies Record<string, CSSProperties>;

const TYPE_COMPOSITE_PATHS = {
  display: 'semantic.typography.display',
  h1: 'semantic.typography.h1',
  h2: 'semantic.typography.h2',
  h3: 'semantic.typography.h3',
  body: 'semantic.typography.body',
  small: 'semantic.typography.small',
  caption: 'semantic.typography.caption',
  mono: 'semantic.typography.mono',
} satisfies Record<string, string>;

function primitiveFontWeightVar(key: string) {
  // tier-ok: typography docs intentionally expose primitive weight vars in reference tables
  return `var(--primitive-typography-weight-${key})`;
}

function primitiveLineHeightVar(key: string) {
  // tier-ok: typography docs intentionally expose primitive lineHeight vars in reference tables
  return `var(--primitive-typography-lineHeight-${key})`;
}

function useMaxWidth(maxWidth: number) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth <= maxWidth,
  );

  useEffect(() => {
    const handleResize = () => setMatches(window.innerWidth <= maxWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maxWidth]);

  return matches;
}

function PrimitiveTokenName({ path }: { path: string }) {
  return (
    <Token variant="node" pathDisplayMode="compressed" pathDisplayDepth={2}>
      {path}
    </Token>
  );
}

function ColorRoleGroup({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<{ key: string; token: string; color: string; background: string }>;
}) {
  return (
    <Stack gap="normal">
      <TextLockup title={title} size="detail" titleAs="h3" />
      <Grid columns={12} gap="normal">
        {items.map((item) => (
          <Grid.Item key={item.key} colSpan={3}>
            <FoundationSwatch
              label={item.key}
              tokenPath={item.token}
              tokenDisplayPreset="depth1"
              previewPosition="center"
              background={item.background}
              foreground={item.color}
              bordered={true}
              specimen={
                <span
                  aria-hidden="true"
                  style={{
                    ...hds.typeStyles.heading2,
                    color: item.color,
                  }}
                >
                  Ag
                </span>
              }
            />
          </Grid.Item>
        ))}
      </Grid>
    </Stack>
  );
}

function TypographySection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <HdsFoundationSection title={title} intro={description} marginTop={0}>
      {children}
    </HdsFoundationSection>
  );
}

export default function TypographyPage() {
  const specimenRows = TYPE_SCALE.filter((row) => TYPE_RAMP_KEYS.has(row.key));
  const isSmallViewport = useMaxWidth(640);
  const typeRampColSpan = isSmallViewport ? 4 : 3;
  const contentSlot = (
    <>
      <TextLockup
        eyebrow="Foundations"
        title="Typography"
        description="Type stays readable and predictable. The detailed font story lives in the tables below."
        size="hero"
      />

      <TypographySection title="Type ramp">
        <Grid columns={12} gap="normal">
          {specimenRows.map((row) => (
            <Grid.Item key={row.key} colSpan={typeRampColSpan}>
              <FoundationSwatch
                label={row.key}
                tokenPath={TYPE_COMPOSITE_PATHS[row.key] ?? `semantic.typography.${row.key}`}
                tokenDisplayPreset="depth1"
                previewPosition="center"
                background="var(--semantic-color-surface-page)"
                bordered={true}
                specimen={
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'block',
                      ...(TYPE_SPECIMEN_STYLES[row.key] ?? TYPE_SPECIMEN_STYLES.body),
                      color: 'var(--semantic-color-content-primary)',
                      flexShrink: 0,
                    }}
                  >
                    Ag
                  </span>
                }
                note={row.usage}
              />
            </Grid.Item>
          ))}
        </Grid>
      </TypographySection>

      <TypographySection title="Color roles">
        <Stack gap="inset">
          <ColorRoleGroup title="Content" items={CONTENT_SWATCHES} />
          <ColorRoleGroup title="Feedback" items={FEEDBACK_SWATCHES} />
        </Stack>
      </TypographySection>

      <TypographySection title="Primitives">
        <DocFinePrint label="Primitive token tables">
          <HdsFoundationTableStack marginTop={0}>
            <Table
              caption="Font family"
              columns={[
                { key: 'token', label: 'Token' },
                { key: 'value', label: 'Preview' },
              ]}
              rows={FONT_FAMILIES.map((family) => ({
                key: family.key,
                cells: [
                  { slot: 'token', content: <PrimitiveTokenName path={family.token} /> },
                  {
                    slot: 'value',
                    content: (
                      <span
                        style={{
                          ...family.style,
                          color: 'var(--semantic-color-content-primary)',
                          flexShrink: 0,
                        }}
                      >
                        {family.specimen}
                      </span>
                    ),
                  },
                ],
              }))}
            />

            <Table
              caption="Line height"
              columns={[
                { key: 'token', label: 'Token' },
                { key: 'value', label: 'Preview' },
              ]}
              rows={LINE_HEIGHTS.map((lineHeight) => ({
                key: lineHeight.key,
                cells: [
                  { slot: 'token', content: <PrimitiveTokenName path={lineHeight.token} /> },
                  {
                    slot: 'value',
                    content: (
                      <span
                        style={{
                          ...hds.typeStyles.body,
                          lineHeight: primitiveLineHeightVar(lineHeight.key),
                          color: 'var(--semantic-color-content-primary)',
                          flexShrink: 0,
                          whiteSpace: 'pre',
                        }}
                      >
                        {lineHeight.specimen}
                      </span>
                    ),
                  },
                ],
              }))}
            />

            <Table
              caption="Weight"
              columns={[
                { key: 'token', label: 'Token' },
                { key: 'value', label: 'Preview' },
              ]}
              rows={FONT_WEIGHTS.map((weight) => ({
                key: weight.key,
                cells: [
                  { slot: 'token', content: <PrimitiveTokenName path={weight.token} /> },
                  {
                    slot: 'value',
                    content: (
                      <span
                        style={{
                          ...hds.typeStyles.body,
                          fontWeight: primitiveFontWeightVar(
                            weight.key,
                          ) as CSSProperties['fontWeight'],
                          color: 'var(--semantic-color-content-primary)',
                          flexShrink: 0,
                        }}
                      >
                        Ag
                      </span>
                    ),
                  },
                ],
              }))}
            />

            <Table
              caption="Letter spacing"
              columns={[
                { key: 'token', label: 'Token' },
                { key: 'value', label: 'Preview' },
              ]}
              rows={LETTER_SPACINGS.map((spacing) => ({
                key: spacing.key,
                cells: [
                  { slot: 'token', content: <PrimitiveTokenName path={spacing.token} /> },
                  {
                    slot: 'value',
                    content: (
                      <span
                        style={{
                          ...hds.typeStyles.body,
                          letterSpacing: spacing.css,
                          color: 'var(--semantic-color-content-primary)',
                          flexShrink: 0,
                        }}
                      >
                        Ag Bg Cg
                      </span>
                    ),
                  },
                ],
              }))}
            />

            <Table
              caption="Font size"
              columns={[
                { key: 'token', label: 'Token' },
                { key: 'value', label: 'Preview' },
              ]}
              rows={FONT_SIZES.map((size) => ({
                key: size.key,
                cells: [
                  { slot: 'token', content: <PrimitiveTokenName path={size.token} /> },
                  {
                    slot: 'value',
                    content: (
                      <span
                        style={{
                          fontFamily: hds.fontFamily,
                          fontSize:
                            tokenValues.primitive.typography.size[
                              size.key as keyof typeof tokenValues.primitive.typography.size
                            ],
                          lineHeight: 1,
                          fontWeight: hds.fontWeight.regular,
                          color: 'var(--semantic-color-content-primary)',
                        }}
                      >
                        {
                          tokenValues.primitive.typography.size[
                            size.key as keyof typeof tokenValues.primitive.typography.size
                          ]
                        }
                      </span>
                    ),
                  },
                ],
              }))}
            />
          </HdsFoundationTableStack>
        </DocFinePrint>
      </TypographySection>
    </>
  );

  return (
    <div className="hds-page-enter">
      <DocLayout contentSlot={contentSlot} contentMaxWidth="content" />
    </div>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/typography',
  title: 'Typography',
  section: 'Foundations',
  order: 2,
} satisfies import('../../data/nav-model').HdsPageMeta;
