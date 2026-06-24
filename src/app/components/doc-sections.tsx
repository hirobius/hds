/** @internal @doc-exempt: demo-doc-helper — not part of @hirobius/design-system public API. */
/**
 * DocSections — shared utilities, data, and demo components for the HDS docs.
 * @doc-ignore
 *
 * This file is the shared source of truth for:
 *   • Shared sub-components — DocLabel, Swatch
 *   • Reference/demo arrays that still belong to component docs — TYPE_PRESETS, TOKEN_REF_GROUPS, etc.
 *   • Interactive demo components — DemoButton, DemoTag, TooltipDemo, etc.
 *
 * Editorial data like AUDIT_LOG and GUIDANCE_DATA now lives in /src/app/data/hdsEditorial.tsx
 * and is re-exported here for backward compatibility.
 *
 * ct() — the runtime theme resolver — lives in /src/app/design-system/theme.ts.
 * It is re-exported from here for backward-compat with existing page imports.
 *
 * Page-level layout lives in /src/app/pages/hds/*.tsx.
 * ALL style values reference hds tokens — no hardcoded colours, sizes, or spacing.
 */

import React, { useState } from 'react';
import { Type as TextAa, Palette, Zap as Lightning, Ruler, Box as Cube } from 'lucide-react';
import hds from '../design-system/tokens';
import { FreezeState } from '../context/DemoStateContext';
import { ct } from '../design-system/theme';
import { tokenValues } from '../design-system/generated-token-values';
import { Icon } from './icon';
import { Tooltip } from './tooltip';
import { Button } from './button';
// Token removed — unused in this file
import { Surface } from './surface';
import { Tag } from './tag';
import CascadeText from './CascadeText';

// ─── Theme helper (re-exported from canonical location) ───────────────────────
// Import ct() in new code from: import { ct } from '../design-system/theme'
export { ct };
export {
  AUDIT_LOG,
  AuditSeverityIcon,
  auditSevLabel,
  auditSevColor,
  GUIDANCE_DATA,
  type AuditSeverity,
  type RuleType,
} from '../data/hdsEditorial';

// ─── Shared sub-components ────────────────────────────────────────────────────

export function DocLabel({
  children,
  kind = 'descriptive',
}: {
  children: React.ReactNode;
  kind?: 'descriptive' | 'technical';
}) {
  const style = kind === 'technical' ? hds.typeStyles.technical : hds.typeStyles.ui;
  return (
    <span className="text-secondary" style={{ ...style, display: 'block' }}>
      {children}
    </span>
  );
}

