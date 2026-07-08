/**
 * TextLockup - governed title-and-description pairing primitive.
 * @category Display
 * @tier pattern
 * @ai-intent Solves recurring heading, eyebrow, and supporting-copy composition with predefined typographic pairings so agents can express hierarchy without manually tuning text stacks.
 * @ai-rules Use TextLockup when content is a semantic title lockup with optional eyebrow and supporting text. Do NOT use TextLockup for arbitrary prose groups, data tables, or freeform mixed layouts. Do NOT restyle the internal type pairing with custom heading stacks when an existing size already fits. Do NOT use TextLockup to replace standalone body text or labels that do not form a title-description unit.
 */
// motion-ok: numbered lockup copy actions intentionally keep the heading static so anchor affordances do not introduce editorial layout jitter
// font-ok: inline technical affordances within this lockup intentionally use monospace for code-like references
// vocab-ok: `size` (hero|heroXl|section|metric|detail|numbered) is a pre-existing structural preset ramp choosing a title+description type pairing — the same kind of component-specific "structural shape" concept the variant-contract's `variant` axis describes — not the physical sm|md|lg scale the contract's `size` axis expects. Kept as `size` (established public API, CLAUDE.md "preserve prop names unless genuinely off contract") rather than force a breaking rename for a single-axis pattern component.

import { forwardRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Link, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';
import { Text } from './text';

// ── Variants ───────────────────────────────────────────────────────────────────

// The `all: unset` reset below must stay a single inline style object: `all`
// resets literally every CSS property (including ones a sibling Tailwind
// class would try to set), and inline `style` always outranks any class
// regardless of source order, so any property this button needs (layout,
// cursor, color) has to be re-declared *after* `all: 'unset'` inside the same
// style object to win the cascade — splitting it across class + inline would
// let `all: unset` silently clobber the class-based properties. Not
// expressible as Tailwind classes without breaking the reset; kept inline.
const anchorCopyBtnStyle = {
  all: 'unset',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--semantic-space-subgrid-gap)',
  cursor: 'pointer',
  userSelect: 'none',
  color: 'var(--semantic-color-content-primary)',
  textAlign: 'left',
} satisfies CSSProperties;

// Root wrapper layout. `size` drives only the gap (component vs subgrid
// rhythm); `align` drives the cross-axis alignment + text-align pairing.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component/subgrid gap composite tokens have no Tailwind-theme spacing utility; var()-based so still token-driven
const textLockupRootVariants = cva('flex w-full min-w-0 flex-col', {
  variants: {
    size: {
      hero: 'gap-[var(--semantic-space-component-gap)]',
      heroXl: 'gap-[var(--semantic-space-component-gap)]',
      section: 'gap-[var(--semantic-space-component-gap)]',
      metric: 'gap-[var(--semantic-space-subgrid-gap)]',
      detail: 'gap-[var(--semantic-space-subgrid-gap)]',
      numbered: 'gap-[var(--semantic-space-subgrid-gap)]',
    },
    align: {
      left: 'items-stretch text-left',
      center: 'items-center text-center',
    },
  },
  defaultVariants: { align: 'left' },
});

// Centered lockups clamp the eyebrow/description to a fixed reading measure —
// pre-existing behavior (640, not a token) carried over from the old inline
// `maxWidth: centered ? 640 : ...` override.
const CENTERED_MAX_WIDTH_CLASS = 'max-w-[640px]';

type TextLockupSize = 'hero' | 'heroXl' | 'section' | 'metric' | 'detail' | 'numbered';
type TextLockupAlign = 'left' | 'center';
type TextLockupTitleTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
type TextLockupDescriptionTag = 'div' | 'p' | 'span';

/** @public */
export type TextLockupProps = {
  /** Primary heading copy rendered by the lockup. */
  title: string;
  /** Supporting body copy paired with the title. */
  description?: ReactNode;
  /** Optional overline or category cue displayed above the title. */
  eyebrow?: string;
  /** Preset controlling title and body type pairing. */
  size: TextLockupSize;
  /** Horizontal alignment for the text pair. */
  align?: TextLockupAlign;
  /**
   * When provided on the `numbered` size, renders a copy-anchor action
   * next to the title on hover. Should match the section's DOM id.
   */
  id?: string;
  /** Override the semantic wrapper while preserving the governed layout styles. */
  as?: ElementType;
  /** Override the title tag without altering the visual type ramp. */
  titleAs?: TextLockupTitleTag;
  /** Override the description tag without altering the visual type ramp. */
  descriptionAs?: TextLockupDescriptionTag;
};

// D6: the type ramp is owned by Text via `variant`. SIZE_MAP keeps only the
// variant + tag + className overrides (color, max-width, and `detail`'s
// deliberate metric deviations) — Text's own cva variants already carry the
// base font-family/size/weight/letter-spacing/line-height/max-width for the
// same variant, so these overrides only touch the properties that genuinely
// differ. The anchor-span case inherits its font from the surrounding
// <Text variant>.
const TITLE_COLOR_CLASS = 'text-foreground'; // role-foreground === --semantic-color-content-primary
const DESC_COLOR_CLASS = 'text-muted-foreground'; // role-muted-foreground === --semantic-color-content-secondary

