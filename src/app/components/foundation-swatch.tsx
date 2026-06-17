/**
 * FoundationSwatch - governed foundation specimen for color and semantic role previews.
 * @category Utilities
 * @tier pattern
 */
import type { ReactNode } from 'react';
import hds from '../design-system/tokens';
import { Token } from './token';
import { Surface } from './surface';
import { Stack } from './stack';
import { Text } from './text';

const swatchStyles = {
  previewBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    flexGrow: 1,
    minWidth: 0,
  } satisfies React.CSSProperties,
} as const;

type FoundationSwatchPreviewPosition = 'bottom-left' | 'top-left' | 'center';
type FoundationSwatchTokenDisplayPreset = 'depth1' | 'depth2' | 'full';

/** @public */
export type FoundationSwatchProps = {
  /** Primary label rendered inside or below the swatch. */
  label: string;
  /** Whether to hide the preview label inside the swatch specimen. */
  hidePreviewLabel?: boolean;
  /** Optional token path rendered as a condensed node inside the swatch surface. */
  tokenPath?: string;
  /** Shorthand preset for how the token path renders inside the specimen. */
  tokenDisplayPreset?: FoundationSwatchTokenDisplayPreset;
  /** Placement of the specimen content inside the swatch surface. */
  previewPosition?: FoundationSwatchPreviewPosition;
  /** Background fill or tone shown by the specimen. */
  background: string;
  /** Optional text/value line shown inside the specimen. */
  value?: string;
  /** Optional supporting lines shown inside the specimen. */
  details?: string[];
  /** Foreground color used for text inside the specimen. */
  foreground?: string;
  /** Custom specimen content rendered inside card-style swatches. */
  specimen?: ReactNode;
  /** Optional note rendered below card-style swatches. */
  note?: ReactNode;
  /** Whether to show a bordered specimen surface. */
  bordered?: boolean;
  /** Explicit color value (hex or CSS var name) to pin the token chip's swatch square, overriding auto-resolution from tokenPath. */
  swatchVar?: string;
};

const shellStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--semantic-space-subgrid-gap, 8px)',
  minWidth: 0,
  // Pixel-snap inside-layer rendering. Foundation swatches sit inside an
  // Grid (repeat(12, 1fr)) whose column widths are inherently fractional
  // at viewport widths that don't divide cleanly by 12. Forcing a compositor
  // layer with translateZ(0) lets the rasterizer snap text to integer pixel
  // boundaries within the layer, eliminating the half-pixel fuzz that read
  // as "thick + fuzzy" on Satoshi 500 captions.
  transform: 'translateZ(0)',
} as const;

const metaLabelStyle = {
  ...hds.typeStyles.technical,
  margin: 0,
  // Explicit pixel line-height (was 1.1 = 16.5px at 15px font — a half-pixel
  // line box). Using 17px keeps the box on an integer pixel so caption stacks
  // don't drift onto fractional baselines.
  lineHeight: '17px',
} as const;

const noteStyle = {
  ...hds.typeStyles.caption,
  color: 'var(--semantic-color-content-secondary)',
  margin: 0,
} as const;

const TOKEN_DISPLAY_PRESETS: Record<FoundationSwatchTokenDisplayPreset, {
  mode: 'full' | 'compressed';
  depth: number;
  leadingDot: boolean;
}> = {
  depth1: {
    mode: 'compressed',
    depth: 1,
    leadingDot: false,
  },
  depth2: {
    mode: 'compressed',
    depth: 2,
    leadingDot: false,
  },
  full: {
    mode: 'full',
    depth: 1,
    leadingDot: false,
  },
};

function renderDetails(label: string, value?: string, details?: string[], hidePreviewLabel = false) {
  const lines = details && details.length > 0 ? details : value ? [value] : [];

  return (
    <div>
      {!hidePreviewLabel ? <Text variant="technical" as="p" style={metaLabelStyle}>{label.toLowerCase()}</Text> : null}
      {lines.map((line) => (
        <Text key={line} variant="technical" as="p" style={metaLabelStyle}>
          {line.toLowerCase()}
        </Text>
      ))}
    </div>
  );
}

export function FoundationSwatch({
  label,
  hidePreviewLabel = false,
  tokenPath,
  tokenDisplayPreset = 'depth2',
  previewPosition = 'center',
  background,
  value,
  details,
  foreground = 'var(--semantic-color-content-primary)',
  specimen,
  note,
  bordered = false,
  swatchVar,
}: FoundationSwatchProps) {
  const tokenDisplay = TOKEN_DISPLAY_PRESETS[tokenDisplayPreset];
  const previewJustifyContent =
    previewPosition === 'center'
      ? 'center'
      : previewPosition === 'bottom-left'
        ? 'flex-end'
        : 'flex-start';
  const previewAlignItems =
    previewPosition === 'center'
      ? 'center'
      : 'flex-start';
  const previewPaddingBottom =
    previewPosition === 'bottom-left'
      ? hds.semantic.space.component.gap
      : 0;

  return (
    <div style={shellStyle} data-layout-role="foundation-swatch-shell">
      <Surface
        data-inspector-ignore="color-swatch"
        padding="component"
        style={{
          // hds-bypass: fixed specimen height keeps foundation swatches visually comparable across token demos
          width: '100%',
          height: '240px',
          background,
          color: foreground,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          border: bordered ? `1px solid var(--semantic-color-border-default)` : 'none',
        }}
      >
        <div
          style={{ ...swatchStyles.previewBody, alignItems: previewAlignItems, justifyContent: previewJustifyContent, paddingBottom: previewPaddingBottom }}
        >
          {specimen ? (
            specimen
          ) : (
            <Stack gap="hairline" style={{ gap: 'var(--semantic-space-subgrid-gap, 8px)' }}>
              {renderDetails(label, value, details, hidePreviewLabel)}
            </Stack>
          )}
        </div>
        {tokenPath ? (
          <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
            <Token
              variant="node"
              pathDisplayMode={tokenDisplay.mode}
              pathDisplayDepth={tokenDisplay.depth}
              pathDisplayLeadingDot={tokenDisplay.leadingDot}
              tokenPath={tokenPath}
              swatchVar={swatchVar}
            >
              {tokenPath}
            </Token>
          </div>
        ) : null}
      </Surface>
      {note ? <div style={noteStyle}>{note}</div> : null}
    </div>
  );
}
