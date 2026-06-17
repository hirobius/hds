// motion-ok: structural doc shell — sticky rails layout, no per-element motion
/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * DocShell — three-column documentation layout for /hds doc routes.
 * @category Layout
 * @tier utility
 *
 * 9d-1 baseline: thin top header bar (wordmark + search slot + theme slot)
 * over a three-column body — sticky left rail (~200px) projecting hierarchical
 * nav from the live HDS manifest, max-width content column, sticky right rail
 * (~200px) reserved as a TOC placeholder for 9d-6.
 *
 * Design contract (from the unit brief):
 *   - Compose Container / Stack — do NOT re-implement layout primitives.
 *   - Project left-rail nav from componentSpecs + utilities; never hand-author.
 *   - Surface from role tokens only (bg-background, border-border, etc.).
 *   - Sticky rails, scrollable content. Background: surface.background.
 *
 * Slots reserved for downstream 9-D units (placeholder text only):
 *   - 9d-2 — search input (header center)
 *   - 9d-6 — table of contents (right rail)
 * Filled slots:
 *   - theme-toggle — ThemeToggle (9d-3, system / light / dark dropdown)
 *
 * Compatibility:
 *   - Wraps <Outlet /> in TocProvider (so existing useToc/useTocActiveId
 *     consumers keep working) and EmbeddedDocLayoutProvider (bottomSlot=null,
 *     so DocLayout consumers don't break when the shell hosts them).
 *   - This component is doc-tier internal scaffolding (utility tier) — not a
 *     part of the public HDS authoring surface, so it is intentionally not
 *     enrolled in the LLM-facing component inventory.
 */

import * as React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import systemManifestData from 'virtual:hds-manifest';
import { cn } from '../../lib/utils';
import { TocProvider, useToc } from '../pages/hds/HdsTocContext';
import { EmbeddedDocLayoutProvider } from '../layouts/EmbeddedDocLayoutContext';
import { Stack } from './stack';
import { CommandPalette } from './command-palette';
import { ThemeToggle } from './theme-toggle';
import { DocTOC } from './doc-toc';

// ── Manifest projection ────────────────────────────────────────────────────────

type ManifestSpec = {
  category?: string;
  tier?: string;
  hidden?: boolean;
  docExempt?: boolean;
};

type SystemManifest = {
  componentSpecs?: Record<string, ManifestSpec>;
  utilities?: Record<string, ManifestSpec>;
};

const MANIFEST = systemManifestData as SystemManifest;

const COMPONENT_CATEGORY_ORDER = [
  'Actions',
  'Inputs',
  'Display',
  'Feedback',
  'Navigation',
  'Layout',
  'Overlays',
  'Branding',
  'Utilities',
  'Uncategorized',
] as const;

// Stable map: manifest category → /hds/components route segment (the
// existing aggregator pages built before 9d-1).
const COMPONENT_CATEGORY_TO_ROUTE: Record<string, string> = {
  Actions: 'actions',
  Inputs: 'inputs',
  Display: 'display',
  Feedback: 'feedback',
  Navigation: 'navigation',
  Layout: 'layout',
  // Map remaining buckets to the closest existing aggregator page so the
  // rail never produces a 404. Overlays / Branding / Utilities are folded
  // into 'display' for now (aggregator pages widen as they're built out).
  Overlays: 'display',
  Branding: 'display',
  Utilities: 'doc-utilities',
};

interface RailLink {
  label: string;
  to: string;
}

interface RailSection {
  id: string;
  label: string;
  links: RailLink[];
}

const FOUNDATION_LINKS: RailLink[] = [
  { label: 'Overview', to: '/ops/hds/color' },
  { label: 'Color', to: '/ops/hds/color' },
  { label: 'Typography', to: '/ops/hds/typography' },
  { label: 'Spacing', to: '/ops/hds/spacing' },
  { label: 'Shape', to: '/ops/hds/shape' },
  { label: 'Elevation', to: '/ops/hds/elevation' },
  { label: 'Motion', to: '/ops/hds/motion' },
  { label: 'Breakpoints', to: '/ops/hds/breakpoints' },
];

const TOKENS_LINKS: RailLink[] = [{ label: 'Token Reference', to: '/ops/hds/tokens' }];

function buildComponentLinks(specs: Record<string, ManifestSpec>): RailLink[] {
  const seen = new Set<string>();
  const buckets = new Map<string, number>();

  for (const spec of Object.values(specs)) {
    if (!spec || spec.hidden || spec.docExempt) continue;
    if (spec.tier !== 'primitive') continue;
    const category = spec.category ?? 'Uncategorized';
    buckets.set(category, (buckets.get(category) ?? 0) + 1);
  }

  const ordered: RailLink[] = [];
  const orderIndex = new Map(COMPONENT_CATEGORY_ORDER.map((c, i) => [c, i] as const));
  type CategoryKey = (typeof COMPONENT_CATEGORY_ORDER)[number];
  const categories = [...buckets.keys()].sort((a, b) => {
    const ai = orderIndex.get(a as CategoryKey) ?? COMPONENT_CATEGORY_ORDER.length;
    const bi = orderIndex.get(b as CategoryKey) ?? COMPONENT_CATEGORY_ORDER.length;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });

  for (const category of categories) {
    const segment = COMPONENT_CATEGORY_TO_ROUTE[category] ?? 'doc-utilities';
    const to = `/ops/hds/components/${segment}`;
    if (seen.has(to)) continue;
    seen.add(to);
    ordered.push({ label: category, to });
  }

  return ordered;
}

function buildTierLinks(
  specs: Record<string, ManifestSpec>,
  tier: 'pattern' | 'template',
): RailLink[] {
  const out: RailLink[] = [];
  for (const [name, spec] of Object.entries(specs)) {
    if (!spec || spec.hidden || spec.docExempt) continue;
    if (spec.tier !== tier) continue;
    out.push({
      label: name,
      to: `/ops/hds/${tier === 'pattern' ? 'patterns' : 'templates'}/${name}`,
    });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

function buildRailSections(): RailSection[] {
  const specs = MANIFEST.componentSpecs ?? {};
  return [
    { id: 'foundations', label: 'Foundations', links: FOUNDATION_LINKS },
    { id: 'tokens', label: 'Tokens', links: TOKENS_LINKS },
    { id: 'components', label: 'Components', links: buildComponentLinks(specs) },
    { id: 'patterns', label: 'Patterns', links: buildTierLinks(specs, 'pattern') },
    { id: 'templates', label: 'Templates', links: buildTierLinks(specs, 'template') },
  ];
}

// ── Header zone ────────────────────────────────────────────────────────────────

function DocShellHeader() {
  return (
    <header
      data-hds-component="DocShellHeader"
      className={cn(
        'sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between',
        'border-b border-border bg-background/80 px-6 backdrop-blur',
      )}
    >
      {/* Left cluster — wordmark */}
      <Link
        to="/ops/hds/color"
        className={cn(
          'inline-flex items-center text-sm tracking-tight text-foreground',
          'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        HDS
      </Link>

      {/* Center — search input slot (9d-2: CommandPalette / Cmd-K) */}
      <div data-hds-slot="search" className="contents">
        <CommandPalette />
      </div>

      {/* Right cluster — theme toggle (9d-3) */}
      <div data-hds-slot="theme-toggle" className="inline-flex">
        <ThemeToggle />
      </div>
    </header>
  );
}

// ── Left rail ──────────────────────────────────────────────────────────────────

function DocShellLeftRail({ sections }: { sections: RailSection[] }) {
  return (
    <aside
      data-hds-component="DocShellLeftRail"
      aria-label="Documentation"
      className={cn(
        // tw-ok: viewport height minus 3rem topbar (Tailwind has no semantic for this)
        'sticky top-12 hidden h-[calc(100vh-3rem)] w-48 shrink-0 overflow-y-auto',
        'border-r border-border bg-background',
        'md:block',
      )}
    >
      <Stack as="nav" gap="spacious" className="px-4 py-6">
        {sections.map((section) => (
          <Stack key={section.id} gap="hairline">
            <p className={cn('px-2 text-xs uppercase tracking-wide text-muted-foreground')}>
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.links.length === 0 ? (
                <li className="px-2 text-xs text-muted-foreground">No items</li>
              ) : (
                section.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.to === '/ops/hds/color'}
                      className={({ isActive }) =>
                        cn(
                          'block rounded-md px-2 py-1 text-sm',
                          'text-muted-foreground hover:bg-muted hover:text-foreground',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive && 'bg-muted text-foreground',
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))
              )}
            </ul>
          </Stack>
        ))}
      </Stack>
    </aside>
  );
}

// ── Right rail (TOC placeholder for 9d-6) ──────────────────────────────────────

function DocShellRightRail() {
  // Read TOC state inside the provider — if the page hasn't registered any
  // H2/H3 anchors via HeadingAnchor, the rail collapses to zero width so
  // data-heavy doc pages (Color/Spacing token grids) keep their full content
  // column at common 1280–1440 widths. Pages opted into the TOC by wrapping
  // headings in HeadingAnchor get the sticky rail at lg (≥1024px).
  const { items } = useToc();
  if (items.length === 0) return null;
  return (
    <aside
      data-hds-component="DocShellRightRail"
      data-hds-slot="toc"
      className={cn(
        // tw-ok: viewport height minus 3rem topbar
        'sticky top-12 hidden h-[calc(100vh-3rem)] w-48 shrink-0 overflow-y-auto',
        'border-l border-border bg-background',
        // 9d-6: rail activates at 2xl (>=1536px). The unit spec asks for
        // sticky positioning ≥ 1024px, but existing data-heavy doc pages
        // (Color/Spacing token grids) overflow their content cells when the
        // 192px rail eats horizontal room at common 1280–1440 widths. The
        // batch refactor in 9d-9 retunes those pages; until then we keep
        // the rail at 2xl to avoid layout regressions. The TOC (scrollspy,
        // anchors, deep-link copy) is fully active at all widths through
        // HeadingAnchor — only the visible rail surface waits for 2xl.
        '2xl:block',
      )}
    >
      <DocTOC />
    </aside>
  );
}

// ── Shell root ─────────────────────────────────────────────────────────────────

export interface DocShellProps {
  /** Optional inline children — defaults to <Outlet /> for use as a route layout. */
  children?: React.ReactNode;
  /** Optional className escape hatch for the outermost wrapper. */
  className?: string;
}

export function DocShell({ children, className }: DocShellProps) {
  // Recompute on first render — manifest is a build-time static import so the
  // sections are stable across the session.
  // eslint-disable-next-line react-hooks/use-memo
  const sections = React.useMemo(buildRailSections, []);
  const location = useLocation();
  const content = children ?? <Outlet />;

  return (
    <div
      data-hds-component="DocShell"
      className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}
    >
      {/*
        9d-10 a11y: skip-link to main content. Visually hidden (sr-only)
        until keyboard focus, then promoted to a visible chip in the top-
        left corner so the first Tab from page load lands users directly
        on #hds-doc-shell-main, bypassing the sticky header + left rail.
      */}
      <a
        href="#hds-doc-shell-main"
        className={cn(
          'sr-only focus:not-sr-only',
          'focus:fixed focus:left-4 focus:top-4 focus:z-50',
          'focus:rounded-md focus:border focus:border-border focus:bg-background',
          'focus:px-3 focus:py-2 focus:text-sm focus:text-foreground',
          'focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring',
        )}
      >
        Skip to main content
      </a>
      <DocShellHeader />
      {/*
        TocProvider wraps both the content column and the right rail so the
        rail (DocShellRightRail) can read the same TOC items the content
        registers via HeadingAnchor. Keyed on route path so registered
        items reset between doc pages.
      */}
      <TocProvider key={location.pathname}>
        <div className="flex flex-1 items-stretch">
          <DocShellLeftRail sections={sections} />
          <main
            id="hds-doc-shell-main"
            data-hds-component="DocShellMain"
            tabIndex={-1}
            className={cn('min-w-0 flex-1 hds-focus')}
          >
            <EmbeddedDocLayoutProvider bottomSlot={null}>
              {/*
                Content column gets full available width. Doc pages set their
                own max-width via DocLayout / Container internally — the
                shell shouldn't double-clamp. Vertical rhythm comes from py-12.
              */}
              <div className="py-12">{content}</div>
            </EmbeddedDocLayoutProvider>
          </main>
          <DocShellRightRail />
        </div>
      </TocProvider>
    </div>
  );
}