const DESC_MAX_WIDTH_CLASS = 'max-w-[var(--semantic-layout-prose-maxWidth)]';

// Deliberate deviation from the variant: `body`/`technical` Text variants but
// ui/mono composite metrics for the dense data-readout layout (leading-none
// overrides mono's own line-height). fontFamily stays the literal `monospace`
// keyword (not the branded mono token) — see the file-level `font-ok` note.
const DETAIL_TITLE_CLASS =
  'text-foreground [font-size:var(--semantic-typography-ui-font-size)] [font-weight:var(--semantic-typography-ui-font-weight)] [line-height:var(--semantic-typography-ui-line-height)]';
const DETAIL_DESCRIPTION_CLASS =
  'text-muted-foreground leading-none [font-family:monospace] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)]';

const SIZE_MAP: Record<
  TextLockupSize,
  {
    titleClassName: string;
    descriptionClassName: string;
    titleTag: TextLockupTitleTag;
    titleVariant: 'display' | 'heading1' | 'heading2' | 'body';
    descriptionVariant: 'body' | 'ui' | 'technical';
  }
> = {
  hero: {
    titleClassName: TITLE_COLOR_CLASS,
    descriptionClassName: cn(DESC_COLOR_CLASS, DESC_MAX_WIDTH_CLASS),
    titleTag: 'h1',
    titleVariant: 'heading1',
    descriptionVariant: 'body',
  },
  heroXl: {
    titleClassName: TITLE_COLOR_CLASS,
    descriptionClassName: cn(DESC_COLOR_CLASS, DESC_MAX_WIDTH_CLASS),
    titleTag: 'h1',
    titleVariant: 'display',
    descriptionVariant: 'body',
  },
  section: {
    titleClassName: TITLE_COLOR_CLASS,
    descriptionClassName: cn(DESC_COLOR_CLASS, DESC_MAX_WIDTH_CLASS),
    titleTag: 'h2',
    titleVariant: 'heading2',
    descriptionVariant: 'ui',
  },
  metric: {
    titleClassName: TITLE_COLOR_CLASS,
    descriptionClassName: cn(DESC_COLOR_CLASS, DESC_MAX_WIDTH_CLASS),
    titleTag: 'h2',
    titleVariant: 'heading1',
    descriptionVariant: 'ui',
  },
  detail: {
    titleClassName: DETAIL_TITLE_CLASS,
    descriptionClassName: DETAIL_DESCRIPTION_CLASS,
    titleTag: 'p',
    titleVariant: 'body',
    descriptionVariant: 'technical',
  },
  numbered: {
    titleClassName: TITLE_COLOR_CLASS,
    descriptionClassName: cn(DESC_COLOR_CLASS, DESC_MAX_WIDTH_CLASS),
    titleTag: 'h2',
    titleVariant: 'heading2',
    descriptionVariant: 'ui',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export const TextLockup = forwardRef<HTMLElement, TextLockupProps>(function TextLockup(
  {
    title,
    description,
    eyebrow,
    size,
    align = 'left',
    id,
    as: RootTag = 'div',
    titleAs,
    descriptionAs: DescriptionTag = 'div',
  },
  ref,
) {
  const config = SIZE_MAP[size];
  const TitleTag = titleAs ?? config.titleTag;
  const centered = align === 'center';
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showAnchor = size === 'numbered' && Boolean(id);

  return (
    <RootTag ref={ref} className={textLockupRootVariants({ size, align })}>
      {eyebrow ? (
        <Text
          variant="ui"
          as="p"
          className={cn(DESC_COLOR_CLASS, centered && CENTERED_MAX_WIDTH_CLASS)}
        >
          {eyebrow}
        </Text>
      ) : null}

      {showAnchor ? (
        <div className="hds-doc-section-header flex">
          <Text variant={config.titleVariant} as={TitleTag}>
            <button
              type="button"
              onClick={copyLink}
              className="hds-focus"
              aria-label={`Copy link to ${title}`}
              style={anchorCopyBtnStyle}
            >
              <span className={config.titleClassName}>{title}</span>
              <span
                aria-hidden="true"
                data-copied={copied ? 'true' : undefined}
                className="hds-doc-section-copy-icon flex flex-shrink-0 items-center text-accent-foreground"
              >
                {copied ? (
                  <Icon icon={Check} size="small" color="var(--semantic-color-content-accent)" />
                ) : (
                  <Icon icon={Link} size="small" color="var(--semantic-color-content-accent)" />
                )}
              </span>
            </button>
          </Text>
        </div>
      ) : (
        <Text variant={config.titleVariant} as={TitleTag} className={config.titleClassName}>
          {title}
        </Text>
      )}

      {description ? (
        <Text
          variant={config.descriptionVariant}
          as={DescriptionTag}
          className={cn(config.descriptionClassName, centered && CENTERED_MAX_WIDTH_CLASS)}
        >
          {description}
        </Text>
      ) : null}
    </RootTag>
  );
});
