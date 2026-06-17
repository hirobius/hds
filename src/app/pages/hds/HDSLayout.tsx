/* eslint-disable no-restricted-syntax */
/**
 * HDSLayout - unified shell for the full portfolio and HDS surface.
 *
 * Sidebar is sticky; main area scrolls vertically. Legacy gallery routes now
 * redirect into this shell so case studies, supporting material, and docs all
 * share one navigation and interaction model.
 */

import React, { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ChevronDown, Languages, Menu, X } from 'lucide-react';
// Button import removed — unused in HDSLayout
import { NAV_MOBIUS_ANCHOR } from '../../components/mobius-constants';
import { useMobiusStore } from '../../stores/mobiusStore';
import { PageFooter } from '../../components/page-footer';
import { CommandPalette } from '../../components/command-palette';
import { Icon } from '../../components/icon';
import { IconButton } from '../../components/icon-button';
import { SideNav } from '../../components/side-nav';
import { HdsSidebarUtilityButton } from '../../components/shell-controls';
// MobiusShellLayer is lazy-loaded to exclude the three.js stack from the
// main entry chunk. NAV_MOBIUS_ANCHOR comes from the lightweight constants
// module (no three.js transitive deps) so HDSLayout stays lean at initial parse.
import { NavItem } from '../../components/nav-item';
import { TokensRail, TOKENS_RAIL_MIN_W } from '../../components/health-rail';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';
import { FontProvider } from '../../context/FontContext';
import { useLanguage } from '../../context/LanguageContext';
import hds from '../../design-system/tokens';
import { DocPageSpec } from '../../components/DocPageSpec';
import type { PageSpec } from '../../components/DocPageSpec';
import registryData from '../../data/hds-registry.json';
import { HDS_NAV_SECTIONS } from '../../data/hds-nav-data';
import { TocProvider, TocItem, useToc, useTocActiveId } from './HdsTocContext';

// Lazy-loaded: MobiusLogo → MobiusScene pulls in @react-three/fiber,
// three, @react-three/drei, postprocessing. Deferring this import drops ~900 kB
// from the main entry parse path. Suspense fallback={null} = shell renders
// immediately; canvas appears async (~100-200 ms) after chunk download.
const MobiusShellLayer = lazy(() =>
  import('../../components/mobius-shell-layer').then((m) => ({
    default: m.MobiusShellLayer,
  })),
);

const HDS_REGISTRY = registryData as PageSpec[];

// --- Constants ------------------------------------------------------------

const SIDEBAR_W = 240;
const TOC_W = 240; // fixed "On this page" right rail width
// TOKENS_RAIL_W / TOKENS_RAIL_MIN_W live in HealthRail.tsx (TOKENS_RAIL_MIN_W re-exported for grid calc)
const TOC_BP = 1180; // viewport width at which TOC rail appears
const DOC_MAIN_W_WITH_TOC = 880;
const MAIN_CONTENT_W = DOC_MAIN_W_WITH_TOC;
const SHELL_TOP_NAV_CONTENT_W = `calc(${MAIN_CONTENT_W}px - ${hds.semantic.space.layout.gutter})`;
const NAV_OVERLAY_BP = 980;
const DOC_MAIN_INSET_DESKTOP = hds.semantic.space.layout.gutter;
const SHELL_HEADER_BASELINE_OFFSET = `calc((${hds.semantic.space.section.inset} + ${hds.semantic.space.section.stack}) / 2)`;
const LANGUAGE_SWITCHER_ENABLED = false;
const SIDEBAR_OVERLAY_BG =
  'color-mix(in srgb, var(--semantic-color-surface-page) 68%, transparent)';
const SIDEBAR_PANEL_BG =
  'color-mix(in srgb, var(--semantic-color-surface-page) 94%, var(--semantic-color-surface-accentSubtle) 6%)';
