/**
 * Text — polymorphic typography primitive spanning the full HDS type ramp.
 *
 * @category Typography
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2022-31
 * @usage Set any text on the type ramp, with the element chosen by `as`.
 * @whenNot Navigation links, or a keyboard hint.
 * @useInstead InlineLink a link inside body copy
 * @useInstead Kbd a keyboard key hint
 * @doc-exempt: typography primitive is documented through the Typography ramp page (TypographyPage), not as a standalone component card
 */
import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

// hds#483: the type ramp is 5 roles plus title-sm and mono — display, title,
// titleSm, body, ui, caption, mono. Each role is one `.hds-type-<role>` class (theme.css), which
// reads that role's --semantic-typography-<role>-* composite vars, so the
// component carries no size, weight or leading of its own. body, ui and mono
// also cap the measure at 60ch.
//
// The pre-cut variant names (heading1/2/3, technical, eyebrow, badge and the
// four doc variants) stay accepted as deprecated aliases and render as the role they point at.
//. They go in 1.0.0.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- the 60ch measure token has no Tailwind-theme utility; var()-based so still token-driven
const textVariants = /* @__PURE__ */ cva('m-0 min-w-0', {
  variants: {
    variant: {
      display: 'hds-type-display',
      title: 'hds-type-title',
      titleSm: 'hds-type-title-sm',
      body: 'hds-type-body max-w-[var(--semantic-typography-body-max-width)]',
      ui: 'hds-type-ui max-w-[var(--semantic-typography-ui-max-width)]',
      caption: 'hds-type-caption',
      mono: 'hds-type-mono max-w-[var(--semantic-typography-mono-max-width)]',
      // Deprecated aliases, each the class string of the role it points at.
      heading1: 'hds-type-title',
      heading2: 'hds-type-title',
      heading3: 'hds-type-title',
      technical: 'hds-type-mono max-w-[var(--semantic-typography-mono-max-width)]',
      eyebrow: 'hds-type-caption',
      badge: 'hds-type-caption',
      docLede: 'hds-type-body max-w-[var(--semantic-typography-body-max-width)]',
      docBody: 'hds-type-body max-w-[var(--semantic-typography-body-max-width)]',
      docSmall: 'hds-type-ui max-w-[var(--semantic-typography-ui-max-width)]',
      docCode: 'hds-type-mono max-w-[var(--semantic-typography-mono-max-width)]',
    },
    // hds#655: one semantic content colour per tone, the same vocabulary as
    // Badge and Alert. No tone keeps the inherited colour, so it is additive.
    // `disabled` reads content.disabled, which sits below 4.5:1 by design: it
    // is for the text of an inactive control (WCAG 1.4.3 exempts it), never
    // for faint helper copy (that third text level is hds#663).
    tone: {
      primary: 'text-[var(--semantic-color-content-primary)]',
      secondary: 'text-[var(--semantic-color-content-secondary)]',
      disabled: 'text-[var(--semantic-color-content-disabled)]',
      accent: 'text-[var(--semantic-accent-content)]',
      success: 'text-[var(--semantic-color-feedback-success)]',
      warning: 'text-[var(--semantic-color-feedback-warning)]',
      danger: 'text-[var(--semantic-color-feedback-error)]',
      info: 'text-[var(--semantic-color-feedback-info)]',
    },
    // hds#825: one step off the role's weight (a name or a section head in
    // body copy) from the shipped weight tokens. No weight keeps the role's own.
    // These utilities sit in the utilities layer, so they beat .hds-type-*.
    weight: {
      // tier-ok: shipped weight steps (hds#825)
      regular: '[font-weight:var(--primitive-typography-weight-regular)]',
      // tier-ok: shipped weight steps (hds#825)
      medium: '[font-weight:var(--primitive-typography-weight-medium)]',
      // tier-ok: shipped weight steps, no semantic weight tokens exist (hds#825)
      bold: '[font-weight:var(--primitive-typography-weight-bold)]',
    },
    // hds#916: one line with an ellipsis. `block` lets the ellipsis apply to a
    // span (mono's default tag); the base `min-w-0` lets it shrink in a flex row.
    truncate: {
      true: 'block truncate',
    },
    // hds#916: N lines with an ellipsis. Lines break between words; a run too
    // long for one line (a URL, a query) breaks inside itself only then.
    // `anywhere`, not `break-word`: it also drops the min-content width, so a
    // long run cannot widen the flex or grid track the text sits in.
    lineClamp: {
      2: 'line-clamp-2 wrap-anywhere',
      3: 'line-clamp-3 wrap-anywhere',
      4: 'line-clamp-4 wrap-anywhere',
    },
  },
});

