// ─────────────────────────────────────────────────────────────────────────────
// @hirobius/design-system — public API barrel
// ─────────────────────────────────────────────────────────────────────────────
// AUTO-COMPOSED from public/hds-manifest.json componentSpecs (tier in
// {primitive, pattern, template}). Re-exports every named export from each
// public component module via `export *`. Token bridge, cn helper, and the
// manifest are exposed as subpath exports — see package.json #exports.
//
// Validators, scripts, figma-agent-plugin sources, and other utility-tier
// modules are marked @internal and are NOT part of this surface.
//
// The modules in src/patterns.ts ship only from
// `@hirobius/design-system/patterns`; none of them is re-exported here. Until
// 0.20.0 the root also re-exported 21 of them behind `@deprecated` aliases
// (hds#254); hds#389 R1 removed those re-exports in that 0.x minor.
// `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath` moves consumer
// imports to the subpath (MIGRATIONS.md, "0.20.0 removals").
//
// The same release removed the six `Hds*` aliases (HdsCheckbox, HdsRadio,
// HdsSelect, HdsSlider, HdsToggle, HdsTooltip; hds#315). Each component is
// exported under its bare name only;
// `npx -p @hirobius/design-system@^0.20.0 hds-prefix` rewrites consumer code.
//
// 0.20.0 also removed 32 components with no survivor (hds#394 wave 4a: the
// three docs-shell templates, the nav and date-picker families, ContextMenu,
// HoverCard, ButtonGroup and more) and every root `*Variants` cva helper, which
// stays private to its module. MIGRATIONS.md lists each removed name.
// ─────────────────────────────────────────────────────────────────────────────

// Side-effect import: design system base styles (tokens + theme + utilities)
import './styles/index.css';

// ── primitives (36) ──
export * from './app/components/alert';
export * from './app/components/avatar';
export * from './app/components/badge';
export * from './app/components/box';
export * from './app/components/button';
export * from './app/components/callout';
export * from './app/components/field';
export * from './app/components/stat';
export * from './app/components/status-list-item';
export * from './app/components/card';
export * from './app/components/container';
export * from './app/components/dialog';
export * from './app/components/divider';
export * from './app/components/menu';
export * from './app/components/popover';
export * from './app/components/hds-tooltip';
export * from './app/components/grid';
export * from './app/components/icon';
export * from './app/components/inline-code';
export * from './app/components/inline-link';
export * from './app/components/input';
export * from './app/components/textarea';
export * from './app/components/checkbox';
export * from './app/components/radio';
export * from './app/components/slider';
export * from './app/components/toggle';
export * from './app/components/progress';
export * from './app/components/skeleton';
export * from './app/components/spinner';
export * from './app/components/segmented-control';
export * from './app/components/select';
export * from './app/components/stack';
export * from './app/components/surface';
export * from './app/components/table';
export * from './app/components/tag';
export * from './app/components/text';

// ── Astryx-gap coverage — Tier 1 native primitives (0.12.0) ──
export * from './app/components/kbd';
export * from './app/components/status-dot';
export * from './app/components/timestamp';
export * from './app/components/blockquote';
export * from './app/components/visually-hidden';
export * from './app/components/avatar-group';
export * from './app/components/input-group';
export * from './app/components/circular-progress';

// ── Astryx-gap coverage — Tier 1 Radix skins (0.12.0) ──
export * from './app/components/toggle-button';
export * from './app/components/aspect-ratio';
export * from './app/components/alert-dialog';

// ── Astryx-gap coverage — Tier 2 pattern layer (0.13.0) ──
export * from './app/components/metadata-list';
export * from './app/components/selectable-card';
export * from './app/components/multi-selector';

// ── Astryx-gap coverage — Tier 3 date/time family (ADR-020; the date pickers went in 0.20.0, ADR-033) ──
export * from './app/components/time-input';

// ── every-layout primitives (#96) ──
export * from './app/components/cluster';
export * from './app/components/center';
export * from './app/components/sidebar';
export * from './app/components/switcher';
export * from './app/components/cover';
export * from './app/components/frame';
export * from './app/components/bleed';
// Scroll-motion primitives — CSS scroll-driven, zero JS/deps (#116).
export * from './app/components/pin';

// ── app-shell + layout primitives consumed by the ops dashboard ──
export * from './app/components/empty-state';
export * from './app/components/not-found-pattern';
export * from './app/components/tabs';
export * from './app/components/tile-grid';
export * from './app/components/status-tile';

// ── patterns (6) ──
export * from './app/components/breadcrumb';
export * from './app/components/combobox';
export * from './app/components/disclosure';
export * from './app/components/icon-button';
export * from './app/components/pagination';
export * from './app/components/toast';

// No template ships from the root: CaseStudyLayout, HdsSystemDocLayout and
// HdsDocsShell were removed in 0.20.0 (hds#394).
// NOTE: ComponentDocPage and HdsSpecimenBlock are intentionally NOT part of the
// published surface — they are docs-shell renderers that pull the entire
// component preview universe (import.meta.glob over every component + lab module,
// and the token-audit/component-api artifacts) into the library bundle. They remain available to the in-repo doc site via direct import.
// InfoPage was removed (dead-portfolio scaffolding, hardcoded the deleted
// /assets/adrian.webp; 0 DS-consumer use) — see CHANGELOG / changeset.

// ── Token bridge (CSS variables wrapped as TS constants + raw DTCG JSON) ──
export { default as hds } from './app/design-system/tokens';
// Re-export the raw DTCG tokens via a typed const (not a direct JSON re-export)
// so the emitted .d.ts INLINES the token shape instead of importing
// `../hirobius.tokens.json` — that path doesn't exist under dist/types in the
// published package (attw InternalResolutionError). Runtime is unchanged: vite
// inlines the JSON into the bundle.
import tokensJson from '../hirobius.tokens.json';
/** Raw DTCG design tokens (the contents of `hirobius.tokens.json`). */
export const tokens = tokensJson;

// ── cn() class-name helper (clsx + tailwind-merge) ──
export { cn } from './lib/utils';

// ── Theming contract (framework-agnostic data-* dials; zero-JS compatible) ──
export { HdsThemeProvider, useHdsTheme } from './app/context/hds-theme';
export type {
  HdsTheme,
  HdsDensity,
  HdsThemeValue,
  HdsThemeProviderProps,
} from './app/context/hds-theme';

// ── Router adapter seam (router-free by default; inject your router once) ──
export { HdsRouterProvider, useHdsRouter } from './app/context/RouterContext';
export type {
  HdsRouterAdapter,
  HdsRouterProviderProps,
  HdsLinkComponent,
  HdsLinkProps,
  HdsNavigateOptions,
} from './app/context/RouterContext';
