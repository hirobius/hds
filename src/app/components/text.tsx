/**
 * Text — polymorphic typography primitive spanning the full HDS type ramp.
 *
 * @category Typography
 * @tier primitive
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

// hds#483: the type ramp is 5 roles plus mono — display, title, body, ui,
// caption, mono. Each role is one `.hds-type-<role>` class (theme.css), which
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
  },
});

// ── Types ──────────────────────────────────────────────────────────────────────

/** The six roles of the type ramp, plus the deprecated names that still resolve. */
export type TextVariant =
  | 'display'
  | 'title'
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

type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

const defaultTagMap: Record<TextVariant, TextTag> = {
  display: 'h1',
  title: 'h2',
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
  as?: TextTag | ElementType;
  className?: string;
  style?: CSSProperties;
} & HTMLAttributes<HTMLElement>;

// ── Component ──────────────────────────────────────────────────────────────────

export const Text = /* @__PURE__ */ forwardRef<HTMLElement, TextProps>(function Text(
  { children, variant, as: Tag = defaultTagMap[variant], className, style, ...rest },
  ref,
) {
  return (
    <Tag ref={ref} className={cn(textVariants({ variant }), className)} style={style} {...rest}>
      {children}
    </Tag>
  );
});