const SHELL_TOP_NAV_SURFACE_HEIGHT = `calc(${hds.size[80]} + ${hds.space.px8})`;
const SHELL_TOP_NAV_HEIGHT = SHELL_TOP_NAV_SURFACE_HEIGHT;
const SHELL_TOP_NAV_OFFSET = `calc(${SHELL_TOP_NAV_SURFACE_HEIGHT} + ${hds.semantic.space.layout.gap})`;
const TOC_TOP_OFFSET = SHELL_TOP_NAV_OFFSET;
const DOC_HEADER_TOP_OFFSET = `calc(${hds.semantic.space.section.stack} + (${hds.semantic.space.component.gap} * 2) - ${hds.semantic.space.subgrid.hairline})`;
const RAIL_TOP_ALIGN_NUDGE = `calc(${hds.semantic.space.component.gap} + ${hds.space.px4})`;
const SHELL_TOP_NAV_MOBIUS_CENTER_Y = `calc(${SHELL_TOP_NAV_SURFACE_HEIGHT} / 2 + ${hds.space.px64})`;
// Keep the shell controls above the Mobius canvas so the home toggle stays visible.
const SHELL_TOP_NAV_LAYER = `calc(${hds.zIndex.focus} + 2)`;
const SHELL_TOP_NAV_MOBIUS_LAYER = `calc(${SHELL_TOP_NAV_LAYER} + 1)`;
const SHELL_TOP_NAV_MOBIUS_SIZE = `calc(${hds.size[24]} * 2.025)`;
const SHELL_TOP_NAV_MOBIUS_DROP = hds.space.px64;
const MOBIUS_ACRYLIC_SIZE = 140;
const MOBILE_SCRIM_LAYER = hds.zIndex.overlay;
const MOBILE_SIDEBAR_LAYER = `calc(${hds.zIndex.overlay} + 1)`;
const MOBILE_SHELL_HEADER_LAYER = `calc(${MOBILE_SIDEBAR_LAYER} + 1)`;
const MOBILE_MOBIUS_LAYER = `calc(${MOBILE_SHELL_HEADER_LAYER} + 1)`;
const MOBILE_SHELL_CONTROL_TOP = `calc(${SHELL_TOP_NAV_SURFACE_HEIGHT} / 2)`;
const MOBILE_OPEN_MOBIUS_ACRYLIC_SIZE = hds.size[64];
const MOBILE_OPEN_MOBIUS_ANCHOR_SIZE = hds.size[40];
const MOBILE_OPEN_MOBIUS_SCALE = 0.58;
const SCROLL_HIDE_THRESHOLD = 56;
const SCROLL_DOWN_TRIGGER = 18;
const SCROLL_UP_TRIGGER = 10;
const TOC_RAIL_GAP = hds.semantic.space.sidebar.railPadding;
const RAIL_SECTION_STICKY_TOP = 0;
const RAIL_SECTION_CONTENT_TOP = SHELL_HEADER_BASELINE_OFFSET;
// RAIL_HEADER_CONTENT_GAP moved to HealthRail.tsx
const RAIL_SECTION_LABEL_STYLE = {
  ...hds.typeStyles.eyebrow,
  margin: 0,
  color: 'var(--semantic-color-content-primary)',
  position: 'sticky',
  top: RAIL_SECTION_STICKY_TOP,
  zIndex: 1,
  background: 'var(--semantic-color-surface-page)',
  paddingTop: hds.semantic.space.subgrid.hairline,
  paddingBottom: hds.semantic.space.sidebar.gap,
} as const;
const SHELL_COPY = {
  en: {
    onThisPage: 'On this page',
    onThisPageBody: 'Scan the structure, then jump where you need.',
    searchShell: 'Search the shell',
    tokenName: 'Token Name',
    cssVar: 'CSS Var',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    layoutDirection: 'Layout direction',
    searchPlaceholder: 'Search pages, sections, case study details...',
    noMatches: 'No matches yet.',
    noMatchesHint:
      'Try a case study title, a foundation, or a case-study detail like Token Architecture.',
    page: 'Page',
    section: 'Section',
    skipToMain: 'Skip to main content',
    openNavigation: 'Open navigation',
    closeNavigation: 'Close navigation',
    ctrlK: 'Ctrl K',
  },
} as const;

// ─── Static style objects (extracted to satisfy inline-styles-overdense gate) ─

const hdsLayoutStyles = {
  nestedNavGroupBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 'var(--primitive-size-interactive-min)', // tier-ok: a11y touch target — 44px min interactive size has no semantic alias
    paddingRight: hds.semantic.space.sidebar.gap,
    paddingTop: 'var(--component-nav-paddingY)',
    paddingBottom: 'var(--component-nav-paddingY)',
    marginTop: 0,
    borderWidth: 0,
    cursor: 'pointer',
  } satisfies React.CSSProperties,
  sidebarHomeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: hds.semantic.space.sidebar.gap,
    padding: 0,
    transform: `translateY(calc(${hds.borderWidth.default} * -1))`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  } satisfies React.CSSProperties,
  sidebarFooter: {
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: hds.semantic.space.sidebar.gap,
    paddingBottom: hds.semantic.space.sidebar.sectionGap,
    paddingLeft: hds.semantic.space.sidebar.indent,
    paddingRight: hds.semantic.space.sidebar.indent,
  } satisfies React.CSSProperties,
  mobileNavTriggerWrapper: {
    position: 'fixed',
    transform: 'translateY(-50%)',
    pointerEvents: 'auto',
  } satisfies React.CSSProperties,
  mobiusOverlayContainer: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    contain: 'paint',
  } satisfies React.CSSProperties,
  shellTopNav: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    height: SHELL_TOP_NAV_HEIGHT,
    display: 'flex',
    justifyContent: 'center',
  } satisfies React.CSSProperties,
  shellTopNavInner: {
    position: 'relative',
    width: '100%',
    maxWidth: SHELL_TOP_NAV_CONTENT_W,
    height: SHELL_TOP_NAV_HEIGHT,
    display: 'flex',
    alignItems: 'center',
  } satisfies React.CSSProperties,
  mobileHeaderBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: SHELL_TOP_NAV_HEIGHT,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    pointerEvents: 'none',
  } satisfies React.CSSProperties,
  sidebarLeftRail: {
    gridColumn: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    position: 'sticky',
    alignSelf: 'start',
    minWidth: 0,
    backgroundColor: 'var(--semantic-color-surface-page)',
  } satisfies React.CSSProperties,
  tocRightRail: {
    gridColumn: 3,
    display: 'flex',
    justifyContent: 'flex-start',
    alignSelf: 'start',
    minWidth: 0,
    overflowX: 'hidden',
    backgroundColor: 'var(--semantic-color-surface-page)',
  } satisfies React.CSSProperties,
  sidebarHeaderSticky: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    flex: 'none',
    paddingTop: 0,
    paddingLeft: hds.semantic.space.sidebar.indent,
    paddingRight: hds.semantic.space.sidebar.indent,
    paddingBottom: hds.semantic.space.sidebar.sectionGap,
  } satisfies React.CSSProperties,
  sidebarScrollArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarGutter: 'auto',
    scrollPaddingBlock: '4px',
    // overflowY:auto implicitly clips overflow-x too; pad left so focus rings have room
    paddingInlineStart: '4px',
  } satisfies React.CSSProperties,
} as const;

