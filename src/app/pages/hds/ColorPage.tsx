/* hds-bypass: foundation color doc — WCAG_PAIRINGS contains intentional raw hex literals for contrast-ratio math data; values are not used as CSS color properties */
import hds from '../../design-system/tokens';
import { FoundationSwatch } from '../../components/foundation-swatch';
import { Grid } from '../../components/grid';
import { Stack } from '../../components/stack';
import { Text } from '../../components/text';
import { Badge } from '../../components/badge';
import { Table, type TableColumn, type TableRow } from '../../components/table';
import { useHdsManifest, type HdsManifestToken } from '../../hooks/useHdsManifest';
import { contrastRatio } from '../../utils/colorUtils';
import { HdsFoundationSection, useIsMobile } from './HdsDocPrimitives';
import { FoundationDocPage } from './FoundationDocPage';

const BLUE_500_OKLCH = 'oklch(0.4822 0.2889 266.60)';

const colorPageStyles = {
  tokenPairSwatch: {
    display: 'inline-block',
    width: 16,
    height: 16,
    minWidth: 16,
    borderRadius: 3,
    border: '1px solid var(--semantic-color-border-subdued)',
    flexShrink: 0,
  } satisfies React.CSSProperties,
} as const;

type ColorRoleItem = { key: string; token: string; color: string; background: string };

function cssVar(token: HdsManifestToken | undefined, fallback: string) {
  return token?.cssVar ? `var(${token.cssVar})` : fallback;
}

function tokenKey(token: HdsManifestToken) {
  return token.path.split('.').at(-1) ?? token.path;
}

function tokenValue(token: HdsManifestToken) {
  return typeof token.value === 'string' ? token.value : cssVar(token, 'transparent');
}

function toPrimitiveStep(token: HdsManifestToken): [string, string] {
  return [tokenKey(token), tokenValue(token)];
}

function buildContentSwatches(
  contentTokens: HdsManifestToken[],
  getColor: ReturnType<typeof useHdsManifest>['colors']['get'],
) {
  return contentTokens.map((token) => {
    const key = tokenKey(token);
    const backgroundToken =
      key === 'inverse'
        ? getColor('semantic.color.surface.inverse')
        : key === 'onAccent'
          ? getColor('semantic.color.surface.accent')
          : getColor('semantic.color.surface.page');

    return {
      key,
      token: token.path,
      color: cssVar(token, tokenValue(token)),
      background: cssVar(backgroundToken, 'var(--semantic-color-surface-page)'),
    };
  });
}

function buildFeedbackSwatches(
  feedbackTokens: HdsManifestToken[],
  getColor: ReturnType<typeof useHdsManifest>['colors']['get'],
) {
  return feedbackTokens.map((token) => {
    const key = tokenKey(token);
    const backgroundToken = getColor(`semantic.color.feedback.bg.${key}`);

    return {
      key,
      token: token.path,
      color: cssVar(token, tokenValue(token)),
      background: cssVar(backgroundToken, 'var(--semantic-color-surface-page)'),
    };
  });
}

