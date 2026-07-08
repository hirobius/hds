/**
 * DocLinkCard - navigation card for editorial and documentation cross-links.
 * @category Navigation
 * @tier primitive
 */
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { useHdsRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';
import hds from '../design-system/tokens';
import { Icon } from './icon';

const bodyTextStyle = hds.typeStyles.ui;

interface DocLinkCardProps {
  /** Primary title displayed in the card. */
  title: string;
  /** Supporting body copy shown below the title. */
  description?: string;
  /** Destination route or URL. */
  href: string;
  /** Icon rendered in the card header. */
  icon: LucideIcon;
  /** Optional metadata label rendered above the title. */
  meta?: string;
  /** Typography style used for the meta label. */
  metaStyle?: 'caption' | 'ui';
  /** Tint the card surface for emphasis. */
  accent?: boolean;
  /** Card layout variant. */
  variant?: 'feature' | 'pager';
  /** Disable navigation and reduce contrast. */
  disabled?: boolean;
  /** Directional affordance for the header icon. */
  affordance?: 'up-right' | 'right' | 'left';
}

// ── Variants ───────────────────────────────────────────────────────────────────
// `variant` is the structural axis (feature | pager). Both currently resolve
// to the same root chrome — the actual structural divergence lives in the
// conditionally-rendered JSX below (feature: header row + title + description;
// pager: absolutely-positioned icon + trailing title). Formalized as cva per
// the variant contract (docs/architecture/variant-contract.md) so the axis is
// discoverable/typed and future per-variant root styling has a home.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven padding; var()-based, no Tailwind-theme utility exists
const docLinkCardVariants = cva(
  'hds-focus hds-doc-link-card relative flex w-full h-full flex-col cursor-pointer p-[var(--semantic-space-layout-gap)] disabled:cursor-default',
  {
    variants: {
      variant: {
        feature: '',
        pager: '',
      },
    },
    defaultVariants: { variant: 'feature' },
  },
);

/** @public */
export function DocLinkCard({
  title,
  description,
  href,
  icon: CardIcon,
  meta,
  metaStyle = 'caption',
  accent = false,
  variant = 'feature',
  disabled = false,
  affordance = 'up-right',
}: DocLinkCardProps) {
  const { navigate } = useHdsRouter();
  const { isRtl } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPager = variant === 'pager';
  const HeaderIcon =
    variant === 'pager' ? (affordance === 'up-right' ? ArrowUpRight : ArrowRight) : CardIcon;
  const isInteractive = hovered || focused;
  const affordanceRotation =
    affordance === 'left' ? (isRtl ? 0 : 180) : affordance === 'right' ? (isRtl ? 180 : 0) : 0;
  const headerIconControls = useAnimationControls();
  const pagerIconControls = useAnimationControls();
  const metaTextStyle = metaStyle === 'ui' ? hds.typeStyles.ui : hds.typeStyles.caption;
  const isLeftAffordance = affordance === 'left';
  // Pager icon/title share one physical-side decision: the icon sits on the
  // "left" (and title mirrors that as its text alignment) whenever the
  // logical-left affordance and the current direction don't cancel out.
  // Equivalent to the original nested left/right + textAlign ternaries.
  const pagerLeftAligned = isLeftAffordance ? !isRtl : isRtl;

  useEffect(() => {
    const transition = {
      duration: hds.motion.productive.duration,
      ease: hds.motion.productive.easing,
    };

    if (variant === 'pager') {
      void pagerIconControls.start(
        isInteractive ? { x: affordance === 'left' ? -4 : 4 } : { x: 0 },
        transition,
      );
      return;
    }

    void headerIconControls.start(isInteractive ? { y: -3 } : { y: 0 }, transition);
  }, [affordance, headerIconControls, isInteractive, pagerIconControls, variant]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(docLinkCardVariants({ variant }), isRtl ? 'text-right' : 'text-left')}
      data-accent={accent ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      data-variant={variant}
    >
      {isPager ? (
        <>
          <motion.span
            className={cn(
              'absolute top-[var(--semantic-space-layout-gap)]',
              pagerLeftAligned
                ? 'left-[var(--semantic-space-layout-gap)]'
                : 'right-[var(--semantic-space-layout-gap)]',
            )}
            animate={pagerIconControls}
          >
            <Icon
              icon={HeaderIcon}
              size="small"
              color="var(--semantic-color-content-accent)"
              style={
                affordanceRotation ? { transform: `rotate(${affordanceRotation}deg)` } : undefined
              }
            />
          </motion.span>
          <div
            className={cn(
              'flex flex-1 min-w-0 flex-col justify-end pt-[var(--semantic-space-layout-gap)]',
              pagerLeftAligned ? 'text-left' : 'text-right',
            )}
          >
            <p
              className={cn('m-0 text-primary', pagerLeftAligned ? 'text-left' : 'text-right')}
              style={hds.typeStyles.heading3}
            >
              {title}
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 min-w-0 flex-col justify-start">
          <div
            className={cn(
              'flex items-center justify-between gap-[var(--semantic-space-component-gap)]',
              isRtl ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            {meta ? (
              <p className="m-0 text-secondary" style={metaTextStyle}>
                {meta}
              </p>
            ) : (
              <span />
            )}
            <motion.span animate={headerIconControls}>
              <Icon
                icon={HeaderIcon}
                size="small"
                color="var(--semantic-color-content-accent)"
                style={
                  affordanceRotation ? { transform: `rotate(${affordanceRotation}deg)` } : undefined
                }
              />
            </motion.span>
          </div>
          <div
            // eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists
            className="flex flex-col gap-[var(--semantic-space-subgrid-gap)]"
          >
            <p
              className={cn(
                'mt-[var(--semantic-space-component-gap)] text-primary',
                description ? 'mb-[var(--semantic-space-subgrid-gap)]' : 'mb-0',
              )}
              style={hds.typeStyles.heading3}
            >
              {title}
            </p>
            {description ? (
              <p
                className="m-0 text-secondary"
                style={{ ...bodyTextStyle, maxWidth: variant === 'feature' ? 500 : undefined }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </button>
  );
}

/** @internal — CVA variant helper; compose via DocLinkCard props instead. */
export { docLinkCardVariants };
