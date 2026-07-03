# Exception Audit Report

## Summary

| Category | Count | Justified | Untriaged |
|----------|-------|-----------|----------|
| eslint-disable | 53 | 53 | 0 |
| @ts-ignore/@ts-expect-error | 6 | 6 | 0 |
| custom-sentinels (*-ok / hds-bypass) | 120 | 120 | 0 |
| **Total** | **179** | **179** | **0** |

## eslint-disable

| File | Line | Rule | Reason | Status |
|------|------|------|--------|--------|
| `src/app/components/CascadeText.tsx` | 29 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/ComponentDocPage.tsx` | 234 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/ComponentDocPage.tsx` | 336 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/alert.tsx` | 22 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven gap/padding/radius; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/animated-label.tsx` | 54 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- compound transition list; no Tailwind utility covers multi-prop animation` | justified |
| `src/app/components/asset-img.tsx` | 96 | `eslint-disable-next-line` | `jsx-a11y/no-noninteractive-element-interactions` | justified |
| `src/app/components/badge.tsx` | 15 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- component-badge-* sizing tokens, the intentional 11px chip size, and the neutral 4% overlay have no Tailwind-theme utility; var()-based so still token-driven` | justified |
| `src/app/components/button.tsx` | 17 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- compound transition list; Tailwind has no single utility for transition-[colors,filter]` | justified |
| `src/app/components/callout.tsx` | 19 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven padding + accent/surface vars have no Tailwind-theme utility` | justified |
| `src/app/components/code-block.tsx` | 6 | `eslint-disable*` | `jsx-a11y/no-noninteractive-tabindex -- scrollable code region requires tabIndex for keyboard navigation` | justified |
| `src/app/components/combobox.tsx` | 151 | `eslint-disable-next-line` | `jsx-a11y/no-autofocus -- combobox search field is the expected focus target on open` | justified |
| `src/app/components/command-palette.tsx` | 130 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- 10px is the standard shadcn cmd-palette kbd metadata size` | justified |
| `src/app/components/command-palette.tsx` | 132 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- kbd shortcut hint` | justified |
| `src/app/components/command-palette.tsx` | 136 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- kbd shortcut hint` | justified |
| `src/app/components/command-palette.tsx` | 158 | `eslint-disable-next-line` | `jsx-a11y/no-autofocus` | justified |
| `src/app/components/command-palette.tsx` | 179 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- dialog results scroll cap at 60% viewport height` | justified |
| `src/app/components/command-palette.tsx` | 233 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- footer hint metadata size` | justified |
| `src/app/components/componentPreviewRegistry.tsx` | 487 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/doc-page-header.tsx` | 272 | `eslint-disable-next-line` | `react-hooks/refs -- `ref` is a string prop (git branch), not a React ref` | justified |
| `src/app/components/doc-toc.tsx` | 48 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/hds-tooltip.tsx` | 63 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- inverse-surface fill matches the bubble; var()-based` | justified |
| `src/app/components/health-rail.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/history-card.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/lab/legacy-token-detail.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/morph-card.tsx` | 220 | `eslint-disable-next-line` | `react-hooks/exhaustive-deps -- buildPath and render are stable arrow fns; adding them would re-mount observer on every render` | justified |
| `src/app/components/morph-card.tsx` | 373 | `eslint-disable-next-line` | `react-hooks/exhaustive-deps -- render is stable; re-running on render identity change is unnecessary` | justified |
| `src/app/components/nav-group.tsx` | 65 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/preview-frame.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/components/shell-controls.tsx` | 151 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/stepper-field.tsx` | 59 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/components/surface.tsx` | 36 | `eslint-disable-next-line` | `tailwindcss/no-arbitrary-value -- token-driven radius/padding/elevation; var()-based, no Tailwind-theme utility exists` | justified |
| `src/app/components/tile-grid.tsx` | 35 | `eslint-disable-next-line` | `no-restricted-syntax -- TileGrid IS the grid primitive; auto-fill template is its raison d'être` | justified |
| `src/app/context/__tests__/context.test.tsx` | 18 | `eslint-disable-next-line` | `@typescript-eslint/no-explicit-any` | justified |
| `src/app/pages/hds/HDSLayout.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/pages/hds/HDSLayout.tsx` | 399 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/HDSLayout.tsx` | 850 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/HDSLayout.tsx` | 883 | `eslint-disable-next-line` | `react-hooks/exhaustive-deps` | justified |
| `src/app/pages/hds/HdsDocPrimitives.tsx` | 182 | `eslint-disable-next-line` | `jsx-a11y/no-noninteractive-tabindex` | justified |
| `src/app/pages/hds/HdsDocPrimitives.tsx` | 216 | `eslint-disable-next-line` | `@typescript-eslint/no-unused-vars` | justified |
| `src/app/pages/hds/HdsDocPrimitives.tsx` | 506 | `eslint-disable-next-line` | `react-hooks/exhaustive-deps` | justified |
| `src/app/pages/hds/HdsDocPrimitives.tsx` | 596 | `eslint-disable-next-line` | `@typescript-eslint/no-unused-vars` | justified |
| `src/app/pages/hds/HdsTocContext.tsx` | 116 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/LegacyTokenExplorerPanel.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/pages/hds/LegacyTokenExplorerPanel.tsx` | 221 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/LegacyTokenExplorerPanel.tsx` | 229 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/LegacyTokenExplorerPanel.tsx` | 238 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/LegacyTokenExplorerPanel.tsx` | 255 | `eslint-disable-next-line` | `react-hooks/set-state-in-effect` | justified |
| `src/app/pages/hds/LegacyTokenExplorerPanel.tsx` | 265 | `eslint-disable-next-line` | `react-hooks/exhaustive-deps` | justified |
| `src/app/pages/hds/TokensPage.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/app/pages/hds/components/IconGallery.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |
| `src/stories/field.stories.tsx` | 111 | `eslint-disable-next-line` | `no-restricted-syntax -- story demo: a raw grid is the point of the layout showcase` | justified |
| `src/stories/status-tile.stories.tsx` | 113 | `eslint-disable-next-line` | `no-restricted-syntax -- story demo: a raw 2-col grid is the dashboard layout being shown` | justified |
| `src/stories/surface.stories.tsx` | 1 | `eslint-disable*` | `no-restricted-syntax` | justified |

## @ts-ignore/@ts-expect-error

| File | Line | Rule | Reason | Status |
|------|------|------|--------|--------|
| `src/app/components/combobox.test.tsx` | 13 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix/Floating-UI.` | justified |
| `src/app/components/menu.test.tsx` | 13 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix/Floating-UI.` | justified |
| `src/app/components/popover.test.tsx` | 13 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix/Floating-UI.` | justified |
| `src/app/components/toast.test.tsx` | 12 | `@ts-expect-error` | `— minimal jsdom polyfills for Radix Toast.` | justified |
| `src/app/components/toast.test.tsx` | 19 | `@ts-expect-error` | `— partial matchMedia stub.` | justified |
| `src/app/data/nav-model.test.ts` | 11 | `@ts-expect-error` | `— .mjs generator without type declarations; runtime import is fine.` | justified |

