/**
 * Card — surface container with slot anatomy (12d-card-anatomy).
 * @category Display
 * @tier primitive
 *
 * Slot anatomy (DESIGN.md §"Card Anatomy"). Status, progress, and metadata are
 * layout-bearing — they live in slots, never inline next to prose.
 *
 *   <Card tone="accent">
 *     <Card.Header metadata={<Badge tone="warning">in-progress</Badge>}>
 *       <Card.Title>Discovery phase</Card.Title>
 *       <Card.Description>Stakeholder interviews and audit prep.</Card.Description>
 *     </Card.Header>
 *     <Card.Progress value={42} max={100} label="5 / 12 tasks" />
 *     <Card.Metric label="Retainer" value="$3,500" sub="Active" />
 *     <Card.Body>…</Card.Body>
 *     <Card.Footer>…</Card.Footer>
 *   </Card>
 *
 * Slot reservations:
 * - Header: title (h3) + optional description (caption) + optional metadata
 *   zone (right-aligned, holds <Badge> / <Tag> for status, never raw spans).
 * - Progress: full-width 4px bar in a reserved 16px vertical rail. Owns its
 *   spacing — never crowds adjacent prose.
 * - Metric: single label-uppercase + big value (h2) + optional sub-line.
 *   Reserved vertical block. Use multiple side-by-side via flex/grid container.
 * - Body: prose, lists, structured content. NO inline status, progress, or
 *   thin colored bars. Group sections via separate <Card.Body> blocks.
 * - Footer: actions, secondary metadata, timestamps.
 *
 * Tone prop: 'default' (neutral border) | 'accent' (border-accent + raised bg)
 * for highlighted variants like "recommended package", or feedback tones for
 * status-driven cards. Tone replaces hand-rolled `pkgHighlight`-style overrides.
 *
 * Legacy props (padding / gap / noPadding / as / style) are retained.
 * Existing callers that pass raw children continue to work; new callers
 * should prefer compound parts + `padding="none"`.
 *
 * Depth comes from semantic.color.border.default (role.border) at rest;
 * elevation tokens are not bound by default — pass `className="shadow-..."`
 * for a hover/floating treatment on interactive cards.
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';

// ── Legacy padding/gap helpers (retained for backward compat) ─────────────────

type PaddingOption = 'component' | 'item' | 'none' | 'px24' | 'px16';
type GapOption = 'tight' | 'normal' | 'inset' | 'spacious' | keyof typeof hds.space;

const PADDING_MAP: Record<PaddingOption, string> = {
  component: 'var(--semantic-space-component-padding)',
  item: '16px',
  px24: '24px',
  px16: '16px',
  none: '0',
};

const GAP_MAP: Record<string, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

function resolvePadding(p: PaddingOption): string {
  return PADDING_MAP[p] ?? '0';
}

function resolveGap(g: GapOption): string {
  if (typeof g === 'string' && g in GAP_MAP) return GAP_MAP[g];
  const fromSpace = (hds.space as Record<string, unknown>)[g as string];
  return (fromSpace as string) ?? (g as string);
}

// ── Root ──────────────────────────────────────────────────────────────────────

type CardTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

// 12d-3 outline rule: tone="default" is BORDERLESS by default. Outlines are
// signal-bearing — they appear when the card carries a feedback meaning
// (accent / success / warning / danger). Repeated default cards in a grid
// no longer create the outlined-grid look that crowded the dashboards.
//
// For the legitimate "discrete repeated object that benefits from explicit
// containment" case (e.g. a list of standalone records in a sparse layout),
// pass `bordered` to opt back in. CLAUDE.md memory directive 2026-05-03:
// "avoid repeated outlined cards as the default structure. Use open bands,
// dividers, rails, disclosures, and whitespace unless the content is a
// genuinely discrete repeated object."
const TONE_BORDER_COLOR: Record<CardTone, string> = {
  default: 'transparent', // borderless by default
  accent: 'var(--semantic-color-border-accent)',
  success: 'var(--semantic-color-feedback-success)',
  warning: 'var(--semantic-color-feedback-warning)',
  danger: 'var(--semantic-color-feedback-error)',
};

const TONE_BORDER_WIDTH: Record<CardTone, string> = {
  default: '1px', // 1px transparent preserves layout box
  accent: '2px',
  success: '1px',
  warning: '1px',
  danger: '1px',
};

/** @public */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render-as element for the root wrapper. */
  as?: React.ElementType;
  /** Legacy padding prop for raw-children cards. Use `none` when composing parts. */
  padding?: PaddingOption;
  /** Legacy gap prop for the root flex container. */
  gap?: GapOption;
  /** Legacy convenience flag that removes inner padding. */
  noPadding?: boolean;
  /** Visual tone — controls border color/weight. Default is BORDERLESS;
   *  `accent` for highlighted entries (e.g. recommended package);
   *  semantic tones for status-driven cards (border IS the signal).
   *  For a neutral-bordered card without semantic meaning, pass
   *  `bordered` instead of overloading tone. */
  tone?: CardTone;
  /** Opt in to a neutral 1px border on the default tone. Use for genuinely
   *  discrete standalone records in sparse layouts where containment helps
   *  legibility. Default false — repeated cards in grids should stay
   *  borderless and rely on whitespace, rails, or section dividers. */
  bordered?: boolean;
}

