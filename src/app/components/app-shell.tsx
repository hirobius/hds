/**
 * AppShell — the app frame for web apps: header, sidebar, main and an optional aside (hds#875).
 * @category Layout
 * @tier pattern
 * @ai-intent One frame for Roleforge, Ops and future apps, so none of them
 * hand-builds its own. Below `lg` the sidebar lives in a Sheet opened
 * from a Menu button in the header; from `lg` it is a rail beside main that
 * collapses with a toggle, and the collapsed state can persist per app.
 * @ai-rules Pass the nav as `sidebar` (a node, or a function of `{ collapsed }`
 * to draw an icon-only rail) and the page as children. Do not put a second
 * `<main>`, `<header>` or `<nav>` landmark for the same regions inside it.
 * Structure: Stack (header over body), Grid (rail, main, aside columns) and
 * Surface (header and rail fill). Widths are CSS lengths on local
 * `--hds-local-appshell-*` variables; spacing and colour are HDS tokens.
 * Structural references (no code copied): Primer PageLayout, shadcn/ui sidebar
 * blocks, the common SaaS frame. Slice 1 of #863; a bottom tab bar variant and
 * moving Roleforge and Ops over are follow-up slices.
 */

import * as React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAtLeast } from '../hooks/useBreakpoint';
import { Button } from './button';
import { Grid } from './grid';
import { Icon } from './icon';
import { Sheet } from './sheet';
import { Stack } from './stack';
import { Surface } from './surface';
import { VisuallyHidden } from './visually-hidden';

/** Rail widths (CSS lengths, Shadow Token Convention); a consumer may override the variables. */
const RAIL_WIDTH_VAR = '--hds-local-appshell-rail-width';
const RAIL_COLLAPSED_VAR = '--hds-local-appshell-rail-width-collapsed';
const ASIDE_WIDTH_VAR = '--hds-local-appshell-aside-width';

export interface AppShellSidebarState {
  /** True while the rail is collapsed (always false inside the sheet). */
  collapsed: boolean;
}

export interface AppShellProps {
  /** The page content, rendered inside the `<main>` landmark. */
  children: React.ReactNode;
  /** Top bar content (brand, search, account), rendered inside the `<header>` landmark after the menu toggle. */
  header?: React.ReactNode;
  /** The navigation, rendered inside the `<nav>` landmark: a node, or a function of the collapse state for an icon-only rail. */
  sidebar: React.ReactNode | ((state: AppShellSidebarState) => React.ReactNode);
  /** Accessible name of the navigation and of its sheet. Defaults to 'Main'. */
  sidebarLabel?: string;
  /** Optional detail panel beside main from `lg`, below main under `lg`; rendered as an `<aside>`. */
  aside?: React.ReactNode;
  /** Accessible name of the aside. Defaults to 'Details'. */
  asideLabel?: string;
  /** Controlled collapse state of the rail (lg and up). */
  collapsed?: boolean;
  /** Initial collapse state when uncontrolled. Defaults to false. */
  defaultCollapsed?: boolean;
  /** Called with the new collapse state when the toggle is pressed. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** localStorage key that keeps the uncontrolled collapse state across visits. Off when omitted. */
  persistKey?: string;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
}

function readPersisted(key: string | undefined): boolean | undefined {
  if (!key) return undefined;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? undefined : value === 'collapsed';
  } catch {
    return undefined;
  }
}

function writePersisted(key: string | undefined, collapsed: boolean) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded');
  } catch {
    /* storage blocked: the state still works for this page load */
  }
}

/**
 * @usage The outer frame of a web app: a top bar, a navigation rail or sheet, the page, and an optional detail panel.
 * @whenNot A marketing page, a single form, or a layout inside a page.
 * @useInstead Page a single document-style page with no app navigation
 * @useInstead Sidebar a rail beside content inside a page
 * @slot header The top bar (brand, search, account), inside the banner landmark.
 * @slot sidebar The navigation, inside the nav landmark: a rail from lg, a sheet below.
 * @slot main The page content, inside the main landmark.
 * @slot aside An optional detail panel, inside a complementary landmark.
 * @keyboard Enter/Space On the toggle, collapses or expands the rail (lg and up) or opens the menu sheet (below lg).
 * @keyboard Escape Closes the menu sheet and returns focus to the Menu button.
 * @a11y component required a11y:app-shell.landmarks Header, nav, main and aside render as banner, navigation, main and complementary landmarks.
 * @a11y component required a11y:app-shell.toggle-expanded The rail toggle carries aria-expanded and aria-controls pointing at the nav.
 * @a11y component required a11y:app-shell.sheet-named The menu sheet is a dialog named by sidebarLabel.
 * @a11y consumer required Render one h1 inside main per page.
 * @public
 */