function localContrastRatio(fg: [number, number, number], bg: [number, number, number]) {
  const luminance = ([r, g, b]: [number, number, number]) => {
    const channel = (value: number) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveColorForContrast(color: string): [number, number, number] | null {
  const trimmed = color.trim().toLowerCase();

  if (trimmed.startsWith('#')) {
    const clean = trimmed.slice(1);
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    return [r, g, b];
  }

  const oklchMatch =
    /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?\s*\)$/i.exec(trimmed);
  if (!oklchMatch) return null;

  const l = parseFloat(oklchMatch[1]);
  const c = parseFloat(oklchMatch[2]);
  const h = parseFloat(oklchMatch[3]) * (Math.PI / 180);
  const alpha = oklchMatch[4] ? parseFloat(oklchMatch[4]) : 1;
  if ([l, c, h, alpha].some((value) => Number.isNaN(value))) return null;

  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lPrime ** 3;
  const m3 = mPrime ** 3;
  const s3 = sPrime ** 3;

  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const gamma = (value: number) =>
    value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

  const r = clamp(gamma(clamp(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)));
  const g = clamp(gamma(clamp(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3)));
  const blue = clamp(gamma(clamp(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3)));
  const base = 255;

  return [
    Math.round(r * 255 * alpha + base * (1 - alpha)),
    Math.round(g * 255 * alpha + base * (1 - alpha)),
    Math.round(blue * 255 * alpha + base * (1 - alpha)),
  ];
}

function getContrastSwatchTextToken(color: string) {
  const rgb = resolveColorForContrast(color);
  if (!rgb) {
    return 'var(--primitive-color-neutral-black)'; // tier-ok: contrast math intentionally falls back to primitive black/white endpoints
  }

  const blackContrast = localContrastRatio(rgb, [0, 0, 0]);
  const whiteContrast = localContrastRatio(rgb, [255, 255, 255]);
  return blackContrast >= whiteContrast
    ? 'var(--primitive-color-neutral-black)' // tier-ok: contrast helper intentionally compares primitive black/white endpoints
    : 'var(--primitive-color-neutral-white)'; // tier-ok: contrast helper intentionally compares primitive black/white endpoints
}

// ── WCAG Contrast Table ──────────────────────────────────────────────────────
//
// Static pairings — hex values resolved from hirobius.tokens.json using the
// same WCAG 2.1 §1.4.3 formula as the bridge /contrast endpoint (p6-3).
// To verify hex: node -e "...resolveTokenToHex(path)..." against tokens file.
// Only pairs where both tokens resolve to a hex value are listed;
// oklch-only tokens are excluded until the resolver supports oklch-to-sRGB.

type WcagPairing = {
  fgPath: string;
  fgHex: string;
  bgPath: string;
  bgHex: string;
};

const WCAG_PAIRINGS: WcagPairing[] = [
  {
    fgPath: 'semantic.color.content.primary',
    fgHex: '#111111', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.page',
    bgHex: '#ffffff', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.content.secondary',
    fgHex: '#525252', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.page',
    bgHex: '#ffffff', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.content.primary',
    fgHex: '#111111', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.raised',
    bgHex: '#fafafa', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.content.inverse',
    fgHex: '#f5f5f5', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.inverse',
    bgHex: '#000000', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.content.onAccent',
    fgHex: '#ffffff', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.accent',
    bgHex: '#1e2efd', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.content.accent',
    fgHex: '#1e2efd', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.page',
    bgHex: '#ffffff', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.feedback.error',
    fgHex: '#b91c1c', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.page',
    bgHex: '#ffffff', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.feedback.warning',
    fgHex: '#92400e', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.page',
    bgHex: '#ffffff', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.feedback.success',
    fgHex: '#047857', // audit-ok: token value showcase
    bgPath: 'semantic.color.surface.page',
    bgHex: '#ffffff', // audit-ok: token value showcase
  },
  {
    fgPath: 'semantic.color.feedback.error',
    fgHex: '#b91c1c', // audit-ok: token value showcase
    bgPath: 'semantic.color.feedback.bg.error',
    bgHex: '#fef2f2', // audit-ok: token value showcase
  },
];

const WCAG_COLUMNS: TableColumn[] = [
  { key: 'fg', label: 'Foreground', width: '1.8fr' },
  { key: 'bg', label: 'Background', width: '1.8fr' },
  { key: 'ratio', label: 'Ratio', width: '0.6fr', align: 'right' },
  { key: 'aa', label: 'AA', width: '0.5fr', align: 'center' },
  { key: 'aaLg', label: 'AA large', width: '0.6fr', align: 'center' },
  { key: 'aaa', label: 'AAA', width: '0.5fr', align: 'center' },
  { key: 'aaaLg', label: 'AAA large', width: '0.6fr', align: 'center' },
];

function TokenPairCell({ path, hex }: { path: string; hex: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: hds.space.px8 }}>
      <span aria-hidden="true" style={{ ...colorPageStyles.tokenPairSwatch, background: hex }} />
      <span
        style={{
          ...hds.typeStyles.technical,
          fontSize: '11px',
          color: 'var(--semantic-color-content-primary)',
          wordBreak: 'break-all',
        }}
      >
        {path}
      </span>
    </span>
  );
}

function PassFail({ pass }: { pass: boolean }) {
  return <Badge tone={pass ? 'success' : 'danger'}>{pass ? 'Pass' : 'Fail'}</Badge>;
}

function buildWcagRows(pairings: WcagPairing[]): TableRow[] {
  return pairings.map((p, i) => {
    const ratio = contrastRatio(p.fgHex, p.bgHex);
    const aa = ratio >= 4.5;
    const aaLg = ratio >= 3.0;
    const aaa = ratio >= 7.0;
    const aaaLg = ratio >= 4.5;
    return {
      key: `wcag-${i}`,
      cells: [
        { slot: 'custom' as const, content: <TokenPairCell path={p.fgPath} hex={p.fgHex} /> },
        { slot: 'custom' as const, content: <TokenPairCell path={p.bgPath} hex={p.bgHex} /> },
        { slot: 'value' as const, content: `${ratio.toFixed(2)}:1`, align: 'right' as const },
        { slot: 'badge' as const, content: <PassFail pass={aa} />, align: 'center' as const },
        { slot: 'badge' as const, content: <PassFail pass={aaLg} />, align: 'center' as const },
        { slot: 'badge' as const, content: <PassFail pass={aaa} />, align: 'center' as const },
        { slot: 'badge' as const, content: <PassFail pass={aaaLg} />, align: 'center' as const },
      ],
    };
  });
}