const HDS_NAV = [
  { path: '/ops/hds/color', label: 'Color' },
  { path: '/ops/hds/typography', label: 'Typography' },
  { path: '/ops/hds/spacing', label: 'Spacing' },
  { path: '/ops/hds/shape', label: 'Shape' },
  { path: '/ops/hds/elevation', label: 'Elevation' },
  { path: '/ops/hds/motion', label: 'Motion' },
  { path: '/ops/hds/breakpoints', label: 'Breakpoints' },
  { path: '/ops/hds/components/actions', label: 'Actions' },
  { path: '/ops/hds/components/inputs', label: 'Inputs' },
  { path: '/ops/hds/components/display', label: 'Display' },
  { path: '/ops/hds/components/feedback', label: 'Feedback' },
  { path: '/ops/hds/components/navigation', label: 'Navigation' },
  { path: '/ops/hds/components/layout', label: 'Layout' },
  { path: '/ops/hds/contribution-guide', label: 'Contribution Guide' },
  { path: '/ops/hds/system-contract', label: 'System Contract' },
];

// --- Page Order (Prev/Next Navigation) -----------------------------------

const SIDEBAR_PAGER_PAGES = [
  { path: '/microsoft-design-systems', label: 'Microsoft Design Systems', group: 'Portfolio' },
  { path: '/visuals', label: 'Visual Design', group: 'Portfolio' },
  ...HDS_NAV.map((page) => ({ ...page, group: 'HDS' })),
  { path: '/vibe-sketchbook', label: 'Vibe Sketchbook', group: 'Portfolio' },
  { path: '/vibe-sketchbook/cloth-simulation', label: 'Vibe Sketchbook', group: 'Portfolio' },
] as const;

const ALL_PAGES = [
  { path: '/', label: 'Home', group: 'Portfolio' },
  { path: '/info', label: 'Info', group: 'About' },
  ...SIDEBAR_PAGER_PAGES,
];

// --- TocLink ---------------------------------------------------------------

function scrollToTocTarget(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}

function TocLink({
  item,
  isActive,
  onSelect,
}: {
  item: TocItem;
  isActive: boolean;
  onSelect?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <NavItem
      variant="toc"
      label={item.title}
      href={`#${item.id}`}
      active={isActive}
      onNavigate={(e) => {
        e.preventDefault();
        const nextHash = `#${item.id}`;
        const isSameHash = location.hash === nextHash;

        if (isSameHash) {
          scrollToTocTarget(item.id);
        } else {
          navigate(
            {
              pathname: location.pathname,
              search: location.search,
              hash: nextHash,
            },
            { replace: false },
          );
        }

        onSelect?.(item.id);
      }}
    />
  );
}

function TocLinks({
  items,
  activeId,
  onSelect,
}: {
  items: TocItem[];
  activeId: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <TocLink key={item.id} item={item} isActive={item.id === activeId} onSelect={onSelect} />
      ))}
    </>
  );
}

function getOrderedTocItems(items: TocItem[], pathname: string) {
  if (pathname !== '/microsoft-design-systems') return items;

  const ranks: Record<string, number> = {
    Intro: 0,
    Process: 1,
    Learnings: 2,
  };

  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const rankDelta = (ranks[a.item.title] ?? 999) - (ranks[b.item.title] ?? 999);
      return rankDelta !== 0 ? rankDelta : a.index - b.index;
    })
    .map(({ item }) => item);
}

// --- Desktop TOC Rail ----------------------------------------------------