export function AppShell({
  children,
  header,
  sidebar,
  sidebarLabel = 'Main',
  aside,
  asideLabel = 'Details',
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  persistKey,
  className,
}: AppShellProps) {
  const wide = useAtLeast('lg');
  const navId = React.useId();
  const [uncontrolled, setUncontrolled] = React.useState(
    () => readPersisted(persistKey) ?? defaultCollapsed,
  );
  const controlled = collapsedProp !== undefined;
  const collapsed = controlled ? collapsedProp : uncontrolled;
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // A sheet left open while the viewport widens past lg must not come back on narrowing.
  const [prevWide, setPrevWide] = React.useState(wide);
  if (prevWide !== wide) {
    setPrevWide(wide);
    if (wide) setSheetOpen(false);
  }

  const toggleRail = () => {
    const next = !collapsed;
    if (!controlled) {
      setUncontrolled(next);
      writePersisted(persistKey, next);
    }
    onCollapsedChange?.(next);
  };

  const renderSidebar = (state: AppShellSidebarState) =>
    typeof sidebar === 'function' ? sidebar(state) : sidebar;

  const railCollapsed = wide && collapsed;

  const columns = [
    wide ? `var(${railCollapsed ? RAIL_COLLAPSED_VAR : RAIL_WIDTH_VAR})` : null,
    'minmax(0, 1fr)',
    wide && aside != null ? `var(${ASIDE_WIDTH_VAR})` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-hds-component="AppShell"
      data-hds-metrics={`wide:${wide},collapsed:${railCollapsed}`}
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          [RAIL_WIDTH_VAR]: '16rem',
          [RAIL_COLLAPSED_VAR]: '4rem',
          [ASIDE_WIDTH_VAR]: '20rem',
          background: 'var(--semantic-color-surface-page)',
        } as React.CSSProperties
      }
    >
      <Surface
        as="header"
        padding="item"
        className="rounded-none border-b border-border"
        style={{ position: 'sticky', top: 0, zIndex: 10 }}
      >
        <Stack direction="row" align="center" gap="tight">
          {wide ? (
            <Button
              variant="tertiary"
              size="sm"
              iconOnly
              shadow="none"
              label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              aria-controls={navId}
              iconLeft={<Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} size="small" />}
              onClick={toggleRail}
            />
          ) : (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <Sheet.Trigger asChild>
                <Button
                  variant="tertiary"
                  size="sm"
                  iconOnly
                  shadow="none"
                  label="Open menu"
                  iconLeft={<Icon icon={Menu} size="small" />}
                />
              </Sheet.Trigger>
              <Sheet.Content
                aria-describedby={undefined}
                onClick={(event) => {
                  // Following a link in the sheet closes it (keyboard Enter on a link fires click too).
                  if ((event.target as HTMLElement).closest('a[href]')) setSheetOpen(false);
                }}
              >
                <Sheet.Title asChild>
                  <VisuallyHidden>{sidebarLabel}</VisuallyHidden>
                </Sheet.Title>
                <nav aria-label={sidebarLabel}>{renderSidebar({ collapsed: false })}</nav>
              </Sheet.Content>
            </Sheet>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
        </Stack>
      </Surface>
      <Grid
        layout="auto-fill"
        align="stretch"
        style={{
          gridTemplateColumns: columns,
          gap: 0,
          flex: 1,
          // The rail eases between its widths on collapse; the token is zeroed under reduced motion.
          transition:
            'grid-template-columns var(--primitive-duration-short) var(--hds-motion-productive-easing)',
        }}
      >
        {wide && (
          <Surface
            as="nav"
            id={navId}
            aria-label={sidebarLabel}
            data-collapsed={railCollapsed ? 'true' : 'false'}
            padding="item"
            overflow="hidden"
            className="rounded-none border-r border-border"
          >
            {renderSidebar({ collapsed: railCollapsed })}
          </Surface>
        )}
        <Surface
          as="main"
          padding="component"
          className="rounded-none bg-transparent"
          style={{ minWidth: 0 }}
        >
          {children}
          {!wide && aside != null && (
            <aside aria-label={asideLabel} style={{ marginTop: 'var(--semantic-space-scale-lg)' }}>
              {aside}
            </aside>
          )}
        </Surface>
        {wide && aside != null && (
          <Surface
            as="aside"
            aria-label={asideLabel}
            padding="component"
            className="rounded-none border-l border-border"
          >
            {aside}
          </Surface>
        )}
      </Grid>
    </div>
  );
}
