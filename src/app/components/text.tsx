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
      error: 'text-[var(--semantic-color-feedback-error)]',
      info: 'text-[var(--semantic-color-feedback-info)]',
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
  | 'error'
  | 'info';

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

/** @public */
export type TextProps = {
  children: ReactNode;
  variant: TextVariant;
  /**
   * Text colour from the semantic content tokens. Omit it to inherit the
   * parent's colour. `secondary` is the subtitle / meta treatment;
   * `disabled` is only for the text of an inactive control.
   */
  tone?: TextTone;
  as?: TextTag | ElementType;
  className?: string;
  style?: CSSProperties;
} & HTMLAttributes<HTMLElement>;

// ── Component ──────────────────────────────────────────────────────────────────

export const Text = /* @__PURE__ */ forwardRef<HTMLElement, TextProps>(function Text(
  { children, variant, tone, as: Tag = defaultTagMap[variant], className, style, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn(textVariants({ variant, tone }), className)}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
});
