import { CircleCheck, Info, TriangleAlert as WarningCircle } from 'lucide-react';
import hds from '../design-system/tokens';

export type AuditSeverity = 'fixed' | 'medium' | 'note' | 'added';
export type RuleType = 'do' | 'dont';

export const AUDIT_LOG: Array<{ date: string; sev: AuditSeverity; item: string }> = [
  { date: '2026-04', sev: 'added', item: 'Docs typography usage formalized around the body and caption entries on the core type ramp so explanatory prose, notes, and captions can stop borrowing the mono stack or ad hoc body styles.' },
  { date: '2026-04', sev: 'added', item: 'Semantic mapping audit introduced as a report-first governance layer. Components and docs pages now get scored for direct primitive leaks, semantic space aliases were added for component/layout/section/sidebar usage, and sidebar typography aliases now own the nav / TOC voice.' },
  { date: '2026-05', sev: 'added', item: 'HDS iconography migrated to Lucide React. All Phosphor imports replaced; Icon wrapper ported; @phosphor-icons/react dependency dropped. Lucide is now the canonical icon library.' },
  { date: '2026-03', sev: 'added', item: 'Motion foundations restructured around semantic intents. semantic.motion now carries productive, expressive, spatial, and exit behavior; docs and shared components consume hds.motion.* instead of binding directly to raw timing names.' },
  { date: '2026-03', sev: 'fixed', item: 'Legacy WorkGallery/Lightbox shell removed from the live codebase. Layout cleanup now tracks only active page gutters, shell section pads, panel gaps, and document layout roles instead of gallery-only strip offsets.' },
  { date: '2026-03', sev: 'fixed', item: 'Font primitive audit confirmed the current semantic typography set uses every defined size, weight, lineHeight, and letterSpacing step. Shared page gutters, shell section pads, and panel gaps were promoted into semantic.layout, while dead runtime-only layout helpers were removed from the token bridge.' },
  { date: '2026-03', sev: 'added', item: 'Component documentation gate tightened: scripts/check-component-docs.mjs now treats every top-level shared React component in src/app/components/*.tsx as doc-required by default, supports explicit @doc-exempt reasons for true internals, and runs inside the fast pre-commit lane so undocumented components cannot be quietly closed out.' },
  { date: '2026-03', sev: 'added', item: 'TokenDisplayToggle now shares the segmented-control visual language and uses TokenDisplayProvider as the state source for token name / CSS var switching inside token anatomy surfaces. Documented in Components > Actions.' },
  { date: '2026-03', sev: 'added', item: 'Primitive z layers were added as a sparse stacking scale (primitive.zIndex.0 / 10 / 100 / 1000) so focused controls, overlays, and global modals can stop using ad hoc z-index overrides. The shared segmented control now lifts focused segments onto the focus layer.' },
  { date: '2026-03', sev: 'added', item: 'Component inventory tightened: shared navigation docs now focus on reusable links/cards while the shell footer pager is treated as layout-specific button composition. InlineCode remains documented under Display, and the Components index reflects the shared pieces actually owned by src/app/components/.' },
  { date: '2026-03', sev: 'added', item: 'DocLinkCard was promoted into src/app/components/ and documented in HDS Navigation. Replaced page-local editorial CTA/resource cards and summary asides across the shell-native portfolio pages so navigation cards now have canonical system ownership and the remaining summary copy leans on existing doc primitives.' },
  { date: '2026-03', sev: 'added', item: 'ControlsPanel + ControlsSection extracted as the shared inspector-style control surface composition for sketches. Input ownership stays with HdsSlider/HdsToggle/HdsSelect/HdsRadio, while the new pattern owns panel chrome, section grouping, and sidebar/stacked placement. Light documentation added under the HDS doc utilities section.' },
  { date: '2026-03', sev: 'added', item: 'Token compliance auditor added (scripts/audit-components.mjs). Scans all HDS components for hardcoded hex colors, rgba strings, transparency helper values, and unlicensed border-radius values. Run via pnpm tokens:audit. Zero violations required before any component is marked shipped.' },
  { date: '2026-03', sev: 'added', item: 'Four new HDS components shipped (all token-compliant): Tag (component.tag.*), Card (component.card.*), Divider (semantic.color.border.*), Input (component.input.*). All documented across the HDS component family pages with live demos and token tables.' },
  { date: '2026-03', sev: 'fixed', item: 'Primitive transparency scale retired from hirobius.tokens.json. Solid semantic content roles and solid surface helpers now cover the old text, subdued, faint, rule, separator, hover, prominent, and disabled cases without a standalone fade family.' },
  { date: '2026-03', sev: 'fixed', item: 'Pre-existing token violations patched: NavBar fade moved to solid semantic content colors, Lightbox color #aaa -> var(--semantic-color-content-secondary), AssetImg rgba hardcoded channels -> var(--semantic-color-content-secondary), ComponentPreview default bgColor #f9fafb -> var(--semantic-color-surface-raised).' },
  { date: '2026-03', sev: 'fixed', item: 'W3C/Figma token format: primitive colors converted to hex strings; responsive clamp() moved to theme.css overrides; $extensions namespace updated to com.figma.variables.modes for native Figma import compatibility.' },
  { date: '2026-03', sev: 'fixed', item: 'Token pipeline verifier added (scripts/verify-tokens.mjs). Checks all 216 tokens: CSS var existence, upstream aliasing, broken alias targets, orphaned vars, TS references. Run via pnpm tokens:verify.' },
  { date: '2026-03', sev: 'fixed', item: 'Shadow and layout primitives were normalized into explicit namespaces (primitive.shadow.*, primitive.breakpoint.*, primitive.size.*, primitive.grid.*). Semantic/component tokens now alias upstream - no inline raw values anywhere in the system.' },
  { date: '2026-03', sev: 'fixed', item: 'Primary type ramp updated: base size 13px -> 16px. All type styles reanchored. Display styles use clamp() for fluid responsive scaling (48-80px displayXl).' },
  { date: '2026-03', sev: 'fixed', item: 'Full token migration (phase 2a + 2b): all portfolio pages and shared components replaced hardcoded Tailwind color classes with HDS semantic tokens. Zero hardcoded hex values in component layer.' },
  { date: '2026-03', sev: 'fixed', item: 'Hardcoded arbitrary spacing, colours, and typography removed across doc layer + WorkGallery. Strict HDS token compliance enforced.' },
  { date: '2026-03', sev: 'fixed', item: 'ct() moved from DocSections to design-system/theme.ts - decoupled from doc layer.' },
  { date: '2026-03', sev: 'fixed', item: 'ThemeContext: prefers-color-scheme detection, localStorage persistence, data-theme + .dark sync.' },
  { date: '2026-03', sev: 'fixed', item: 'theme.css: full --hds-* CSS variable layer created - motion tokens now usable in @keyframes.' },
  { date: '2026-03', sev: 'fixed', item: 'Space scale renamed to explicit px aliases (hds.space.px16 = 16px) - no Tailwind collision.' },
  { date: '2026-03', sev: 'fixed', item: 'Content and disabled treatments were remapped to solid semantic color roles so the docs and runtime surfaces read from the same color system instead of a separate transparency scale.' },
  { date: '2026-03', sev: 'fixed', item: 'hds.fontFamily token added; hardcoded font-family strings replaced in Root + HDSLayout.' },
  { date: '2026-03', sev: 'fixed', item: 'HdsButton focus ring fixed: uses the semantic accent token instead of an undefined Tailwind class.' },
  { date: '2026-03', sev: 'fixed', item: 'MUI (@mui/material + @emotion) removed - unused dependency, ~800KB bundle reduction.' },
  { date: '2026-03', sev: 'fixed', item: 'InfoPage refactored to use ct() - eliminates manual rgba() reimplementation.' },
  { date: '2026-03', sev: 'fixed', item: 'Ecommerce token architecture added: zIndex, shadow, breakpoint, borderWidth, animation, price, badge.' },
  { date: '2026-03', sev: 'fixed', item: 'Tooltip + text removed - label prop handles copy.' },
  { date: '2026-03', sev: 'fixed', item: '2xs size step removed; xs bumped to 10px. Ramp: 10/12/14/18/22.' },
  { date: '2026-03', sev: 'fixed', item: 'Surface palette updated to steel blue-grey (dark) / very light grey (light).' },
  { date: '2026-03', sev: 'fixed', item: '11-step accent ramp added (#EEF0FF -> #040B33), anchored at 500 = brand.' },
  { date: '2026-03', sev: 'fixed', item: 'HdsButton component extracted - tertiary / surface / primary variants.' },
  { date: '2026-03', sev: 'fixed', item: 'AssetImg family (3 variants) consolidated into a single component driven by a context prop.' },
  { date: '2026-05', sev: 'fixed', item: 'Typography stack migrated to Clash Grotesk (body / UI) + Clash Display (display, h1, h2, h3 headings) + Geist Mono (code / technical). Self-hosted woff2 in /public/fonts; Atkinson Hyperlegible references swept across docs, manifest, registry, and tenant configs.' },
  { date: '2026-01', sev: 'note', item: 'HDS_DOC_ENABLED flag makes the documentation page detachable from production builds.' },
  { date: '2026-01', sev: 'fixed', item: 'Badge component created and placed into src/app/components/Badge.tsx' },
  { date: '2026-03', sev: 'added', item: 'Badge display primitive restored as a real shared component in src/app/components/Badge.tsx, documented under Components > Display, and adopted for Cloth Simulation tech metadata so short labels no longer drift as page-local spans.' },
  { date: '2026-03', sev: 'added', item: 'Lab experiment infrastructure shipped: SketchbookShell (HDS chrome with prev/next nav via IconButton, controls sidebar), SketchErrorBoundary, ParticleTunnelPage (brand-color-mapped via CSS var->HSL resolution), sketches.ts registry. Lazy-loaded per sketch via React.lazy.' },
  { date: '2026-03', sev: 'added', item: 'HdsSlider, HdsToggle, HdsSelect promoted to first-class HDS components (src/app/components/Controls.tsx). Previously LabSlider/Toggle/Select - Lab prefix removed. Documented in Components > Inputs. All token-compliant; dark mode select fixed via colorScheme + JS token values.' },
  { date: '2026-03', sev: 'added', item: 'HdsRadio added as the shared single-choice control in src/app/components/Controls.tsx. Documented in Components > Inputs with a 5-state demo matrix and primary rest label styling.' },
  { date: '2026-03', sev: 'added', item: 'SegmentedControl extracted as its own shared HDS primitive in src/app/components/SegmentedControl.tsx and documented in Components > Inputs. This now owns the repeated mode-switch pattern across sketchbook scenes instead of each canvas experiment shipping its own bespoke button row.' },
  { date: '2026-03', sev: 'added', item: 'HDS nav restructured: Components split into 6 validated subcategory pages (Actions, Inputs, Display, Media, Navigation, Layout) plus a doc utilities section at /hds/components/doc-utilities with acceptance criteria. Validated against Material Design, Ant Design, Radix UI, Chakra UI.' },
  { date: '2026-03', sev: 'added', item: 'audit-components.mjs extended with 3 new violation classes: raw pixel numbers in dimension style props, template literal spacing shorthands, raw transition durations. JSX comment exemptions (/* audit-ok */) now supported. Self-healing policy documented: new violation classes must be added to script in same commit as fix.' },
  { date: '2026-03', sev: 'added', item: 'ComponentBlock + Table promoted to shared HDS doc primitives - reused across component sub-pages without duplication. check-component-docs.mjs updated to scan all sub-pages + DocSections; dual detection via import path or ComponentBlock name string.' },
  { date: '2026-03', sev: 'added', item: 'Stack layout primitive added (src/app/components/Stack.tsx). SpaceKey type enforces gap values from hds.space.* - impossible to pass an arbitrary number. Documented in Components > Layout alongside Divider.' },
  { date: '2026-03', sev: 'fixed', item: 'Badge blue variant migrated from stale JS token refs to the blue ramp helpers. useTheme isDark conditional preserved since the brand ramp itself is static and dark mode is handled through semantic aliasing.' },
  { date: '2026-03', sev: 'added', item: 'Alert component shipped (src/app/components/Alert.tsx). 4 variants: success/error/warning/info. Consumes --hds-feedback-* CSS vars (all light/dark-aware in theme.css). Icon-led with optional title + dismiss. color-mix() for tinted backgrounds. Documented in Components > Display.' },
  { date: '2026-03', sev: 'added', item: 'prefers-reduced-motion support added. Layer 1: @media (prefers-reduced-motion: reduce) in theme.css zeroes the primitive duration tokens plus --hds-motion-* duration vars. Layer 2: <MotionConfig reducedMotion="user"> in Root.tsx collapses all motion/react animations. Inspired by IBM Carbon, Apple HIG, Adobe Spectrum.' },
  { date: '2026-03', sev: 'added', item: 'Script pipeline expanded from 7 to 11 checks. New gates: check-reduced-motion (prefers-reduced-motion coverage), check-aria-labels (img alt + SVG aria attrs), check-semantic-html (links navigate/buttons act), check-ref-forwarding (form controls expose DOM node). Inspired by Radix UI, GitHub Primer, Shopify Polaris, IBM Carbon.' },
  { date: '2026-03', sev: 'fixed', item: 'Icon.tsx: aria-hidden={true} added as default prop - Lucide SVGs were being read by screen readers without accessible names. All icons in HDS are decorative (always inside labeled parents). Fix inspired by Radix UI accessible-by-default principle.' },
  { date: '2026-03', sev: 'fixed', item: 'forwardRef added to Input, HdsSlider, HdsToggle, HdsSelect - form controls now expose their underlying DOM node. Enables React Hook Form, Formik, and focus management integration. Inspired by Shopify Polaris composability principle.' },
  { date: '2026-03', sev: 'added', item: 'Blue token taxonomy normalized. The original blue ramp now stores the OKLCH primitive values, while semantic.accent.* owns interaction meaning (rest, hover, pressed, inactive, disabled, text, text-hover, subtle). Theme-layer accent helpers were reduced so governed code resolves directly through semantic token vars.' },
  { date: '2026-03', sev: 'added', item: 'Derived feedback backgrounds now live at the semantic tier as solid color values. Primitive ramps keep only solid swatches, while semantic.color.feedback.bg.* owns the background treatment for error, success, and warning backgrounds.' },
  { date: '2026-03', sev: 'added', item: 'Brand color confirmed at #1E2EFD (blue.500). The separate primitive.color.accent family was removed so intent-bearing naming stays inside the original blue slots and the semantic tier.' },
  { date: '2026-03', sev: 'fixed', item: 'HdsButton rewritten - removed isDark/th/base/o rgba() construction. Fills now resolve through the semantic accent and surface tokens instead of helper aliases. isDark deprecated (optional, ignored internally). surface.thumbnail retired in favor of surface.raised.' },
  { date: '2026-03', sev: 'fixed', item: 'Alert.tsx color-mix() backgrounds replaced with --hds-feedback-*-bg precomputed rgba vars (Baseline 2020). verify-tokens.mjs updated to permit oklch() as valid semantic token values alongside var() aliases.' },
  { date: '2026-03', sev: 'added', item: 'Token unified as the shared token surface (node and diagram variants). The legacy TokenNode wrapper was removed, and the diagram plus explorer list visuals now share the same shell and selection rhythm through Token itself. Both declare data-hds-component="token" as an HDS boundary so the Token Inspector scanner exempts inline typography from uninventoried violations. Documented in Components > Display.' },
];