export function Swatch({
  hex,
  label,
  sublabel,
  isDark: _isDark,
  showBorder = false,
  size = 'md',
}: {
  hex: string;
  label?: string;
  sublabel?: string;
  isDark: boolean;
  showBorder?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
  };
  const w = sizeMap[size];
  const h = sizeMap[size];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: hds.semantic.space.subgrid.gap,
        alignItems: 'flex-start',
      }}
    >
      <div
        data-inspector-ignore="color-swatch"
        style={{
          width: w,
          height: h,
          background: hex,
          flexShrink: 0,
          outline: showBorder
            ? `${hds.borderWidth.default} solid var(--semantic-color-border-default)`
            : undefined,
        }}
      />
      {label && (
        <span className="font-normal text-secondary" style={{ ...hds.typeStyles.caption }}>
          {label}
        </span>
      )}
      {sublabel && (
        <span className="font-normal text-secondary" style={{ ...hds.typeStyles.caption }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function SurfaceSwatch({
  background,
  textHex,
  label,
  sublabel,
  isDark: _isDark,
  size = 80,
  centerText = false,
}: {
  background: string;
  textHex: string;
  label: string;
  sublabel?: string;
  isDark: boolean;
  size?: number;
  centerText?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: hds.semantic.space.subgrid.gap,
        alignItems: 'flex-start',
      }}
    >
      <div
        aria-hidden="true"
        data-inspector-ignore="color-swatch"
        // inline-ok: HDS doc infrastructure component — multiple display/layout properties required
        style={{
          width: size,
          height: size,
          background,
          flexShrink: 0,
          outline: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
          display: 'flex',
          alignItems: centerText ? 'center' : 'flex-end',
          justifyContent: centerText ? 'center' : 'flex-start',
          textAlign: centerText ? 'center' : 'left',
          padding: centerText ? 12 : 10,
          color: textHex,
          ...hds.typeStyles.heading1,
        }}
      >
        Ag
      </div>
      {label && (
        <span className="font-normal text-secondary" style={{ ...hds.typeStyles.caption }}>
          {label}
        </span>
      )}
      {sublabel && (
        <span className="font-normal text-secondary" style={{ ...hds.typeStyles.caption }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

export function HRule() {
  return (
    <Surface
      padding="item"
      style={{
        height: 1,
        background: 'var(--semantic-color-border-default)',
        marginTop: hds.semantic.space.layout.gap,
        marginBottom: hds.semantic.space.layout.gap,
      }}
    />
  );
}

// ─── TYPOGRAPHY DATA ──────────────────────────────────────────────────────────

export const TYPE_PRESETS: Array<{ name: keyof typeof hds.typeStyles; usage: string }> = [
  {
    name: 'display',
    usage: 'Section panel titles (SectionHead). Max one per panel. Never body or ui.',
  },
  { name: 'heading1', usage: 'Primary section headings (h1). 36px / 1.25 / 700.' },
  { name: 'heading2', usage: 'Secondary section headings (h2).' },
  { name: 'heading3', usage: 'Tertiary headings and card titles.' },
  {
    name: 'ui',
    usage:
      'Descriptive interface labels, table headers, and human-readable metadata. 14px / 400 / normal tracking.',
  },
  {
    name: 'technical',
    usage:
      'Token names, state identifiers, property names, and code-adjacent values. 12px / mono / high-signal.',
  },
  {
    name: 'body',
    usage:
      'Project descriptions, explanatory copy, and technical notes. Prefer body for long-form documentation prose. 16px / normal tracking.',
  },
  {
    name: 'caption',
    usage:
      'Secondary meta, timestamps, annotation pills, and short supporting notes. 12px / 400 / normal tracking.',
  },
  { name: 'label', usage: 'Form labels and small UI text. 14px / 400 / normal tracking.' },
];

export const FONT_SIZES = Object.entries(hds.fontSize).map(([k, v]) => ({ key: k, val: v }));
export const LETTER_SPACING = Object.entries(hds.letterSpacing).map(([k, v]) => ({
  key: k,
  val: v as string,
}));

// ─── ARCHITECTURE DATA ────────────────────────────────────────────────────────

export const TOKEN_REF_GROUPS: Array<{
  group: string;
  icon: React.ReactNode;
  entries: Array<{ path: string; value: string; css: string }>;
}> = [
  {
    group: 'Font Size',
    icon: <Icon icon={TextAa} size="small" color="currentColor" />,
    entries: [
      {
        path: 'primitive.typography.size.2xs',
        value: '10px',
        css: '--primitive-typography-size-2xs',
      },
      {
        path: 'primitive.typography.size.xs',
        value: '12px',
        css: '--primitive-typography-size-xs',
      },
      {
        path: 'primitive.typography.size.sm',
        value: '14px',
        css: '--primitive-typography-size-sm',
      },
      {
        path: 'primitive.typography.size.base',
        value: '16px',
        css: '--primitive-typography-size-base',
      },
      {
        path: 'primitive.typography.size.lg',
        value: '20px',
        css: '--primitive-typography-size-lg',
      },
      {
        path: 'primitive.typography.size.xl',
        value: '24px',
        css: '--primitive-typography-size-xl',
      },
    ],
  },
  {
    group: 'Letter Spacing',
    icon: <Icon icon={TextAa} size="small" color="currentColor" />,
    entries: [
      {
        path: 'primitive.typography.letterSpacing.tighter',
        value: '-0.8px',
        css: '--primitive-typography-letterSpacing-tighter',
      },
      {
        path: 'primitive.typography.letterSpacing.tight',
        value: '-0.4px',
        css: '--primitive-typography-letterSpacing-tight',
      },
      {
        path: 'primitive.typography.letterSpacing.normal',
        value: '0px',
        css: '--primitive-typography-letterSpacing-normal',
      },
      {
        path: 'primitive.typography.letterSpacing.wide',
        value: '0.4px',
        css: '--primitive-typography-letterSpacing-wide',
      },
      {
        path: 'primitive.typography.letterSpacing.wider',
        value: '0.8px',
        css: '--primitive-typography-letterSpacing-wider',
      },
    ],
  },
  {
    group: 'Icon Size',
    icon: <Icon icon={Cube} size="small" color="currentColor" />,
    entries: [
      {
        path: 'primitive.typography.size.base',
        value: '16',
        css: '--primitive-typography-size-base',
      },
      { path: 'primitive.typography.size.lg', value: '20', css: '--primitive-typography-size-lg' },
      { path: 'primitive.typography.size.xl', value: '24', css: '--primitive-typography-size-xl' },
    ],
  },
  {
    group: 'Border Radius',
    icon: <Icon icon={Cube} size="small" color="currentColor" />,
    entries: [
      { path: 'primitive.radius.0', value: '0px', css: '--primitive-radius-0' },
      { path: 'primitive.radius.2', value: '2px', css: '--primitive-radius-2' },
      { path: 'primitive.radius.4', value: '4px', css: '--primitive-radius-4' },
      { path: 'primitive.radius.8', value: '8px', css: '--primitive-radius-8' },
      { path: 'primitive.radius.full', value: '9999px', css: '--primitive-radius-full' },
      { path: 'semantic.radius.action', value: '4px', css: '--semantic-radius-action' },
    ],
  },
  {
    group: 'Duration',
    icon: <Icon icon={Lightning} size="small" color="currentColor" />,
    entries: [
      { path: 'primitive.duration.instant', value: '100ms', css: '--primitive-duration-instant' },
      { path: 'primitive.duration.short', value: '150ms', css: '--primitive-duration-short' },
      { path: 'primitive.duration.medium', value: '250ms', css: '--primitive-duration-medium' },
      { path: 'primitive.duration.long', value: '400ms', css: '--primitive-duration-long' },
    ],
  },
  {
    group: 'Easing',
    icon: <Icon icon={Lightning} size="small" color="currentColor" />,
    entries: [
      {
        path: 'primitive.easing.emphasized',
        value: '[.4,0,.2,1]',
        css: '--primitive-easing-emphasized',
      },
      {
        path: 'primitive.easing.decelerate',
        value: '[0,0,.2,1]',
        css: '--primitive-easing-decelerate',
      },
      {
        path: 'primitive.easing.accelerate',
        value: '[.4,0,1,1]',
        css: '--primitive-easing-accelerate',
      },
      {
        path: 'primitive.easing.elastic',
        value: 'spring(300,20,1)',
        css: '--primitive-easing-elastic',
      },
    ],
  },
  {
    group: 'Color Brand',
    icon: <Icon icon={Palette} size="small" color="currentColor" />,
    entries: [
      {
        path: 'semantic.accent.rest',
        value: tokenValues.primitive.color.blue['500'],
        css: '--semantic-accent-rest',
      },
      {
        path: 'semantic.accent.hover',
        value: tokenValues.primitive.color.blue['600'],
        css: '--semantic-accent-hover',
      },
      {
        path: 'primitive.color.neutral.white',
        value: tokenValues.primitive.color.neutral.white,
        css: '--primitive-color-neutral-white',
      },
    ],
  },
  {
    group: 'Spacing (select)',
    icon: <Icon icon={Ruler} size="small" color="currentColor" />,
    entries: [
      { path: 'semantic.space.subgrid.gap', value: '4px', css: '--semantic-space-subgrid-gap' },
      {
        path: 'semantic.space.subgrid.hairline',
        value: '2px',
        css: '--semantic-space-subgrid-hairline',
      },
      { path: 'semantic.space.component.gap', value: '8px', css: '--semantic-space-component-gap' },
      {
        path: 'semantic.space.component.padding',
        value: '12px',
        css: '--semantic-space-component-padding',
      },
      {
        path: 'semantic.space.layout.gutter',
        value: '24px',
        css: '--semantic-space-layout-gutter',
      },
      { path: 'semantic.space.layout.gap', value: '32px', css: '--semantic-space-layout-gap' },
    ],
  },
];

// ─── COLOR DATA ───────────────────────────────────────────────────────────────

export const BLUE_STEPS = Object.entries(hds.color.blue) as Array<[string, string]>;
export const SURFACE_TIERS = Object.entries(hds.color.surface) as Array<
  [string, { dark: string; light: string }]
>;
export const FEEDBACK_COLORS = Object.entries(hds.color.feedback) as Array<
  [string, { dark: string; light: string }]
>;

// Neutral palette — sourced from generated-token-values (primitive.color.neutral.*).
const _n = tokenValues.primitive.color.neutral;
export const NEUTRAL_STEPS: Array<[string, string]> = [
  ['white', _n.white],
  ['50', _n['50']],
  ['100', _n['100']],
  ['200', _n['200']],
  ['300', _n['300']],
  ['400', _n['400']],
  ['500', _n['500']],
  ['600', _n['600']],
  ['700', _n['700']],
  ['800', _n['800']],
  ['900', _n['900']],
  ['950', _n['950']],
  ['black', _n.black],
];

// Resolved hex for each blue step — used as sublabels in the ramp display.
// Blue palette — sourced from generated-token-values (primitive.color.blue.*).
export const BLUE_HEX: Record<string, string> = { ...tokenValues.primitive.color.blue };

// ─── MOTION DATA ──────────────────────────────────────────────────────────────

export function bezierPath(p1x: number, p1y: number, p2x: number, p2y: number, W = 120, H = 60) {
  return `M 0,${H} C ${p1x * W},${H - p1y * H} ${p2x * W},${H - p2y * H} ${W},0`;
}

export const EASING_CURVES = [
  {
    label: 'emphasized',
    values: '[0.40, 0, 0.20, 1]',
    path: bezierPath(0.4, 0, 0.2, 1),
    note: 'Balanced midpoint curve with symmetrical acceleration and deceleration.',
  },
  {
    label: 'decelerate',
    values: '[0, 0, 0.20, 1]',
    path: bezierPath(0, 0, 0.2, 1),
    note: 'High initial velocity that eases into a controlled stop.',
  },
];

export const DURATION_STEPS = [
  {
    name: 'instant',
    value: hds.motion.exit.duration,
    label: '0.10s',
    note: 'No delay for immediate state flips or removals.',
  },
  {
    name: 'short',
    value: hds.motion.productive.duration,
    label: '0.15s',
    note: 'Hover reveals, tooltip fade, micro-interactions.',
  },
  {
    name: 'medium',
    value: hds.motion.expressive.duration,
    label: '0.25s',
    note: 'Prominent surface changes and teaching moments.',
  },
  {
    name: 'long',
    value: hds.motion.spatial.duration,
    label: '0.40s',
    note: 'Long-distance movement across the viewport.',
  },
];

// ─── SPACING DATA ─────────────────────────────────────────────────────────────

export const SPACE_ENTRIES = Object.entries(hds.space) as Array<[string, string]>;

export const LAYOUT_NOTES: Array<{ name: keyof typeof hds.layout; note: string }> = [
  {
    name: 'pageGutterH',
    note: 'Page horizontal gutter — left + right padding on all full-width sections',
  },
  {
    name: 'mobileGutterH',
    note: 'Mobile horizontal gutter — narrower clamp range for small viewports',
  },
  {
    name: 'sectionPad',
    note: 'Section vertical padding — breathing room above/below section content',
  },
  {
    name: 'sectionPadSm',
    note: 'Compact section pad — used in dense panels and compact media headers',
  },
  { name: 'panelGap', note: 'Gap between panels in multi-panel layouts — responsive clamp' },
  { name: 'panelGapMob', note: 'Mobile panel gap — wider relative padding on narrow screens' },
];

// ─── COMPONENT DEMO DATA + COMPONENTS ────────────────────────────────────────

// Button
export const BUTTON_DEMO_STATES = [
  { state: 'rest', label: 'Rest' },
  { state: 'hover', label: 'Hover' },
  { state: 'focused', label: 'Focused' },
  { state: 'pressed', label: 'Pressed' },
  { state: 'disabled', label: 'Disabled' },
] as const;
type HdsButtonDemoState = (typeof BUTTON_DEMO_STATES)[number]['state'];
type HdsButtonVariant = 'primary' | 'secondary' | 'tertiary';

export function DemoButton({
  state,
  isDark: _isDark,
  variant = 'primary',
  children,
}: {
  state: HdsButtonDemoState;
  isDark: boolean;
  variant?: HdsButtonVariant;
  children?: React.ReactNode;
}) {
  return (
    <FreezeState state={state}>
      <Button variant={variant} disabled={state === 'disabled'}>
        {children ?? (variant === 'tertiary' ? 'View portfolio' : 'Continue')}
      </Button>
    </FreezeState>
  );
}

// Tag
export const TAGS: Array<{ label: string; active: boolean }> = [
  { label: 'Design', active: true },
  { label: 'Development', active: false },
  { label: 'Branding', active: true },
  { label: 'Motion', active: false },
  { label: 'UI Systems', active: false },
  { label: 'Product', active: false },
];

export function DemoTag({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onClick?: () => void;
}) {
  return (
    <Tag active={active} onClick={onClick ?? (() => {})}>
      {label}
    </Tag>
  );
}

// Tooltip
export function TooltipDemo({ isDark: _isDark }: { isDark: boolean }) {
  const [hov, setHov] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div
      // inline-ok: HDS doc infrastructure component — multiple display/layout properties required
      style={{
        position: 'relative',
        height: 100, // audit-ok: interactive demo area — fixed visual height, not a spacing/layout token
        background: 'var(--semantic-color-surface-raised)',
        cursor: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
    >
      <span
        className="font-normal"
        style={{
          ...hds.typeStyles.caption,
          color: 'var(--semantic-color-content-disabled)',
          userSelect: 'none',
        }}
      >
        Hover anywhere in this area
      </span>
      <Tooltip visible={hov} mode="cursor" x={pos.x} y={pos.y} />
    </div>
  );
}

// CascadeText preview
export function CascadePreview({ isDark: _isDark }: { isDark: boolean }) {
  const [key, setKey] = useState(0);
  return (
    <Surface
      // inline-ok: HDS doc infrastructure component — multiple display/layout properties required
      padding="component"
      onClick={() => setKey((k) => k + 1)}
      style={{
        background: 'var(--semantic-color-surface-raised)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: hds.semantic.space.component.gap,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      title="Click to replay"
    >
      <span
        className="text-primary"
        data-inspector-ignore="motion-text"
        style={{ ...hds.typeStyles.display }}
      >
        <CascadeText key={key} text="Hirobius" tag="span" delay={0.04} />
      </span>
      <span className="font-normal text-secondary" style={{ ...hds.typeStyles.caption }}>
        Click to replay
      </span>
    </Surface>
  );
}
