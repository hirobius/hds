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
// ─────────────────────────────────────────────────────────────────────────────

// Side-effect import: design system base styles (tokens + theme + utilities)
import './styles/index.css';

// ── primitives (29) ──
export * from './app/components/alert';
export * from './app/components/asset-img';
export * from './app/components/avatar';
export * from './app/components/badge';
export * from './app/components/button';
export * from './app/components/callout';
export * from './app/components/field';
export * from './app/components/stat';
export * from './app/components/status-list-item';
export * from './app/components/card';
export * from './app/components/cinematic-link';
export * from './app/components/code-block';
export * from './app/components/component-instance-matrix';
export * from './app/components/container';
export * from './app/components/dialog';
export * from './app/components/divider';
export * from './app/components/menu';
export * from './app/components/popover';
export * from './app/components/hds-tooltip';
export * from './app/components/doc-link-card';
export * from './app/components/grid';
export * from './app/components/heading-stack';
export * from './app/components/history-card';
export * from './app/components/icon';
export * from './app/components/inline-code';
export * from './app/components/inline-link';
export * from './app/components/input';
export * from './app/components/textarea';
export * from './app/components/checkbox';
export * from './app/components/radio';
export * from './app/components/slider';
export * from './app/components/toggle';
export * from './app/components/nav-item';
export * from './app/components/progress';
export * from './app/components/skeleton';
export * from './app/components/spinner';
export * from './app/components/segmented-control';
export * from './app/components/stack';
export * from './app/components/surface';
export * from './app/components/table';
export * from './app/components/tag';
export * from './app/components/text';
export * from './app/components/token';

// ── Astryx-gap coverage — Tier 1 native primitives (0.12.0) ──
export * from './app/components/kbd';
export * from './app/components/status-dot';
export * from './app/components/timestamp';
export * from './app/components/blockquote';
export * from './app/components/visually-hidden';
export * from './app/components/avatar-group';
export * from './app/components/button-group';
export * from './app/components/input-group';
export * from './app/components/circular-progress';

// ── Astryx-gap coverage — Tier 1 Radix skins (0.12.0) ──
export * from './app/components/hds-toggle-button';
export * from './app/components/hds-aspect-ratio';
export * from './app/components/hds-alert-dialog';
export * from './app/components/hds-hover-card';
export * from './app/components/hds-context-menu';

// ── Astryx-gap coverage — promoted internals (0.12.0) ──
export * from './app/components/side-nav';
export * from './app/components/command-palette';
export * from './app/components/image-lightbox';

// ── Astryx-gap coverage — Tier 2 pattern layer (0.13.0) ──
export * from './app/components/metadata-list';
export * from './app/components/overflow-list';
export * from './app/components/top-nav';
export * from './app/components/app-shell';
export * from './app/components/selectable-card';
export * from './app/components/tokenizer';
export * from './app/components/file-input';
export * from './app/components/hds-multi-selector';
export * from './app/components/toolbar';
export * from './app/components/tree-list';
export * from './app/components/stepper';
export * from './app/components/carousel';

// ── app-shell + layout primitives consumed by the ops dashboard ──
export * from './app/components/page';
export * from './app/components/empty-state';
export * from './app/components/error-boundary';
export * from './app/components/not-found-pattern';
export * from './app/components/tabs';
export * from './app/components/tile-grid';
export * from './app/components/status-tile';

// ── patterns (8) ──
export * from './app/components/activity-feed';
export * from './app/components/breadcrumb';
export * from './app/components/combobox';
export * from './app/components/disclosure';
export * from './app/components/form';
export * from './app/components/foundation-swatch';
export * from './app/components/icon-button';
export * from './app/components/nav-group';
export * from './app/components/pagination';
export * from './app/components/sketch';
export * from './app/components/stepper-field';
export * from './app/components/text-lockup';
export * from './app/components/toast';

// ── templates (4) ──
// NOTE: ComponentDocPage and HdsSpecimenBlock are intentionally NOT part of the
// published surface — they are docs-shell renderers that pull the entire
// component preview universe (import.meta.glob over every component + lab module,
// the 3D mobius-scene chunk, and the token-audit/component-api artifacts) into the
// library bundle. They remain available to the in-repo doc site via direct import.
export * from './app/layouts/CaseStudyLayout';
export * from './app/components/error-pattern';
export * from './app/components/info-page';
export * from './app/pages/hds/HdsSystemDocLayout';

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