export function AuditSeverityIcon({ sev, isDark }: { sev: AuditSeverity; isDark: boolean }) {
  void isDark;
  if (sev === 'fixed') return <CircleCheck size={hds.iconSize.small} color="var(--semantic-color-feedback-success)" />;
  if (sev === 'medium') return <WarningCircle size={hds.iconSize.small} color="var(--semantic-color-feedback-warning)" />;
  return <Info size={hds.iconSize.small} color={sev === 'added' ? 'var(--semantic-color-content-accent)' : 'var(--semantic-color-content-secondary)'} />;
}

export function auditSevLabel(sev: AuditSeverity) {
  return sev === 'fixed' ? 'FIXED' : sev === 'medium' ? 'MEDIUM' : sev === 'added' ? 'ADDED' : 'NOTE';
}

export function auditSevColor(sev: AuditSeverity) {
  return sev === 'fixed'
    ? 'var(--semantic-color-content-primary)'
    : sev === 'medium'
      ? 'var(--semantic-color-feedback-warning)'
      : sev === 'added'
        ? 'var(--semantic-color-content-accent)'
        : 'var(--semantic-color-content-secondary)';
}

export const GUIDANCE_DATA: Array<{
  group: string;
  rules: Array<{ type: RuleType; rule: string }>;
}> = [
  {
    group: 'Typography',
    rules: [
      { type: 'do', rule: 'Use caption (13px) for tags, badges, annotation pills, and all secondary meta.' },
      { type: 'dont', rule: 'Never apply tight tracking (-0.01em) to body, label, or caption - reserved for display headings only.' },
      { type: 'do', rule: 'Use display (22px) at most once per panel - for the section title only.' },
      { type: 'dont', rule: 'Do not override font sizes with raw px values - always use hds.fontSize.* tokens.' },
    ],
  },
  {
    group: 'Color',
    rules: [
      { type: 'do', rule: 'Import ct() from design-system/theme and resolve all colours at runtime - never hardcode rgba() or hex in components.' },
      { type: 'dont', rule: 'Do not use var(--semantic-color-surface-raised) for text - it is a surface fill and fails WCAG AA contrast.' },
      { type: 'do', rule: 'Use var(--semantic-color-content-secondary) for secondary text (38-42%) and var(--semantic-color-content-disabled) for placeholder / tertiary text (24-26%).' },
      { type: 'dont', rule: 'Do not use var(--semantic-color-content-disabled) or var(--semantic-color-surface-raised) as text colour - only var(--semantic-color-content-primary) and var(--semantic-color-content-secondary) are WCAG AA safe for readable content.' },
    ],
  },
  {
    group: 'Spacing',
    rules: [
      { type: 'do', rule: 'Use hds.space.px* for all gaps, paddings, and margins - keys are self-documenting (hds.space.px16 = 16px).' },
      { type: 'dont', rule: 'Do not inline raw pixel strings - if the value is genuinely new, add a token first.' },
      { type: 'do', rule: 'Use hds.layout.* for responsive, viewport-aware spacing regions (gutters, section pads).' },
      { type: 'dont', rule: 'Do not confuse hds.space keys with Tailwind - hds.space.px16 = 16px, Tailwind p-16 = 64px.' },
    ],
  },
  {
    group: 'Accessibility',
    rules: [
      { type: 'do', rule: 'Provide aria-label on all icon-only buttons and interactive elements without visible text.' },
      { type: 'do', rule: 'Use focus-visible (not focus) for keyboard focus ring styling.' },
      { type: 'dont', rule: 'Do not suppress focus outlines - keyboard users require a visible indicator at all times.' },
      { type: 'do', rule: 'Ensure all interactive text meets WCAG AA 4.5:1 contrast - var(--semantic-color-content-secondary) is the minimum safe secondary content color.' },
    ],
  },
];
