/**
 * NavGroup - labeled navigation group for stacks of nav items.
 * @category Navigation
 * @tier pattern
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useLocation } from 'react-router';
import hds from '../design-system/tokens';
import { getNavLevelLeadingPadding, getNextNavLevel, type NavLevel } from '../lib/navLevels';
import { Disclosure } from './disclosure';
import { NavItem } from './nav-item';
import { Stack } from './stack';

type NavItem = {
  path: string;
  label: string;
  disabled?: boolean;
};

type NavGroupProps = {
  label?: string;
  variant?: 'side' | 'toc';
  level?: NavLevel;
  items?: NavItem[];
  children?: ReactNode;
  collapsible?: boolean;
  onNavigate?: () => void;
  getExact?: (item: NavItem) => boolean;
  className?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
};

/** @public */
export function NavGroup({
  label,
  variant = 'side',
  level = 'section',
  items,
  children,
  collapsible = false,
  onNavigate,
  getExact,
  className,
  style,
  contentStyle,
}: NavGroupProps) {
  const location = useLocation();
  const resolvedItems = items ?? [];
  const forceCollapsedOnOverview = collapsible && location.pathname === '/';
  const hasActive =
    collapsible &&
    resolvedItems.some((item) =>
      getExact?.(item)
        ? location.pathname === item.path
        : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
  const [open, setOpen] = useState(() => {
    if (!collapsible) return true;
    if (forceCollapsedOnOverview) return false;
    return hasActive;
  });

  useEffect(() => {
    if (!collapsible) return;
    if (forceCollapsedOnOverview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      return;
    }
    if (hasActive) setOpen(true);
  }, [collapsible, forceCollapsedOnOverview, hasActive]);

  const labelStyle: CSSProperties = {
    ...(variant === 'side' ? hds.typeStyles.ui : hds.typeStyles.caption),
    color: 'var(--semantic-color-content-secondary)',
  };
  const staticLabelStyle: CSSProperties = {
    ...labelStyle,
    paddingLeft:
      variant === 'toc' ? hds.semantic.space.sidebar.sectionGap : getNavLevelLeadingPadding(level),
    paddingRight:
      variant === 'toc' ? hds.semantic.space.sidebar.gap : 'var(--component-nav-paddingX)',
  };
  const itemVariant = variant;
  const childLevel = variant === 'toc' ? 'root' : getNextNavLevel(level);
  const triggerPaddingLeft =
    variant === 'toc' ? hds.semantic.space.sidebar.sectionGap : getNavLevelLeadingPadding(level);

  const staticSection = (
    <Stack
      as="section"
      className={className}
      gap="tight"
      style={{
        gap: hds.semantic.space.sidebar.sectionGap,
        ...style,
      }}
    >
      {label ? <p style={{ ...staticLabelStyle, margin: 0 }}>{label}</p> : null}
      <nav>
        {children ??
          resolvedItems.map((item) => (
            <NavItem
              key={item.path}
              variant={itemVariant}
              label={item.label}
              href={item.path}
              level={childLevel}
              disabled={item.disabled}
              onNavigate={onNavigate}
            />
          ))}
      </nav>
    </Stack>
  );

  if (!collapsible) {
    return staticSection;
  }

  return (
    <Disclosure
      label={label ? <span style={labelStyle}>{label}</span> : ''}
      variant="nav"
      open={open}
      onOpenChange={setOpen}
      triggerStyle={{
        color: 'var(--semantic-color-content-secondary)',
        paddingLeft: triggerPaddingLeft,
        paddingRight: 'var(--component-nav-paddingX)',
        marginTop: 0,
      }}
      contentStyle={contentStyle}
    >
      {children ??
        resolvedItems.map((item) => (
          <NavItem
            key={item.path}
            variant={itemVariant}
            label={item.label}
            href={item.path}
            level={childLevel}
            disabled={item.disabled}
            onNavigate={onNavigate}
          />
        ))}
    </Disclosure>
  );
}
