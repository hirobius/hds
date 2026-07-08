/**
 * Text — polymorphic typography primitive spanning the full HDS type ramp.
 *
 * @category Typography
 * @tier primitive
 * @doc-exempt: typography primitive is documented through the Typography ramp page (TypographyPage), not as a standalone component card
 */
import {
  forwardRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

// 10t-5: variant API kept stable for backward compatibility. The 9-style
// product ramp (display/heading1/heading2/heading3/body/ui/caption/technical/
// badge) and the 4 doc variants (docLede/docBody/docSmall/docCode) all map
// onto the unified 8-style Swiss-canon composite ramp:
//   display, h1, h2, h3, body, small(ui), caption, mono.
//
// Each variant resolves font-family/size/weight/letter-spacing/line-height
// (+ max-width for body/ui/mono, + text-transform for eyebrow/badge) from the
// same --semantic-typography-* composite tokens the old CSSProperties map
// (variantStyleMap → hds.typeStyles.*) read. No Tailwind-theme utility exists
// for these composite vars yet, so they're arbitrary-value classes bound to
// CSS custom properties — same pattern as inline-code.tsx's mono composite.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic typography composite tokens (font-family/size/weight/letter-spacing/line-height/max-width/text-transform) have no Tailwind-theme utility; var()-based so still token-driven
const textVariants = cva('m-0 min-w-0', {
  variants: {
    variant: {
      display:
        '[font-family:var(--semantic-typography-display-font-family)] [font-size:var(--semantic-typography-display-font-size)] [font-weight:var(--semantic-typography-display-font-weight)] [letter-spacing:var(--semantic-typography-display-letter-spacing)] [line-height:var(--semantic-typography-display-line-height)]',
      heading1:
        '[font-family:var(--semantic-typography-h1-font-family)] [font-size:var(--semantic-typography-h1-font-size)] [font-weight:var(--semantic-typography-h1-font-weight)] [letter-spacing:var(--semantic-typography-h1-letter-spacing)] [line-height:var(--semantic-typography-h1-line-height)]',
      heading2:
        '[font-family:var(--semantic-typography-h2-font-family)] [font-size:var(--semantic-typography-h2-font-size)] [font-weight:var(--semantic-typography-h2-font-weight)] [letter-spacing:var(--semantic-typography-h2-letter-spacing)] [line-height:var(--semantic-typography-h2-line-height)]',
      heading3:
        '[font-family:var(--semantic-typography-h3-font-family)] [font-size:var(--semantic-typography-h3-font-size)] [font-weight:var(--semantic-typography-h3-font-weight)] [letter-spacing:var(--semantic-typography-h3-letter-spacing)] [line-height:var(--semantic-typography-h3-line-height)]',
      body: 'max-w-[var(--semantic-typography-body-max-width)] [font-family:var(--semantic-typography-body-font-family)] [font-size:var(--semantic-typography-body-font-size)] [font-weight:var(--semantic-typography-body-font-weight)] [letter-spacing:var(--semantic-typography-body-letter-spacing)] [line-height:var(--semantic-typography-body-line-height)]',
      ui: 'max-w-[var(--semantic-typography-ui-max-width)] [font-family:var(--semantic-typography-ui-font-family)] [font-size:var(--semantic-typography-ui-font-size)] [font-weight:var(--semantic-typography-ui-font-weight)] [letter-spacing:var(--semantic-typography-ui-letter-spacing)] [line-height:var(--semantic-typography-ui-line-height)]',
      eyebrow:
        '[font-family:var(--semantic-typography-eyebrow-font-family)] [font-size:var(--semantic-typography-eyebrow-font-size)] [font-weight:var(--semantic-typography-eyebrow-font-weight)] [letter-spacing:var(--semantic-typography-eyebrow-letter-spacing)] [line-height:var(--semantic-typography-eyebrow-line-height)] [text-transform:var(--semantic-typography-eyebrow-text-transform)]',
      caption:
        '[font-family:var(--semantic-typography-caption-font-family)] [font-size:var(--semantic-typography-caption-font-size)] [font-weight:var(--semantic-typography-caption-font-weight)] [letter-spacing:var(--semantic-typography-caption-letter-spacing)] [line-height:var(--semantic-typography-caption-line-height)]',
      technical:
        'max-w-[var(--semantic-typography-mono-max-width)] [font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)] [line-height:var(--semantic-typography-mono-line-height)]',
      badge:
        '[font-family:var(--semantic-typography-eyebrow-font-family)] [font-size:var(--semantic-typography-eyebrow-font-size)] [font-weight:var(--semantic-typography-eyebrow-font-weight)] [letter-spacing:var(--semantic-typography-eyebrow-letter-spacing)] [line-height:var(--semantic-typography-eyebrow-line-height)] [text-transform:var(--semantic-typography-eyebrow-text-transform)]',
      // Doc-site variants — preserved as a public API surface, now backed by
      // the same body/ui/mono composites so doc pages and product UI share
      // the same 8-style Swiss-canon ramp.
      docLede:
        'max-w-[var(--semantic-typography-body-max-width)] [font-family:var(--semantic-typography-body-font-family)] [font-size:var(--semantic-typography-body-font-size)] [font-weight:var(--semantic-typography-body-font-weight)] [letter-spacing:var(--semantic-typography-body-letter-spacing)] [line-height:var(--semantic-typography-body-line-height)]',
      docBody:
        'max-w-[var(--semantic-typography-body-max-width)] [font-family:var(--semantic-typography-body-font-family)] [font-size:var(--semantic-typography-body-font-size)] [font-weight:var(--semantic-typography-body-font-weight)] [letter-spacing:var(--semantic-typography-body-letter-spacing)] [line-height:var(--semantic-typography-body-line-height)]',
      docSmall:
        'max-w-[var(--semantic-typography-ui-max-width)] [font-family:var(--semantic-typography-ui-font-family)] [font-size:var(--semantic-typography-ui-font-size)] [font-weight:var(--semantic-typography-ui-font-weight)] [letter-spacing:var(--semantic-typography-ui-letter-spacing)] [line-height:var(--semantic-typography-ui-line-height)]',
      docCode:
        'max-w-[var(--semantic-typography-mono-max-width)] [font-family:var(--semantic-typography-mono-font-family)] [font-size:var(--semantic-typography-mono-font-size)] [font-weight:var(--semantic-typography-mono-font-weight)] [letter-spacing:var(--semantic-typography-mono-letter-spacing)] [line-height:var(--semantic-typography-mono-line-height)]',
    },
  },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps['variant']>;

type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

const defaultTagMap: Record<TextVariant, TextTag> = {
  display: 'h1',
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  body: 'p',
  ui: 'p',
  eyebrow: 'p',
  caption: 'p',
  technical: 'p',
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

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { children, variant, as: Tag = defaultTagMap[variant], className, style, ...rest },
  ref,
) {
  return (
    <Tag ref={ref} className={cn(textVariants({ variant }), className)} style={style} {...rest}>
      {children}
    </Tag>
  );
});

/** @internal — CVA variant helper; compose via Text props instead. */
export { textVariants };