function TocPanel() {
  const { isRtl } = useLanguage();
  const location = useLocation();
  const copy = SHELL_COPY.en;
  const { items } = useToc();
  const orderedItems = getOrderedTocItems(items, location.pathname);
  const observedActiveId = useTocActiveId(orderedItems);
  const hashActiveId = location.hash.replace(/^#/, '');
  const activeId = orderedItems.some((item) => item.id === hashActiveId)
    ? hashActiveId
    : observedActiveId;
  if (orderedItems.length < 2) return null;

  const tocPanelStyle: React.CSSProperties = {
    position: 'sticky',
    top: TOC_TOP_OFFSET,
    alignSelf: 'flex-start',
    width: TOC_W,
    minWidth: TOC_W,
    height: `calc(100vh - ${TOC_TOP_OFFSET})`,
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    paddingTop: RAIL_SECTION_CONTENT_TOP,
    paddingLeft: 0,
    paddingRight: isRtl ? TOC_RAIL_GAP : 0,
    background: 'var(--semantic-color-surface-page)',
    zIndex: 20,
  };

  return (
    <aside aria-label="On this page" className="hds-scrollbar" style={tocPanelStyle}>
      <p style={RAIL_SECTION_LABEL_STYLE}>{copy.onThisPage}</p>
      <nav style={{ display: 'grid', gap: 0, paddingTop: 0 }}>
        <TocLinks items={orderedItems} activeId={activeId} />
      </nav>
    </aside>
  );
}

// TokensRail extracted to src/app/components/HealthRail.tsx
// (12i-bloat-hdslayout-health-rail-extract)

// --- Mobile TOC Dropdown -------------------------------------------------

// --- Sidebar -------------------------------------------------------------

function NestedNavGroup({
  label,
  items,
  onNavigate,
  getIndent,
  getExact,
  indentLevel = 1,
}: {
  label: string;
  items: { path: string; label: string }[];
  onNavigate?: () => void;
  getIndent?: (item: { path: string }) => boolean;
  getExact?: (item: { path: string }) => boolean;
  indentLevel?: number;
}) {
  const location = useLocation();
  const storageKey = `hds-nav-subgroup:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const hasActive = items.some((item) =>
    getExact?.(item)
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + '/'),
  );
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return hasActive;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'open') return true;
    if (stored === 'closed') return false;
    return hasActive;
  });
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasActive) setOpen(true);
  }, [hasActive]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, open ? 'open' : 'closed');
  }, [open, storageKey]);

  // Remove closed groups from tab order and assistive tree
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (open) {
      el.removeAttribute('inert');
    } else {
      el.setAttribute('inert', '');
    }
  }, [open]);

  return (
    <div style={{ marginTop: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="hds-text-hover hds-bg-hover-neutral hds-focus"
        aria-expanded={open}
        style={{ ...hdsLayoutStyles.nestedNavGroupBtn, paddingLeft: `calc(${hds.semantic.space.sidebar.sectionGap} + (${hds.semantic.space.sidebar.indent} * ${indentLevel}))` }}
      >
        <span style={{ ...hds.typeStyles.label }}>{label}</span>
        <Icon
          icon={ChevronDown}
          size="small"
          color="currentColor"
          style={{
            transition: `transform var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)`,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }}
        />
      </button>
      <div
        ref={bodyRef}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: `grid-template-rows var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)`,
          paddingTop: 0,
        }}
      >
        <div
          style={{
            overflow: 'hidden',
          }}
        >
          {items.map((item) => (
            <SideNavItem
              key={item.path}
              path={item.path}
              label={item.label}
              exact={getExact?.(item)}
              indent={(getIndent ? getIndent(item) : true) ? indentLevel + 1 : indentLevel}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SideNavItem({
  path,
  label,
  exact,
  indent,
  level,
  onNavigate,
  disabled = false,
}: {
  path: string;
  label: string;
  exact?: boolean;
  indent?: boolean | number;
  level?: 'root' | 'nested';
  onNavigate?: () => void;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = exact
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <SideNav
      level={level ?? (indent ? 'nested' : 'root')}
      indent={indent}
      label={label}
      href={path}
      active={isActive}
      disabled={disabled}
      onNavigate={(event) => {
        const isPlainLeftClick =
          event.button === 0 &&
          !event.metaKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.shiftKey;

        if (!isPlainLeftClick) {
          return;
        }

        event.preventDefault();

        if (!isActive) {
          navigate(path);
        }

        onNavigate?.();
      }}
    />
  );
}

function Sidebar({
  isDark: _isDark,
  onToggleDark: _onToggleDark,
  isOpen,
  onClose,
  navRef,
  onScrollCapture,
  isOverlay,
}: {
  isDark: boolean;
  onToggleDark: () => void;
  isOpen: boolean;
  onClose: () => void;
  navRef?: React.RefObject<HTMLDivElement | null>;
  onScrollCapture?: (scrollTop: number) => void;
  isOverlay: boolean;
}) {
  const { isRtl, toggleDirection } = useLanguage();
  const copy = SHELL_COPY.en;
  const navigate = useNavigate();
  const isHdsRoute =
    location.pathname.startsWith('/ops/hds') || location.pathname.startsWith('/hds'); // route-ok: /hds is legacy redirect source

  const sidebarNavStyle: React.CSSProperties = isOverlay
    ? {
        position: 'fixed',
        top: SHELL_TOP_NAV_HEIGHT,
        left: 0,
        right: 0,
        width: '100vw',
        minWidth: 0,
        height: `calc(100vh - ${SHELL_TOP_NAV_HEIGHT}px)`,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 'none',
        borderRight: 'none',
        background: SIDEBAR_PANEL_BG,
        backdropFilter: 'blur(14px)',
        overflow: 'visible',
        zIndex: MOBILE_SIDEBAR_LAYER,
        flexShrink: 0,
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? 'translateY(0px)' : 'translateY(24px)',
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: `transform var(--hds-motion-productive-duration) var(--hds-motion-productive-easing), opacity var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)`,
      }
    : {
        position: 'relative',
        left: 'auto',
        right: 'auto',
        width: SIDEBAR_W,
        minWidth: SIDEBAR_W,
        maxHeight: `calc(100dvh - ${SHELL_TOP_NAV_OFFSET})`,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 'none',
        borderRight: 'none',
        background: 'var(--semantic-color-surface-page)',
        overflow: 'clip',
        zIndex: 20,
        flexShrink: 0,
        opacity: 1,
        transform: 'none',
        pointerEvents: 'auto',
      };

  return (
    <nav
      aria-label="Portfolio navigation"
      style={sidebarNavStyle}
    >
      <div
        ref={navRef}
        className="hds-scrollbar"
        data-scrollbar-edge={isRtl ? 'leading' : 'trailing'}
        onScroll={(event) => onScrollCapture?.(event.currentTarget.scrollTop)}
        style={{ ...hdsLayoutStyles.sidebarScrollArea, direction: isRtl ? 'rtl' : 'ltr' }}
      >
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header — desktop only; mobile topbar carries the logo */}
          {!isOverlay && (
            <div
              style={{ ...hdsLayoutStyles.sidebarHeaderSticky, background: 'var(--semantic-color-surface-page)' }}
            >
              <button
                type="button"
                onClick={() => navigate('/')}
                className="hds-focus"
                style={hdsLayoutStyles.sidebarHomeBtn}
                aria-label="Go to portfolio home"
              />
              {isHdsRoute ? (
                <SideNav label="Hirobius Design System" level="root" titleLabel />
              ) : null}
            </div>
          )}

          {/* Nav */}
          <div
            style={{
              flex: 'none',
              paddingTop: 0,
              paddingBottom: hds.semantic.space.sidebar.gap,
              paddingInlineStart: hds.semantic.space.sidebar.indent,
            }}
          >
            <div style={{ display: 'grid', gap: 0 }}>
              <div style={{ display: 'grid', gap: 0, paddingTop: 0 }}>
                {HDS_NAV_SECTIONS.map((section) => (
                  <NestedNavGroup
                    key={section.label}
                    label={section.label}
                    items={[...section.items]}
                    onNavigate={onClose}
                    getExact={section.getExact}
                    getIndent={section.getIndent}
                    indentLevel={0}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Footer */}
          {!isOverlay && LANGUAGE_SWITCHER_ENABLED && (
            <div
              style={hdsLayoutStyles.sidebarFooter}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: hds.semantic.space.subgrid.gap,
                }}
              >
                <HdsSidebarUtilityButton
                  onClick={toggleDirection}
                  icon={Languages}
                  label={`${copy.layoutDirection}: ${isRtl ? 'RTL' : 'LTR'}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// --- Layout Root ---------------------------------------------------------

