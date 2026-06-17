/**
 * DocLinkCard - navigation card for editorial and documentation cross-links.
 * @category Navigation
 * @tier primitive
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
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

const VARIANT_STYLES = {
  feature: {
    padding: hds.semantic.space.layout.gap,
    gap: hds.semantic.space.component.gap,
    titleStyle: { ...hds.typeStyles.heading3, color: 'var(--semantic-color-content-primary)' },
    titleMargin: hds.semantic.space.component.gap,
    iconGap: hds.semantic.space.subgrid.gap,
  },
  pager: {
    padding: hds.semantic.space.layout.gap,
    gap: hds.semantic.space.component.gap,
    titleStyle: { ...hds.typeStyles.heading3, color: 'var(--semantic-color-content-primary)' },
    titleMargin: hds.semantic.space.component.gap,
    iconGap: hds.semantic.space.subgrid.gap,
  },
} as const;

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
  const navigate = useNavigate();
  const { isRtl } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const config = VARIANT_STYLES[variant];
  const HeaderIcon = variant === 'pager'
    ? (affordance === 'up-right' ? ArrowUpRight : ArrowRight)
    : CardIcon;
  const isInteractive = hovered || focused;
  const affordanceRotation = affordance === 'left' ? (isRtl ? 0 : 180) : affordance === 'right' ? (isRtl ? 180 : 0) : 0;
  const headerIconControls = useAnimationControls();
  const pagerIconControls = useAnimationControls();
  const metaTextStyle =
    metaStyle === 'ui'
      ? hds.typeStyles.ui
      : hds.typeStyles.caption;

  useEffect(() => {
    const transition = { duration: hds.motion.productive.duration, ease: hds.motion.productive.easing };

    if (variant === 'pager') {
      void pagerIconControls.start(
        isInteractive
          ? { x: affordance === 'left' ? -4 : 4 }
          : { x: 0 },
        transition,
      );
      return;
    }

    void headerIconControls.start(
      isInteractive
        ? { y: -3 }
        : { y: 0 },
      transition,
    );
  }, [affordance, headerIconControls, isInteractive, pagerIconControls, variant]);

  const headerRowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isRtl ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: config.gap,
  };
  const isPager = variant === 'pager';
  const featureShellStyle: CSSProperties = isPager
    ? {}
    : {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        justifyContent: 'flex-start',
      };
  const featureBodyStyle: CSSProperties = isPager
    ? {}
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: hds.semantic.space.subgrid.gap,
      };
  const isLeftAffordance = affordance === 'left';
  const pagerTextAlign: CSSProperties['textAlign'] = isPager
    ? (isLeftAffordance ? (isRtl ? 'right' : 'left') : (isRtl ? 'left' : 'right'))
    : undefined;
  const pagerContentStyle: CSSProperties = isPager
    ? {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      textAlign: pagerTextAlign,
      flex: 1,
      minWidth: 0,
      paddingTop: hds.semantic.space.layout.gap,
    }
    : {};
  const pagerIconWrapStyle: CSSProperties = isPager
    ? {
        position: 'absolute',
        top: config.padding,
        left: isLeftAffordance ? (isRtl ? undefined : config.padding) : (isRtl ? config.padding : undefined),
        right: isLeftAffordance ? (isRtl ? config.padding : undefined) : (isRtl ? undefined : config.padding),
      }
    : {};

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate(href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="hds-focus hds-doc-link-card"
      data-accent={accent ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      style={{
        width: '100%',
        height: '100%',
        textAlign: isRtl ? 'right' : 'left',
        paddingTop: config.padding,
        paddingBottom: config.padding,
        paddingLeft: config.padding,
        paddingRight: config.padding,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'relative',
      }}
    >
      {isPager ? (
        <>
          <motion.span
            style={pagerIconWrapStyle}
            animate={pagerIconControls}
          >
            <Icon
              icon={HeaderIcon}
              size="small"
              color="var(--semantic-color-content-accent)"
              style={affordanceRotation ? { transform: `rotate(${affordanceRotation}deg)` } : undefined}
            />
          </motion.span>
          <div style={pagerContentStyle}>
            <p
              style={{
                ...config.titleStyle,
                marginTop: 0,
                marginBottom: 0,
                textAlign: pagerTextAlign,
              }}
            >
              {title}
            </p>
          </div>
        </>
      ) : (
        <div style={featureShellStyle}>
          <div style={headerRowStyle}>
            {meta ? (
              <p
                style={{
                  ...metaTextStyle,
                  margin: 0,
                  color: 'var(--semantic-color-content-secondary)',
                }}
              >
                {meta}
              </p>
            ) : <span />}
            <motion.span
              animate={headerIconControls}
            >
              <Icon
                icon={HeaderIcon}
                size="small"
                color="var(--semantic-color-content-accent)"
                style={affordanceRotation ? { transform: `rotate(${affordanceRotation}deg)` } : undefined}
              />
            </motion.span>
          </div>
          <div style={featureBodyStyle}>
            <p
              style={{
                ...config.titleStyle,
                marginTop: config.titleMargin,
                marginBottom: description ? hds.semantic.space.subgrid.gap : 0,
              }}
            >
              {title}
            </p>
            {description ? (
              <p style={{ ...bodyTextStyle, margin: 0, maxWidth: variant === 'feature' ? 500 : undefined, color: 'var(--semantic-color-content-secondary)' }}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </button>
  );
}