## custom-sentinels (*-ok / hds-bypass)

| File | Line | Rule | Reason | Status |
|------|------|------|--------|--------|
| `src/app/App.tsx` | 20 | `spacing-ok` | `error boundary fallback, not a UI component */}` | justified |
| `src/app/components/CascadeText.tsx` | 76 | `audit-ok` | `orchestrated stagger — custom cubic-bezier + computed per-char delay; semantic motion tokens do not cover this easing curve` | justified |
| `src/app/components/card.tsx` | 304 | `hds-bypass` | `INLINE_THIN_BAR — Card.Progress IS the progress bar primitive; height + token-bg is its raison d'être */` | justified |
| `src/app/components/componentPreviewRegistry.tsx` | 43 | `audit-ok` | `responsive container dimension derived from grid layout, not token-backed` | justified |
| `src/app/components/componentPreviewRegistry.tsx` | 56 | `audit-ok` | `responsive container dimension derived from grid layout, not token-backed` | justified |
| `src/app/components/disclosure.tsx` | 147 | `audit-ok` | `hds-focus applied via triggerClassName variable` | justified |
| `src/app/components/doc-sections.tsx` | 593 | `audit-ok` | `interactive demo area — fixed visual height, not a spacing/layout token` | justified |
| `src/app/components/foundation-swatch.tsx` | 158 | `hds-bypass` | `fixed specimen height keeps foundation swatches visually comparable across token demos` | justified |
| `src/app/components/image-lightbox.tsx` | 105 | `audit-ok` | `Radix Dialog.Content container (tabIndex=-1, auto-focused on open). The dialog surface intentionally shows no focus ring; the visible focus affordance is the Close button (Button → hds-focus).` | justified |
| `src/app/components/morph-card.tsx` | 434 | `audit-ok` | `SVG fill transition — no token maps to 0.35s; hds.motion.productive.duration(0.15) is too fast for a color fill sweep` | justified |
| `src/app/components/nav-item.tsx` | 264 | `audit-ok` | `hds-focus applied via mergedClassName` | justified |
| `src/app/components/nav-item.tsx` | 285 | `audit-ok` | `hds-focus applied via mergedClassName` | justified |
| `src/app/components/side-nav.tsx` | 218 | `audit-ok` | `hds-focus applied via className` | justified |
| `src/app/components/side-nav.tsx` | 234 | `audit-ok` | `hds-focus applied via className` | justified |
| `src/app/components/sketch-controls.tsx` | 29 | `audit-ok` | `hds-focus applied via textarea className` | justified |
| `src/app/components/stacked-card-rail.tsx` | 54 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 66 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 67 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 83 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 126 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 127 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 168 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 169 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 174 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/stacked-card-rail.tsx` | 175 | `audit-ok` | `percentage fill in CSS template */` | justified |
| `src/app/components/surface.tsx` | 43 | `spacing-ok` | `16px/24px are the surface's fixed inset contract (not layout spacing); kept as the legacy values these named options have always resolved to` | justified |
| `src/app/components/text-lockup.tsx` | 9 | `font-ok` | `inline technical affordances within this lockup intentionally use monospace for code-like references` | justified |
| `src/app/data/hdsEditorial.tsx` | 55 | `audit-ok` | `*/) now supported. Self-healing policy documented: new violation classes must be added to script in same commit as fix.' },` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 1 | `hds-bypass` | `BG_WHITE_BLACK, INLINE_STRUCTURAL_BORDER — foundation color doc: WCAG_PAIRINGS holds intentional raw #fff/#000 literals for contrast-ratio math (data, not CSS color props); the 16px swatch chip carries a 1px subdued border for edge definition against same-tone surfaces */` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 179 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 181 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 185 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 187 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 191 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 193 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 197 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 199 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 203 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 205 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 209 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 211 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 215 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 217 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 221 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 223 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 227 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 229 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 233 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/ColorPage.tsx` | 235 | `audit-ok` | `token value showcase` | justified |
| `src/app/pages/hds/HDSLayout.tsx` | 1255 | `audit-ok` | `main is tabIndex={-1} — programmatic skip-link target only, never receives keyboard Tab focus` | justified |
| `src/app/pages/hds/HdsDocPrimitives.tsx` | 50 | `hds-bypass` | `primitive documentation */` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 1 | `hds-bypass` | `BG_WHITE_BLACK, DATA_TENANT, INLINE_STRUCTURAL_BORDER */` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 86 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 87 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 88 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 89 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 90 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 91 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 92 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 93 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 94 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 95 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 96 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 97 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 98 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 99 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 100 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 101 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 112 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 113 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 114 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 115 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 116 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 117 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 118 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 119 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 120 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 121 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 122 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 123 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 124 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 125 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 126 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/MultiBrandThemingPage.tsx` | 127 | `audit-ok` | `brand palette demo content` | justified |
| `src/app/pages/hds/SandboxPage.tsx` | 372 | `font-ok` | `sandbox error fallback intentionally uses raw monospace so registry diagnostics render even when the design-system context is unavailable` | justified |
| `src/app/pages/hds/SandboxPage.tsx` | 375 | `spacing-ok` | `error-fallback when hds context unavailable — raw 24px preserves diagnostic legibility` | justified |
| `src/app/pages/hds/SpacingPage.tsx` | 255 | `hds-bypass` | `demo-grid-visualization — explicit pixel values intentionally show the 8px grid step */}` | justified |
| `src/app/pages/hds/SpacingTestPage.tsx` | 1 | `font-ok` | `spacing test page intentionally uses monospace demo labels during visual inspection` | justified |
| `src/app/pages/hds/TokenCascadeDiagram.tsx` | 108 | `audit-ok` | `CSS var references only` | justified |
| `src/app/pages/hds/TokensPage.tsx` | 272 | `audit-ok` | `content rail minimum height is derived from viewport inset math` | justified |
| `src/app/pages/hds/TypographyPage.tsx` | 14 | `hds-bypass` | `typography reference page intentionally exposes primitive specimen values` | justified |
| `src/app/pages/hds/TypographyTestPage.tsx` | 1 | `font-ok` | `typography test page intentionally uses monospace demo labels during visual inspection` | justified |
| `src/app/pages/hds/TypographyTestPage.tsx` | 105 | `audit-ok` | `code-block surface — theme-aware fallback` | justified |
| `src/app/pages/hds/TypographyTestPage.tsx` | 119 | `audit-ok` | `code-block surface — theme-aware fallback */ padding: '0.25rem 0.5rem', borderRadius: hds.borderRadius[2], display: 'inline-block' }}>` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 63 | `audit-ok` | `demo placeholder div illustrating Stack layout — fixed px intentional for visual demo` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 64 | `audit-ok` | `demo placeholder div illustrating Stack layout — fixed px intentional for visual demo` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 69 | `audit-ok` | `demo placeholder — not a component dimension */}` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 78 | `audit-ok` | `demo placeholder */}` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 87 | `audit-ok` | `demo placeholder */}` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 99 | `audit-ok` | `demo placeholder */}` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 108 | `audit-ok` | `demo placeholder */}` | justified |
| `src/app/pages/hds/components/LayoutPage.tsx` | 117 | `audit-ok` | `demo placeholder */}` | justified |
| `scripts/__tests__/build-token-index.test.mjs` | 262 | `audit-ok` | `hardcoded because WebGL shader constants` | justified |
| `scripts/__tests__/build-token-index.test.mjs` | 273 | `audit-ok` | `first reason\nconst a = 1;\n// audit-ok: second reason\n`;` | justified |
| `scripts/__tests__/build-token-index.test.mjs` | 286 | `audit-ok` | `reason with leading space  \n';` | justified |
| `scripts/audit-component-integrity.mjs` | 143 | `audit-ok` | `')) continue;` | justified |
| `scripts/audit-component-integrity.mjs` | 144 | `audit-ok` | `')) continue;` | justified |
| `scripts/audit-pages.mjs` | 111 | `audit-ok` | `')) continue;` | justified |
| `scripts/audit-pages.mjs` | 112 | `audit-ok` | `')) continue;` | justified |
| `scripts/audit-tokens.mjs` | 607 | `audit-ok` | `reason */ or /* hds-bypass: reason */ or /* spacing-ok: reason */` | justified |
| `scripts/audit-tokens.mjs` | 607 | `hds-bypass` | `reason */ or /* spacing-ok: reason */` | justified |
| `scripts/build-token-index.mjs` | 181 | `audit-ok` | `reason` comments in a file's content.` | justified |
| `scripts/check-doc-structure.mjs` | 186 | `hds-bypass` | `third-party-link both accepted)` | justified |
| `scripts/check-focus-states.mjs` | 74 | `audit-ok` | `')) continue;` | justified |
| `scripts/check-focus-states.mjs` | 108 | `audit-ok` | `')) continue;` | justified |
| `scripts/check-hardcoded-spacing.mjs` | 27 | `spacing-ok` | `reason  (explicit exemption)` | justified |
| `scripts/check-source-canon.mjs` | 102 | `hds-bypass` | `CODE1, CODE2, ... */` | justified |
| `scripts/check-source-canon.mjs` | 107 | `font-ok` | `...          — file intentionally uses bold/heavy weights` | justified |
| `scripts/check-source-canon.mjs` | 139 | `hds-bypass` | `CODE1, CODE2 */ using codes from: ${[...ALL_RULE_CODES].join(', ')}\n`,` | justified |
| `scripts/check-typography-discipline.mjs` | 299 | `audit-ok` | `are intentional.` | justified |

## Summary Stats

- **Total suppressions:** 179
- **Justified (reason >= 10 chars):** 179
- **Untriaged (reason < 10 chars or missing):** 0

Scope reduced to inventory-only — resolution of untriaged suppressions deferred to follow-up units.