interface CardComponent extends React.ForwardRefExoticComponent<
  CardProps & React.RefAttributes<HTMLDivElement>
> {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
  Progress: typeof CardProgress;
  Metric: typeof CardMetric;
}

const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    className,
    padding = 'component',
    gap = 'tight',
    noPadding = false,
    as,
    style,
    tone = 'default',
    bordered = false,
    children,
    ...rest
  },
  ref,
) {
  const Comp = (as ?? 'div') as React.ElementType;
  const resolvedPadding = noPadding ? 'none' : padding;
  const paddingValue = resolvePadding(resolvedPadding);
  const gapValue = resolvedPadding === 'none' ? '0' : resolveGap(gap);

  // Border resolution: explicit feedback tone always wins; otherwise
  // `bordered` opts into a neutral 1px border; otherwise transparent
  // (layout-preserving but invisible).
  const borderColor =
    tone === 'default'
      ? bordered
        ? 'var(--semantic-color-border-default)'
        : 'transparent'
      : TONE_BORDER_COLOR[tone];

  return (
    <Comp
      ref={ref}
      data-padding={resolvedPadding}
      data-tone={tone}
      data-bordered={bordered ? 'true' : 'false'}
      className={cn('flex h-full flex-col rounded-lg bg-card text-card-foreground', className)}
      // inline-ok: token-driven padding/gap legacy contract + tone-driven border
      style={{
        padding: paddingValue,
        gap: gapValue,
        border: `${TONE_BORDER_WIDTH[tone]} solid ${borderColor}`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
});

// ── Parts ─────────────────────────────────────────────────────────────────────

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Top-of-card metadata zone — status badges, tags, eyebrow labels.
   *  Accepts <Badge>, <Tag>, or compound nodes. NEVER pass raw spans
   *  with status colors here; use the proper primitive so tone, padding,
   *  and accessibility role are consistent.
   *
   *  Rendered ABOVE the title (Material/Polaris/Carbon convention) — no
   *  two-column flex, no crowding next to long titles, mobile-friendly. */
  metadata?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, metadata, children, ...props },
  ref,
) {
  if (metadata !== undefined) {
    // Top-of-card metadata + stacked title/description below. Inline-flex
    // wrapper around the metadata keeps the badge sized to its content
    // (no full-width stretch). The 12px gap reads as a single header
    // section without crowding either zone.
    return (
      <div ref={ref} className={cn('flex flex-col gap-3 p-6', className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">{metadata}</div>
        <div className="flex flex-col space-y-1.5 min-w-0">{children}</div>
      </div>
    );
  }
  return (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
});

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    const { children, ...rest } = props;
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...rest}
      >
        {children}
      </h3>
    );
  },
);

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
});

const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardBody({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
  },
);

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />;
  },
);

// ── Progress slot ─────────────────────────────────────────────────────────────

const PROGRESS_TONE_FILL: Record<CardTone, string> = {
  default: 'var(--semantic-color-content-accent)',
  accent: 'var(--semantic-color-content-accent)',
  success: 'var(--semantic-color-feedback-success)',
  warning: 'var(--semantic-color-feedback-warning)',
  danger: 'var(--semantic-color-feedback-error)',
};

