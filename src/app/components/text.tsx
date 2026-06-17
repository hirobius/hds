/**
 * Text — polymorphic typography primitive spanning the full HDS type ramp.
 *
 * @category Typography
 * @tier primitive
 * @doc-exempt: typography primitive is documented through the Typography ramp page (TypographyPage), not as a standalone component card
 */
import { forwardRef, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import hds from '../design-system/tokens';

// 10t-5: variant API kept stable for backward compatibility. The 9-style
// product ramp (display/heading1/heading2/heading3/body/ui/caption/technical/
// badge) and the 4 doc variants (docLede/docBody/docSmall/docCode) all map
// onto the unified 8-style Swiss-canon composite ramp:
//   display, h1, h2, h3, body, small, caption, mono.
type TextVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'body'
  | 'ui'
  | 'eyebrow'
  | 'caption'
  | 'technical'
  | 'badge'
  // Doc-site variants — preserved as a public API surface, now backed by
  // semantic.typography.{body,small,mono} so doc pages and product UI share
  // the same 8-style Swiss-canon ramp.
  | 'docLede'
  | 'docBody'
  | 'docSmall'
  | 'docCode';

type TextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';

const variantStyleMap: Record<TextVariant, CSSProperties> = {
  display: hds.typeStyles.display,
  heading1: hds.typeStyles.heading1,
  heading2: hds.typeStyles.heading2,
  heading3: hds.typeStyles.heading3,
  body: hds.typeStyles.body,
  ui: hds.typeStyles.ui,
  eyebrow: hds.typeStyles.eyebrow,
  caption: hds.typeStyles.caption,
  technical: hds.typeStyles.technical,
  badge: hds.typeStyles.badge,
  // Doc variants → unified Swiss-canon composites (10t-5).
  docLede: hds.typeStyles.body,
  docBody: hds.typeStyles.body,
  docSmall: hds.typeStyles.small,
  docCode: hds.typeStyles.mono,
};

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

export const Text = forwardRef<HTMLElement, TextProps>(
  function Text({ children, variant, as: Tag = defaultTagMap[variant], className, style, ...rest }, ref) {
    return (
      <Tag
        ref={ref}
        className={className}
        {...rest}
        style={{
          ...variantStyleMap[variant],
          margin: 0,
          minWidth: 0,
          ...style,
        }}
      >
        {children}
      </Tag>
    );
  },
);
