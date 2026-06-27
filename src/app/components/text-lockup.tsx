/**
 * TextLockup - governed title-and-description pairing primitive.
 * @category Display
 * @tier pattern
 * @ai-intent Solves recurring heading, eyebrow, and supporting-copy composition with predefined typographic pairings so agents can express hierarchy without manually tuning text stacks.
 * @ai-rules Use TextLockup when content is a semantic title lockup with optional eyebrow and supporting text. Do NOT use TextLockup for arbitrary prose groups, data tables, or freeform mixed layouts. Do NOT restyle the internal type pairing with custom heading stacks when an existing size already fits. Do NOT use TextLockup to replace standalone body text or labels that do not form a title-description unit.
 */
// motion-ok: numbered lockup copy actions intentionally keep the heading static so anchor affordances do not introduce editorial layout jitter
// font-ok: inline technical affordances within this lockup intentionally use monospace for code-like references

import { forwardRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { Link, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { Icon } from './icon';
import { Text } from './text';

const textLockupStyles = {
  anchorCopyBtn: {
    all: 'unset' as const,
    display: 'flex',
    alignItems: 'center',
    gap: hds.semantic.space.subgrid.gap,
    cursor: 'pointer',
    userSelect: 'none' as const,
    color: 'var(--semantic-color-content-primary)',
    textAlign: 'left' as const,
  } satisfies React.CSSProperties,
} as const;

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
// variant + tag + gap + layout-only overrides (color, max-width, and `detail`'s
// deliberate metric deviations) — the redundant `...hds.typeStyles.*` spreads
// (which Text already applies for the same variant) are gone. The anchor-span
// case inherits its font from the surrounding <Text variant>.
const EYEBROW_STYLE: CSSProperties = {
  color: 'var(--semantic-color-content-secondary)',
  margin: 0,
};

const TITLE_OVERRIDE: CSSProperties = { color: 'var(--semantic-color-content-primary)', margin: 0 };
const DESC_OVERRIDE: CSSProperties = {
  color: 'var(--semantic-color-content-secondary)',
  margin: 0,
  maxWidth: hds.layout.proseMaxWidth,
};

const SIZE_MAP: Record<
  TextLockupSize,
  {
    title: CSSProperties;
    description: CSSProperties;
    titleTag: TextLockupTitleTag;
    titleVariant: 'display' | 'heading1' | 'heading2' | 'body';
    descriptionVariant: 'body' | 'ui' | 'technical';
    gap: string;
  }
> = {
  hero: {
    title: TITLE_OVERRIDE,
    description: DESC_OVERRIDE,
    titleTag: 'h1',
    titleVariant: 'heading1',
    descriptionVariant: 'body',
    gap: hds.semantic.space.component.gap,
  },
  heroXl: {
    title: TITLE_OVERRIDE,
    description: DESC_OVERRIDE,
    titleTag: 'h1',
    titleVariant: 'display',
    descriptionVariant: 'body',
    gap: hds.semantic.space.component.gap,
  },
  section: {
    title: TITLE_OVERRIDE,
    description: DESC_OVERRIDE,
    titleTag: 'h2',
    titleVariant: 'heading2',
    descriptionVariant: 'ui',
    gap: hds.semantic.space.component.gap,
  },
  metric: {
    title: TITLE_OVERRIDE,
    description: DESC_OVERRIDE,
    titleTag: 'h2',
    titleVariant: 'heading1',
    descriptionVariant: 'ui',
    gap: hds.semantic.space.subgrid.gap,
  },
  detail: {
    // Deliberate deviation from the variant: `body`/`technical` variants but
    // ui/mono metrics for the dense data-readout layout (lh:1 overrides mono).
    title: {
      fontSize: 'var(--semantic-typography-ui-font-size)',
      fontWeight: 'var(--semantic-typography-ui-font-weight)',
      color: 'var(--semantic-color-content-primary)',
      margin: 0,
      lineHeight: 'var(--semantic-typography-ui-line-height)',
    },
    description: {
      fontSize: 'var(--semantic-typography-mono-font-size)',
      fontWeight: 'var(--semantic-typography-mono-font-weight)',
      fontFamily: 'monospace',
      color: 'var(--semantic-color-content-secondary)',
      margin: 0,
      lineHeight: 1.0,
    },
    titleTag: 'p',
    titleVariant: 'body',
    descriptionVariant: 'technical',
    gap: hds.semantic.space.subgrid.gap,
  },
  numbered: {
    title: TITLE_OVERRIDE,
    description: DESC_OVERRIDE,
    titleTag: 'h2',
    titleVariant: 'heading2',
    descriptionVariant: 'ui',
    gap: hds.semantic.space.subgrid.gap,
  },
};

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
    <RootTag
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: config.gap,
        alignItems: centered ? 'center' : undefined,
        minWidth: 0,
        textAlign: centered ? 'center' : 'left',
        width: '100%',
      }}
    >
      {eyebrow ? (
        <Text
          variant="ui"
          as="p"
          style={{ ...EYEBROW_STYLE, maxWidth: centered ? 640 : undefined }}
        >
          {eyebrow}
        </Text>
      ) : null}

      {showAnchor ? (
        <div className="hds-doc-section-header" style={{ display: 'flex' }}>
          <Text variant={config.titleVariant} as={TitleTag}>
            <button
              type="button"
              onClick={copyLink}
              className="hds-focus"
              aria-label={`Copy link to ${title}`}
              style={textLockupStyles.anchorCopyBtn}
            >
              <span style={config.title}>{title}</span>
              <span
                aria-hidden="true"
                data-copied={copied ? 'true' : undefined}
                className="hds-doc-section-copy-icon"
                style={{
                  color: 'var(--semantic-color-content-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
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
        <Text variant={config.titleVariant} as={TitleTag} style={config.title}>
          {title}
        </Text>
      )}

      {description ? (
        <Text
          variant={config.descriptionVariant}
          as={DescriptionTag}
          style={{
            ...config.description,
            maxWidth: centered ? 640 : config.description.maxWidth,
          }}
        >
          {description}
        </Text>
      ) : null}
    </RootTag>
  );
});