interface CardProgressProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'aria-valuemin' | 'aria-valuemax' | 'aria-valuenow'
> {
  /** Current value (0..max). */
  value: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  /** Optional caption rendered beneath the bar. Reserved baseline so it
   *  never crowds the slot above. Accepts strings or react nodes. */
  label?: React.ReactNode;
  /** Visual tone for the fill. Defaults to accent. Use feedback tones to
   *  signal status without a separate badge (e.g. red bar for over-budget). */
  tone?: CardTone;
}

const CardProgress = React.forwardRef<HTMLDivElement, CardProgressProps>(function CardProgress(
  { className, value, max = 100, label, tone = 'default', style, ...props },
  ref,
) {
  const clamped = Math.max(0, Math.min(value, max));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  return (
    <div
      ref={ref}
      className={cn('px-6 pb-2', className)}
      // The Progress slot owns its vertical rail. Padding-x matches the
      // Header/Body 24px inset; padding-bottom reserves 8px below the
      // optional label. NO direct collision with adjacent prose.
      style={style}
      {...props}
    >
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        /* hds-bypass: INLINE_THIN_BAR — Card.Progress IS the progress bar primitive; height + token-bg is its raison d'être */
        style={{
          height: '4px',
          background: 'var(--semantic-color-border-default)',
          borderRadius: hds.borderRadius[2],
          overflow: 'hidden',
        }}
      >
        <div
          // inline-ok: token-driven progress fill width is dynamic
          style={{
            height: '100%',
            width: `${pct}%`,
            background: PROGRESS_TONE_FILL[tone],
            borderRadius: hds.borderRadius[2],
            transition: `width ${hds.motion.expressive.duration}s ease-out`,
          }}
        />
      </div>
      {label !== undefined && (
        <p
          // inline-ok: token-driven caption inside structural slot
          style={{
            ...hds.typeStyles.caption,
            margin: '6px 0 0',
            color: 'var(--semantic-color-content-secondary)',
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
});

// ── Metric slot ───────────────────────────────────────────────────────────────

const METRIC_TONE_VALUE_COLOR: Record<CardTone, string> = {
  default: 'var(--semantic-color-content-primary)',
  accent: 'var(--semantic-color-content-accent)',
  success: 'var(--semantic-color-feedback-success)',
  warning: 'var(--semantic-color-feedback-warning)',
  danger: 'var(--semantic-color-feedback-error)',
};

interface CardMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Uppercase eyebrow label (e.g. "Retainer", "Open tasks"). */
  label: React.ReactNode;
  /** Big value (e.g. "$3,500", "12", "67%"). Rendered at h2 weight. */
  value: React.ReactNode;
  /** Optional sub-line beneath the value (e.g. "Active", "this week"). */
  sub?: React.ReactNode;
  /** Tone for the value — applies semantic color. Defaults to neutral. */
  tone?: CardTone;
}

const CardMetric = React.forwardRef<HTMLDivElement, CardMetricProps>(function CardMetric(
  { className, label, value, sub, tone = 'default', style, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('flex flex-col px-6', className)} style={style} {...props}>
      <p
        style={{
          ...hds.typeStyles.eyebrow,
          margin: '0 0 6px',
          color: 'var(--semantic-color-content-secondary)',
        }}
      >
        {label}
      </p>
      <p
        // inline-ok: token-driven value, slot-internal
        style={{
          ...hds.typeStyles.h2,
          margin: 0,
          color: METRIC_TONE_VALUE_COLOR[tone],
        }}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p
          // inline-ok: token-driven sub-line, slot-internal
          style={{
            ...hds.typeStyles.caption,
            margin: '4px 0 0',
            color: 'var(--semantic-color-content-secondary)',
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
});

// ── Compound assembly ─────────────────────────────────────────────────────────

export const Card = CardRoot as CardComponent;
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Progress = CardProgress;
Card.Metric = CardMetric;

export { CardHeader, CardTitle, CardDescription, CardBody, CardFooter, CardProgress, CardMetric };