function HDSDocRoot() {
  const { isDark, toggleDark } = useTheme();
  const { direction, isRtl: _isRtl, toggleDirection: _toggleDirection } = useLanguage();
  const copy = SHELL_COPY.en;
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarScrollTopRef = useRef(0);
  const previousRouteRef = useRef<{ pathname: string; hash: string } | null>(null);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < NAV_OVERLAY_BP);
  const [showToc, setShowToc] = useState(() => window.innerWidth >= TOC_BP);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setNavScrollVisible = useMobiusStore((s) => s.setNavScrollVisible);
  const setNavScrollProgress = useMobiusStore((s) => s.setNavScrollProgress);
  const setNavAcrylicHovered = useMobiusStore((s) => s.setNavAcrylicHovered);
  const navScrollProgress = useMobiusStore((s) => s.navScrollProgress);
  const mobiusLayoutMode = useMobiusStore((s) => s.layoutMode);
  const mobiusLayoutAnchor = useMobiusStore((s) => s.layoutAnchorSelector);
  const reducedMotion = useMobiusStore((s) => s.reducedMotion);
  const showMobiusNavPill =
    mobiusLayoutMode === 'ambient' && mobiusLayoutAnchor === NAV_MOBIUS_ANCHOR;

  const isImmersiveSketchRoute =
    location.pathname.startsWith('/vibe-sketchbook/') && location.pathname !== '/vibe-sketchbook';
  const tokenPath = new URLSearchParams(location.search).get('token');
  const mainInlineStartInset = isImmersiveSketchRoute
    ? 0
    : location.pathname === '/info'
      ? 0
      : isMobile
        ? hds.semantic.space.sidebar.railPadding
        : DOC_MAIN_INSET_DESKTOP;
  const mainInlineEndInset = isImmersiveSketchRoute
    ? 0
    : isMobile
      ? hds.semantic.space.sidebar.railPadding
      : DOC_MAIN_INSET_DESKTOP;

  // Track viewport width
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < NAV_OVERLAY_BP);
      setShowToc(window.innerWidth >= TOC_BP);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Treat the Mobius like a sticky nav: hide on deliberate downward
  // scroll, reveal again after a small upward scroll, and animate the shared
  // acrylic/canvas progress instead of hard toggling visibility.
  useEffect(() => {
    if (mobiusLayoutMode !== 'ambient' || mobiusLayoutAnchor !== NAV_MOBIUS_ANCHOR) {
      setNavScrollVisible(true);
      setNavScrollProgress(0);
      setNavAcrylicHovered(false);
      return;
    }

    let scrollRafId = 0;
    let animationRafId = 0;
    let lastY = window.scrollY;
    let direction: 'up' | 'down' | null = null;
    let directionalDistance = 0;
    let currentProgress = useMobiusStore.getState().navScrollProgress;
    let targetProgress = window.scrollY > SCROLL_HIDE_THRESHOLD ? currentProgress : 0;

    const animateProgress = () => {
      animationRafId = 0;
      const delta = targetProgress - currentProgress;

      if (Math.abs(delta) < 0.001) {
        currentProgress = targetProgress;
        setNavScrollProgress(currentProgress);
        setNavScrollVisible(currentProgress < 0.98);
        return;
      }

      const progressStep = reducedMotion ? 1 : targetProgress < currentProgress ? 0.14 : 0.2;
      currentProgress += delta * progressStep;
      setNavScrollProgress(currentProgress);
      setNavScrollVisible(currentProgress < 0.98);
      animationRafId = window.requestAnimationFrame(animateProgress);
    };

    const ensureAnimation = () => {
      if (animationRafId) return;
      animationRafId = window.requestAnimationFrame(animateProgress);
    };

    const updateScrollState = () => {
      scrollRafId = 0;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;

      if (y <= SCROLL_HIDE_THRESHOLD) {
        direction = null;
        directionalDistance = 0;
        targetProgress = 0;
        ensureAnimation();
        return;
      }

      if (Math.abs(dy) < 1) {
        ensureAnimation();
        return;
      }

      const nextDirection = dy > 0 ? 'down' : 'up';
      if (nextDirection !== direction) {
        direction = nextDirection;
        directionalDistance = 0;
      }

      directionalDistance += Math.abs(dy);

      if (direction === 'down' && directionalDistance >= SCROLL_DOWN_TRIGGER) {
        targetProgress = 1;
        directionalDistance = 0;
      } else if (direction === 'up' && directionalDistance >= SCROLL_UP_TRIGGER) {
        targetProgress = 0;
        directionalDistance = 0;
      }

      ensureAnimation();
    };

    const onScroll = () => {
      if (scrollRafId) return;
      scrollRafId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      if (scrollRafId) window.cancelAnimationFrame(scrollRafId);
      if (animationRafId) window.cancelAnimationFrame(animationRafId);
      setNavAcrylicHovered(false);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [
    isMobile,
    mobiusLayoutAnchor,
    mobiusLayoutMode,
    reducedMotion,
    setNavAcrylicHovered,
    setNavScrollProgress,
    setNavScrollVisible,
  ]);

  // On route change: close mobile sidebar + reset/restore page scroll + move focus to main content
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
    const restoreY = (location.state as { restoreScrollY?: number } | null)?.restoreScrollY;
    const hash = location.hash.replace(/^#/, '');
    const previousRoute = previousRouteRef.current;
    const isSameDocumentPosition =
      previousRoute?.pathname === location.pathname && previousRoute?.hash === location.hash;

    previousRouteRef.current = { pathname: location.pathname, hash: location.hash };

    if (restoreY == null && isSameDocumentPosition) {
      return;
    }

    if (restoreY != null) {
      // Restore scroll from a token deep-link return — let the page paint first
      requestAnimationFrame(() => window.scrollTo({ top: restoreY, behavior: 'instant' }));
    } else if (hash) {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
        } else {
          window.scrollTo({ top: 0 });
        }
      });
    } else {
      window.scrollTo({ top: 0 });
    }
    requestAnimationFrame(() => {
      mainRef.current?.focus();
    });
    // location.state intentionally excluded: state changes don't affect scroll restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  // Preserve the sidebar's own scroll position across route changes so the nav
  // doesn't snap back to the top when someone is moving through lower sections.
  useLayoutEffect(() => {
    if (!sidebarRef.current) return;
    sidebarRef.current.scrollTop = sidebarScrollTopRef.current;
  }, [location.pathname]);

  const currentIdx = ALL_PAGES.findIndex((p) => p.path === location.pathname);
  const isRecoveryRoute = currentIdx === -1 && !isImmersiveSketchRoute;
  const isHomeRoute = location.pathname === '/';
  const mainContentMaxWidth = isImmersiveSketchRoute ? 'none' : MAIN_CONTENT_W;

  const isTokensRoute = location.pathname === '/ops/hds/tokens';
  const isHdsRoute = location.pathname === '/ops/hds' || location.pathname.startsWith('/ops/hds/');
  const isDocRailRoute =
    isHdsRoute ||
    isTokensRoute ||
    location.pathname === '/visuals' ||
    location.pathname === '/microsoft-design-systems';
  const isShellRoute = isHdsRoute;
  const sidebarVisible = isShellRoute && (!isMobile || sidebarOpen);
  const isMobileShellOpen = isMobile && isShellRoute && sidebarOpen;
  const showShellTopNav = !isRecoveryRoute;
  const shellLeftRailWidth = isMobile ? 0 : isShellRoute ? SIDEBAR_W : 0;
  const shellRightRailWidth =
    isMobile || isImmersiveSketchRoute || !isDocRailRoute
      ? 0
      : showToc
        ? isTokensRoute
          ? TOKENS_RAIL_MIN_W
          : TOC_W
        : 0;
  const shellTopNavMobiusOffset = 0;
  const mainContentLaneMaxWidth = isImmersiveSketchRoute ? 'none' : MAIN_CONTENT_W;
  const shellGridStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }
    : {
        display: 'grid',
        gridTemplateColumns: `${shellLeftRailWidth ? `minmax(${shellLeftRailWidth}px, 1fr)` : 'minmax(0, 1fr)'} minmax(0, 880px) ${shellRightRailWidth ? `minmax(${shellRightRailWidth}px, 1fr)` : 'minmax(0, 1fr)'}`,
        alignItems: 'start',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      };

  const mobiusAcrylicBackground = 'var(--semantic-color-surface-page)';
  const mobiusAcrylicBorder = isDark ? 'transparent' : 'transparent';

  return (
    <>
      <style>{`
        .skip-link {
          position: fixed;
          top: ${hds.semantic.space.sidebar.indent};
          left: ${hds.semantic.space.sidebar.indent};
          transform: translateY(-140%);
          padding: ${hds.semantic.space.subgrid.gap} ${hds.semantic.space.sidebar.indent};
          border: var(--semantic-borderWidth-default) solid var(--semantic-color-border-accent);
          background: var(--semantic-color-surface-page);
          color: var(--semantic-color-content-primary);
          text-decoration: none;
          z-index: calc(${hds.zIndex.focus} + 1);
          transition: transform ${hds.motion.productive.duration}s;
        }
        .skip-link:focus {
          transform: translateY(0);
        }
        .skip-link.hds-focus:focus,
        .skip-link.hds-focus:focus-visible {
          outline: none;
          box-shadow: none;
        }
        [data-hds-component="hds-layout"][dir="rtl"] .skip-link {
          left: auto;
          right: ${hds.semantic.space.sidebar.indent};
        }
        .hds-scrollbar {
          scrollbar-width: auto;
          scrollbar-color: var(--semantic-color-border-strong) var(--semantic-color-surface-raised);
        }
        .hds-scrollbar::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }
        .hds-scrollbar::-webkit-scrollbar-track {
          background: var(--semantic-color-surface-raised);
        }
        .hds-scrollbar::-webkit-scrollbar-thumb {
          background: var(--semantic-color-border-strong);
          border: var(--semantic-borderWidth-emphasis) solid var(--semantic-color-surface-raised);
          border-radius: 999px;
        }
        .hds-scrollbar:hover::-webkit-scrollbar-thumb,
        .hds-scrollbar:focus-within::-webkit-scrollbar-thumb {
          background: var(--semantic-color-content-secondary);
        }
        .hds-scrollbar:focus-within {
          scrollbar-color: var(--semantic-color-content-secondary) var(--semantic-color-surface-raised);
        }
        .hds-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--semantic-color-content-secondary);
        }
        .hds-scrollbar::-webkit-scrollbar-corner {
          background: var(--semantic-color-surface-raised);
        }
        .hds-scrollbar[data-scrollbar-edge="leading"] {
          direction: rtl;
        }
        html, body {
          background-color: var(--semantic-color-surface-page);
          margin: 0;
          padding: 0;
          height: 100%;
        }
        #root { height: 100%; }
        * { box-sizing: border-box; }

        /* ── Nav indicator bar — states owned by theme.css (.hds-nav-indicator) ── */
      `}</style>
      <div
        data-hds-component="hds-layout"
        dir={direction}
        className="bg-surface transition-colors duration-300 relative w-full flex flex-col items-center"
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--semantic-color-surface-page)',
          fontFamily: hds.fontFamily,
          color: 'var(--semantic-color-content-primary)',
          isolation: 'isolate',
        }}
      >
        {/* MobiusShellLayer is lazy — vendor-three loads async after first paint */}
        <Suspense fallback={null}>
          <MobiusShellLayer
            showNavAcrylic={showMobiusNavPill}
            navAcrylicBackground={mobiusAcrylicBackground}
            navAcrylicBorder={mobiusAcrylicBorder}
            forceVisible={isMobileShellOpen}
            layerZIndex={isMobile && isShellRoute ? MOBILE_MOBIUS_LAYER : undefined}
            navScaleMultiplier={isMobileShellOpen ? MOBILE_OPEN_MOBIUS_SCALE : 1}
          />
        </Suspense>

        {!isHomeRoute && (
          <a href="#main-content" className="skip-link hds-focus">
            {copy.skipToMain}
          </a>
        )}

        {/* Mobile nav trigger — always present on HDS shell routes, regardless of Mobius mode */}
        {isMobile && isShellRoute && (
          <div
            style={{ ...hdsLayoutStyles.mobileNavTriggerWrapper, top: MOBILE_SHELL_CONTROL_TOP, left: hds.semantic.space.layout.gutter, zIndex: MOBILE_SHELL_HEADER_LAYER }}
          >
            <IconButton
              icon={sidebarOpen ? X : Menu}
              aria-label={sidebarOpen ? copy.closeNavigation : copy.openNavigation}
              onClick={() => setSidebarOpen((current) => !current)}
              variant="secondary"
              size="md"
              style={{
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                background:
                  'color-mix(in srgb, var(--semantic-color-surface-page) 92%, var(--semantic-color-surface-accentSubtle) 8%)',
                border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
                minWidth: 'var(--primitive-size-interactive-min)', // tier-ok: a11y touch target — 44px min interactive size has no semantic alias
                minHeight: 'var(--primitive-size-interactive-min)', // tier-ok: a11y touch target — 44px min interactive size has no semantic alias
              }}
            />
          </div>
        )}

        {showMobiusNavPill &&
          (() => {
            const navAcrylicOpacity = Number.isFinite(navScrollProgress)
              ? Math.max(0, 1 - navScrollProgress * 1.12)
              : 0;
            const shellHeaderOpacity = isMobileShellOpen ? 1 : navAcrylicOpacity;
            const isNavAcrylicPointerInteractive = isMobileShellOpen || navAcrylicOpacity > 0.05;
            const homeButtonSize = isMobileShellOpen
              ? MOBILE_OPEN_MOBIUS_ACRYLIC_SIZE
              : MOBIUS_ACRYLIC_SIZE;
            const homeButtonCenterX = isMobileShellOpen
              ? `var(--hds-mobius-screen-x, calc(100vw - ${hds.semantic.space.layout.gutter} - (${homeButtonSize} / 2)))`
              : 'var(--hds-mobius-screen-x, 50vw)';
            const homeButtonCenterY = isMobileShellOpen
              ? `var(--hds-mobius-screen-y, ${MOBILE_SHELL_CONTROL_TOP})`
              : `var(--hds-mobius-screen-y, ${SHELL_TOP_NAV_MOBIUS_CENTER_Y})`;
            const homeButtonTransform = isMobileShellOpen
              ? 'translate(-50%, -50%)'
              : `translate(-50%, -50%) scale(${1 - navScrollProgress * 0.18})`;

            return (
              <div
                style={{ ...hdsLayoutStyles.mobiusOverlayContainer, zIndex: isMobile && isShellRoute ? MOBILE_SHELL_HEADER_LAYER : hds.zIndex.focus }}
              >
                {/* Mobius-mode hamburger removed — standalone trigger above handles all HDS shell routes */}
                <button
                  type="button"
                  aria-label="Go home"
                  tabIndex={0}
                  onClick={() => navigate('/')}
                  onPointerEnter={() => setNavAcrylicHovered(true)}
                  onPointerLeave={() => setNavAcrylicHovered(false)}
                  onPointerCancel={() => setNavAcrylicHovered(false)}
                  onFocus={() => setNavAcrylicHovered(true)}
                  onBlur={() => setNavAcrylicHovered(false)}
                  className="hds-mobius-acrylic hds-focus"
                  // inline-ok: Mobius acrylic button — all properties are computed from scroll/layout state; no static subset extractable
                  style={{
                    position: 'absolute',
                    left: homeButtonCenterX,
                    top: homeButtonCenterY,
                    width: homeButtonSize,
                    height: homeButtonSize,
                    borderRadius: '50%',
                    transform: homeButtonTransform,
                    opacity: shellHeaderOpacity,
                    pointerEvents: isNavAcrylicPointerInteractive ? 'auto' : 'none',
                    background: mobiusAcrylicBackground,
                    border: `${hds.borderWidth.default} solid ${mobiusAcrylicBorder}`,
                    boxShadow: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    appearance: 'none',
                    transition: [
                      `background-color ${hds.motion.expressive.duration}s ${hds.motion.expressive.easing}`,
                      `opacity ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
                      `transform ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
                    ].join(', '),
                    willChange: 'transform, opacity',
                  }}
                />
              </div>
            );
          })()}

        {showShellTopNav && (
          <nav
            aria-label="App controls"
            style={{ ...hdsLayoutStyles.shellTopNav, zIndex: SHELL_TOP_NAV_LAYER }}
          >
            <div
              style={hdsLayoutStyles.shellTopNavInner}
            >
              <div
                data-mobius-anchor="shell-top-nav-mobius"
                aria-hidden="true"
                // inline-ok: Mobius anchor — all position/size properties are computed from layout state
                style={{
                  position: 'absolute',
                  top: isMobileShellOpen
                    ? MOBILE_SHELL_CONTROL_TOP
                    : `calc(((${SHELL_TOP_NAV_SURFACE_HEIGHT} - ${SHELL_TOP_NAV_MOBIUS_SIZE}) / 2) + ${SHELL_TOP_NAV_MOBIUS_DROP})`,
                  left: isMobileShellOpen ? 'auto' : `calc(50% + ${shellTopNavMobiusOffset}px)`,
                  right: isMobileShellOpen ? hds.semantic.space.layout.gutter : 'auto',
                  transform: isMobileShellOpen ? 'translateY(-50%)' : 'translateX(-50%)',
                  zIndex: SHELL_TOP_NAV_MOBIUS_LAYER,
                  width: isMobileShellOpen
                    ? MOBILE_OPEN_MOBIUS_ANCHOR_SIZE
                    : SHELL_TOP_NAV_MOBIUS_SIZE,
                  height: isMobileShellOpen
                    ? MOBILE_OPEN_MOBIUS_ANCHOR_SIZE
                    : SHELL_TOP_NAV_MOBIUS_SIZE,
                  pointerEvents: 'none',
                  transition: `transform ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
                }}
              />
              {/* Global Cmd-K / Ctrl-K doc search — Dialog portal renders into document.body */}
              <CommandPalette />
            </div>
          </nav>
        )}

        {/* Backdrop - mobile only, when sidebar is open */}
        {isMobile && sidebarOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSidebarOpen(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: SIDEBAR_OVERLAY_BG,
              zIndex: MOBILE_SCRIM_LAYER,
            }}
          />
        )}

        {isMobileShellOpen && (
          <div
            aria-hidden="true"
            style={{ ...hdsLayoutStyles.mobileHeaderBar, height: SHELL_TOP_NAV_HEIGHT, background: SIDEBAR_PANEL_BG, zIndex: MOBILE_SIDEBAR_LAYER }}
          />
        )}

        {isShellRoute && isMobile && (
          <Sidebar
            isDark={isDark}
            onToggleDark={toggleDark}
            isOpen={sidebarVisible}
            onClose={() => setSidebarOpen(false)}
            isOverlay
            navRef={sidebarRef}
            onScrollCapture={(scrollTop) => {
              sidebarScrollTopRef.current = scrollTop;
            }}
          />
        )}

        {/* Constrained centering wrapper */}
        <div
          className="w-full flex"
          style={{
            minHeight: '100vh',
            backgroundColor: 'var(--semantic-color-surface-page)',
            ...shellGridStyle,
          }}
        >
          {isShellRoute && !isMobile && (
            <div
              style={{ ...hdsLayoutStyles.sidebarLeftRail, top: SHELL_TOP_NAV_OFFSET, paddingTop: `calc(${DOC_HEADER_TOP_OFFSET} - ${RAIL_TOP_ALIGN_NUDGE})` }}
            >
              <Sidebar
                isDark={isDark}
                onToggleDark={toggleDark}
                isOpen={sidebarVisible}
                onClose={() => setSidebarOpen(false)}
                isOverlay={isMobile}
                navRef={sidebarRef}
                onScrollCapture={(scrollTop) => {
                  sidebarScrollTopRef.current = scrollTop;
                }}
              />
            </div>
          )}
          <TocProvider key={location.pathname}>
            <main
              id="main-content"
              ref={mainRef}
              tabIndex={-1}
              className="flex-1 w-full"
              // inline-ok: main layout element — 16 properties are all computed from route/viewport state; no static subset extractable without breaking layout logic
              style={{
                position: 'relative',
                gridColumn: isMobile ? '1' : '2',
                minWidth: 0,
                display: isRecoveryRoute ? 'flex' : 'block',
                alignItems: isRecoveryRoute ? 'center' : undefined,
                justifyContent: isRecoveryRoute ? 'center' : undefined,
                marginLeft: 0,
                marginRight: 0,
                paddingLeft: mainInlineStartInset,
                paddingRight: mainInlineEndInset,
                paddingTop: isRecoveryRoute ? 0 : SHELL_TOP_NAV_OFFSET,
                paddingBottom:
                  isImmersiveSketchRoute || isRecoveryRoute ? 0 : hds.semantic.space.section.stack,
                width: '100%',
                overflowX: 'hidden',
                overflowY: isRecoveryRoute ? 'hidden' : undefined,
                outline: 'none', // audit-ok: main is tabIndex={-1} — programmatic skip-link target only, never receives keyboard Tab focus
                ...(isImmersiveSketchRoute
                  ? ({
                      '--sketchbook-shell-viewport-height': `calc(100dvh - ${SHELL_TOP_NAV_OFFSET})`,
                    } as React.CSSProperties)
                  : {}),
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: isMobile ? mainContentMaxWidth : mainContentLaneMaxWidth,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                {isRecoveryRoute || isImmersiveSketchRoute ? (
                  <Outlet />
                ) : (
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: hds.motion.expressive.duration,
                      ...hds.motion.expressive.easing,
                    }}
                    style={{ width: '100%' }}
                  >
                    <Outlet />
                  </motion.div>
                )}
                {!isImmersiveSketchRoute && (
                  <div style={{ marginTop: hds.semantic.space.section.stack }}>
                    <PageFooter />
                  </div>
                )}
                {!isImmersiveSketchRoute &&
                  (() => {
                    const spec = HDS_REGISTRY.find((s) => s.path === location.pathname);
                    return spec ? <DocPageSpec spec={spec} /> : null;
                  })()}
              </div>
            </main>
            {showToc && !isImmersiveSketchRoute && isDocRailRoute && (
              <div
                style={{ ...hdsLayoutStyles.tocRightRail, position: isTokensRoute ? 'relative' : 'sticky', top: isTokensRoute ? undefined : 0, paddingTop: isTokensRoute ? SHELL_TOP_NAV_OFFSET : `calc(${SHELL_TOP_NAV_OFFSET} - ${RAIL_TOP_ALIGN_NUDGE})` }}
              >
                {isTokensRoute ? (
                  <TokensRail isDark={isDark} tokenPath={tokenPath} />
                ) : (
                  <TocPanel />
                )}
              </div>
            )}
          </TocProvider>
        </div>
      </div>
    </>
  );
}

export default function HDSLayout() {
  return (
    <ThemeProvider>
      <FontProvider>
        <HDSDocRoot />
      </FontProvider>
    </ThemeProvider>
  );
}
