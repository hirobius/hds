/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: shell-only controls used by the app chrome, not consumer-facing HDS components.
/**
 * ShellControls - shell-only navigation controls documented as maintenance utilities.
 * @category Utilities
 */
import React, { useState, useEffect, useRef } from 'react';
import { Languages, Menu, X, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useHdsRouter } from '../context/RouterContext';
import { useLanguage } from '../context/LanguageContext';
import hds from '../design-system/tokens';
import { Grid } from './grid';
import { IconButton } from './icon-button';
import { Icon } from './icon';
import { Stack } from './stack';
import { Surface } from './surface';

const shellControlsStyles = {
  infoNavBtn: {
    ...hds.typeStyles.ui,
    display: 'inline-flex',
    alignItems: 'center',
    gap: hds.semantic.space.subgrid.gap,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  } satisfies React.CSSProperties,
} as const;

// motion-ok: utility buttons use shared .hds-sidebar-utility-button transitions from theme.css
// motion-ok: HdsMobileTopBar uses CSS transform transition for scroll-aware hide/show

export function HdsSidebarUtilityButton({
  onClick,
  icon,
  label,
  variant = 'tertiary',
  size = 'sm',
  interactive = true,
}: {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  variant?: 'tertiary' | 'secondary';
  size?: 'sm' | 'md';
  interactive?: boolean;
}) {
  const IconComponent = icon;
  const buttonSize = size === 'sm' ? 32 : 40;
  const surfaceStyle: React.CSSProperties = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: hds.borderRadius.action,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background:
      variant === 'secondary'
        ? 'var(--semantic-color-surface-overlay)'
        : 'var(--semantic-color-surface-page)',
    border:
      variant === 'secondary'
        ? `${hds.borderWidth.default} solid var(--semantic-color-border-default)`
        : 'none',
  };

  const content = (
    <Stack
      as="span"
      direction="row"
      gap="hairline"
      align="center"
      justify="center"
      style={{ width: '100%', height: '100%' }}
    >
      <Icon icon={IconComponent} size={size === 'sm' ? 'small' : 'medium'} color="currentColor" />
    </Stack>
  );

  if (!interactive) {
    return (
      <Surface
        as="span"
        padding="none"
        aria-hidden="true"
        style={{
          ...surfaceStyle,
          cursor: 'default',
          pointerEvents: 'none',
        }}
      >
        {content}
      </Surface>
    );
  }

  return (
    <IconButton
      icon={IconComponent}
      size={size}
      variant={variant}
      onClick={onClick}
      className="hds-focus hds-sidebar-utility-button"
      aria-label={label}
      label={label}
    />
  );
}

export function HdsMobileTopBar({
  onToggleSidebar,
  onToggleTheme,
  sidebarOpen,
  isDark,
  mobileTopbarHeight,
  directionToggleEnabled,
  shellCopy,
  previewMode = false,
}: {
  onToggleSidebar: () => void;
  onToggleTheme?: () => void;
  sidebarOpen: boolean;
  isDark?: boolean;
  mobileTopbarHeight: number;
  directionToggleEnabled: boolean;
  shellCopy: {
    layoutDirection: string;
    openNavigation: string;
    closeNavigation: string;
  };
  previewMode?: boolean;
}) {
  const { isRtl, toggleDirection } = useLanguage();
  const copy = shellCopy;
  const { navigate } = useHdsRouter();

  // -- Scroll-aware show/hide --
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const sidebarOpenRef = useRef(sidebarOpen);

  // Keep ref in sync so the scroll handler always reads current value
  useEffect(() => {
    if (previewMode) return;
    sidebarOpenRef.current = sidebarOpen;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sidebarOpen) setVisible(true);
  }, [sidebarOpen, previewMode]);

  useEffect(() => {
    if (previewMode) return;
    const handleScroll = () => {
      if (sidebarOpenRef.current) return; // locked while drawer is open
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      if (diff > 8)
        setVisible(false); // scrolling down
      else if (diff < -4) setVisible(true); // scrolling up
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [previewMode]);

  const shellStyle: React.CSSProperties = previewMode
    ? {
        position: 'relative',
        height: mobileTopbarHeight,
        background: 'var(--semantic-color-surface-page)',
        overflow: 'hidden',
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: mobileTopbarHeight,
        background:
          'color-mix(in srgb, var(--semantic-color-surface-page) 94%, var(--semantic-color-surface-accentSubtle) 6%)',
        border: 'none',
        borderRadius: 0,
        backdropFilter: `blur(${hds.effect.blur.lightboxBackdrop})`,
        WebkitBackdropFilter: `blur(${hds.effect.blur.lightboxBackdrop})`,
        zIndex: hds.zIndex.overlay,
        direction: isRtl ? ('rtl' as const) : ('ltr' as const),
        transform: visible ? 'translateY(0)' : `translateY(-${mobileTopbarHeight}px)`,
        transition: `transform ${hds.motion.spatial.duration}s ${hds.motion.spatial.easing}`,
      };

  return (
    <Surface padding="none" style={shellStyle}>
      <Grid
        columns={2}
        gap="tight"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) auto', // grid-ok: shell title + actions row; minmax(0,1fr) shrinks title column, actions sized to content
          height: '100%',
          alignItems: 'center',
          paddingInlineStart: hds.semantic.space.layout.gutter,
          paddingInlineEnd: hds.semantic.space.component.padding,
        }}
      >
        <Grid.Item>
          {previewMode ? (
            <Surface
              as="span"
              padding="none"
              aria-hidden="true"
              style={{
                background: 'transparent',
                border: 'none',
                width: 'fit-content',
              }}
            >
              <Stack direction="row" gap="xs" align="center">
                <span className="text-primary" style={hds.typeStyles.ui}>
                  Adrian Milsap
                </span>
              </Stack>
            </Surface>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/info')}
              className="hds-focus"
              aria-label="Go to info page"
              style={shellControlsStyles.infoNavBtn}
            >
              <Stack as="span" direction="row" gap="xs" align="center">
                <span className="text-primary" style={hds.typeStyles.ui}>
                  Adrian Milsap
                </span>
              </Stack>
            </button>
          )}
        </Grid.Item>

        <Grid.Item>
          <Stack direction="row" gap="xs" align="center">
            {previewMode ? (
              <>
                {directionToggleEnabled && (
                  <HdsSidebarUtilityButton
                    onClick={toggleDirection}
                    icon={Languages}
                    label={`${copy.layoutDirection}: ${isRtl ? 'RTL' : 'LTR'}`}
                    interactive={false}
                  />
                )}
                <HdsSidebarUtilityButton
                  onClick={onToggleSidebar}
                  icon={Menu}
                  label={copy.openNavigation}
                  interactive={false}
                />
              </>
            ) : (
              <>
                {onToggleTheme && (
                  <IconButton
                    icon={isDark ? Sun : Moon}
                    aria-label="Toggle theme"
                    onClick={onToggleTheme}
                    variant="tertiary"
                    size="sm"
                  />
                )}
                {directionToggleEnabled && (
                  <HdsSidebarUtilityButton
                    onClick={toggleDirection}
                    icon={Languages}
                    label={`${copy.layoutDirection}: ${isRtl ? 'RTL' : 'LTR'}`}
                  />
                )}
                <IconButton
                  icon={sidebarOpen ? X : Menu}
                  aria-label={sidebarOpen ? copy.closeNavigation : copy.openNavigation}
                  onClick={onToggleSidebar}
                  variant="tertiary"
                  size="sm"
                />
              </>
            )}
          </Stack>
        </Grid.Item>
      </Grid>
    </Surface>
  );
}