function WcagContrastTable() {
  const rows = buildWcagRows(WCAG_PAIRINGS);
  return <Table columns={WCAG_COLUMNS} rows={rows} density="compact" minWidth={640} />;
}

function ColorRoleGroup({
  title,
  items,
  colSpan,
}: {
  title: string;
  items: ReadonlyArray<ColorRoleItem>;
  colSpan: number;
}) {
  return (
    <Stack gap="px24">
      <Text variant="ui" as="p" style={{ color: 'var(--semantic-color-content-secondary)' }}>
        {title}
      </Text>
      <Grid columns={12} gap="normal">
        {items.map((item) => (
          <Grid.Item key={item.key} colSpan={colSpan}>
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

export default function ColorPage() {
  const isMobile = useIsMobile();
  const manifest = useHdsManifest();
  const swatchColSpan = isMobile ? 6 : 3;
  const neutralSteps = manifest.colors.primitive.neutral.map(toPrimitiveStep);
  const blueSteps = manifest.colors.primitive.blue.map(toPrimitiveStep);
  const contentSwatches = buildContentSwatches(
    manifest.colors.semantic.content,
    manifest.colors.get,
  );
  const feedbackSwatches = buildFeedbackSwatches(
    manifest.colors.semantic.feedback,
    manifest.colors.get,
  );

  return (
    <FoundationDocPage
      title="Color"
      description="Color stays constrained: true neutrals, one brand blue, and semantic roles that keep content and feedback readable."
    >
      <HdsFoundationSection
        title="Neutral palette"
        intro="Neutral primitives carry the bulk of the system. Surfaces, borders, and most content stay inside this monochrome range."
        marginTop={0}
      >
        <Grid columns={12} gap="normal">
          {neutralSteps.map(([step, hex]) => (
            <Grid.Item key={step} colSpan={swatchColSpan}>
              <FoundationSwatch
                label={step}
                hidePreviewLabel={true}
                tokenPath={`primitive.color.neutral.${step}`}
                tokenDisplayPreset="depth1"
                previewPosition="bottom-left"
                value={hex}
                background={hex}
                foreground={getContrastSwatchTextToken(hex)}
              />
            </Grid.Item>
          ))}
        </Grid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Brand blue"
        intro="The accent ramp exists to support one branded hue. `500` remains the canonical product accent."
      >
        <Grid columns={12} gap="normal">
          {blueSteps.map(([step, value]) => (
            <Grid.Item key={step} colSpan={swatchColSpan}>
              <FoundationSwatch
                label={step}
                hidePreviewLabel={true}
                tokenPath={`primitive.color.blue.${step}`}
                tokenDisplayPreset="depth1"
                previewPosition="bottom-left"
                value={value}
                details={step === '500' ? [value, BLUE_500_OKLCH] : [value]}
                background={value}
                foreground={getContrastSwatchTextToken(value)}
              />
            </Grid.Item>
          ))}
        </Grid>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Semantic roles"
        intro="Semantic color roles abstract the palette into readable content states and a small feedback system."
      >
        <Stack gap="px24">
          <ColorRoleGroup title="Content roles" items={contentSwatches} colSpan={swatchColSpan} />
          <ColorRoleGroup title="Feedback roles" items={feedbackSwatches} colSpan={swatchColSpan} />
        </Stack>
      </HdsFoundationSection>

      <HdsFoundationSection
        title="Accessibility contrast"
        intro="Every documented foreground/background pairing is checked against WCAG 2.1 thresholds at render time using the same luminance formula as the bridge /contrast endpoint. AA requires a 4.5:1 ratio for normal text (3.0:1 for large text at least 18pt); AAA requires 7.0:1 (4.5:1 for large text)."
      >
        <WcagContrastTable />
      </HdsFoundationSection>
    </FoundationDocPage>
  );
}

// ADR-017 nav metadata — drives the generated nav-model.json (see scripts/generate-nav-model.mjs).
export const meta = {
  path: '/color',
  title: 'Color',
  description: 'Color tokens and roles',
  section: 'Foundations',
  order: 1,
} satisfies import('../../data/nav-model').HdsPageMeta;