// ── Types ──────────────────────────────────────────────────────────────────────

/** The seven roles of the type ramp, plus the deprecated names that still resolve. */
export type TextVariant =
  | 'display'
  | 'title'
  | 'titleSm'
  | 'body'
  | 'ui'
  | 'caption'
  | 'mono'
  /**
   * @deprecated hds#483 — use `title`.
   * @removeIn 1.0.0
   */
  | 'heading1'
  /**
   * @deprecated hds#483 — use `title`.
   * @removeIn 1.0.0
   */
  | 'heading2'
  /**
   * @deprecated hds#483 — use `title`.
   * @removeIn 1.0.0
   */
  | 'heading3'
  /**
   * @deprecated hds#483 — use `mono`.
   * @removeIn 1.0.0
   */
  | 'technical'
  /**
   * @deprecated hds#483 — use `caption`.
   * @removeIn 1.0.0
   */
  | 'eyebrow'
  /**
   * @deprecated hds#483 — use `caption`.
   * @removeIn 1.0.0
   */
  | 'badge'
  /**
   * @deprecated hds#483 — use `body`.
   * @removeIn 1.0.0
   */
  | 'docLede'
  /**
   * @deprecated hds#483 — use `body`.
   * @removeIn 1.0.0
   */
  | 'docBody'
  /**
   * @deprecated hds#483 — use `ui`.
   * @removeIn 1.0.0
   */
  | 'docSmall'
  /**
   * @deprecated hds#483 — use `mono`.
   * @removeIn 1.0.0
   */
  | 'docCode';

/** The colour of the text: a semantic content token. Unset, it inherits. */
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/** A weight from the shipped weight tokens. Unset, the role's weight applies. */
export type TextWeight = 'regular' | 'medium' | 'bold';

type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

const defaultTagMap: Record<TextVariant, TextTag> = {
  display: 'h1',
  title: 'h2',
  titleSm: 'h3',
  body: 'p',
  ui: 'p',
  caption: 'p',
  mono: 'span',
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  technical: 'p',
  eyebrow: 'p',
  badge: 'p',
  docLede: 'p',
  docBody: 'p',
  docSmall: 'p',
  docCode: 'span',
};

/** How many lines `lineClamp` keeps before the ellipsis. */
export type TextLineClamp = 2 | 3 | 4;

/** `truncate` and `lineClamp` cut overflow two ways; a Text takes one or neither. */
type TextOverflowProps =
  | {
      /**
       * Cut the text to one line with an ellipsis. The element can shrink below
       * its content in a flex or grid row, so a long name gives way to its
       * neighbours instead of pushing them out. A span is made a block for it.
       * Its parent has to be able to shrink too (`min-width: 0` on a flex or grid
       * item, `minmax(0, 1fr)` on a grid track), or the row grows to the full line.
       * Not with `lineClamp`.
       */
      truncate?: boolean;
      lineClamp?: never;
    }
  | {
      truncate?: false;
      /**
       * Cut the text to 2, 3 or 4 lines with an ellipsis on the last. Lines
       * break between words, `mono` included; a single run too long for a line
       * breaks inside itself only then. In a container sized to its content
       * (a `fit-content` box, an `auto` grid track) the clamp can get narrow: give
       * it a width, or `min-width: 0` / `minmax(0, 1fr)` on the parent. Not with
       * `truncate`.
       */
      lineClamp?: TextLineClamp;
    };

/** @public */
export type TextProps = TextOverflowProps & {
  children: ReactNode;
  variant: TextVariant;
  /**
   * Text colour from the semantic content tokens. Omit it to inherit the
   * parent's colour. `secondary` is the subtitle / meta treatment;
   * `disabled` is only for the text of an inactive control.
   */
  tone?: TextTone;
  /**
   * Font weight from the weight tokens. Omit it to keep the role's weight;
   * set it for the one word or line that needs a step up, such as a name.
   */
  weight?: TextWeight;
  as?: TextTag | ElementType;
  className?: string;
  style?: CSSProperties;
} & HTMLAttributes<HTMLElement>;

// ── Component ──────────────────────────────────────────────────────────────────

export const Text = /* @__PURE__ */ forwardRef<HTMLElement, TextProps>(function Text(
  {
    children,
    variant,
    tone,
    weight,
    truncate,
    lineClamp,
    as: Tag = defaultTagMap[variant],
    className,
    style,
    ...rest
  },
  ref,
) {
  // The types allow one of the two; a caller that passes both gets the one line.
  const clamp = truncate ? undefined : lineClamp;
  return (
    <Tag
      ref={ref}
      className={cn(
        textVariants({ variant, tone, weight, truncate: truncate || undefined, lineClamp: clamp }),
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
});
