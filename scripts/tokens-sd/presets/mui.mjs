/**
 * HDS → MUI theme preset (RFC #3 Tier 2, roadmap C2).
 *
 * Maps the Hirobius token graph onto a MUI `ThemeOptions` object. Consumes the
 * **resolved-literal** token tree (roadmap C9) — not `var(--…)` refs — so MUI's
 * color math (`alpha()`, hover shades) works. This is the lowest-cost path for a
 * non-Tailwind/non-Radix React app (e.g. Apply Board) to adopt HDS branding.
 *
 * Usage in a consuming app:
 *
 *   import { createTheme } from '@mui/material/styles';
 *   import { hdsMuiThemeOptions } from '@hirobius/design-system/mui';
 *   const theme = createTheme(hdsMuiThemeOptions());
 *
 * This module imports no `@mui` package — it returns a plain options object, so
 * it stays dependency-free and testable in isolation.
 *
 * CAVEAT: light-mode only. The literal tree resolves the light theme; true dark
 * literals await the DTCG mode model (roadmap C6). For dark today, a consumer
 * can instead use MUI v6 `cssVariables: true` with the var-ref `tokens.css` so
 * the `[data-theme="dark"]` cascade drives MUI — at the cost of losing `alpha()`
 * on those vars.
 */

import { buildLiteralTree } from '../config.mjs';

const px = (v) => parseFloat(String(v)) || 0;

/**
 * @param {object} [tokens]  resolved-literal token tree (defaults to the live one)
 * @param {{ mode?: 'light' | 'dark' }} [opts]
 * @returns MUI ThemeOptions
 */
export function hdsMuiThemeOptions(tokens = buildLiteralTree(), { mode = 'light' } = {}) {
  const role = tokens.role ?? {};
  const sem = tokens.semantic?.color ?? {};
  const content = sem.content ?? {};
  const fb = sem.feedback ?? {};

  return {
    // We pass resolved literals, so let MUI compute its own alpha/hover shades.
    cssVariables: false,
    palette: {
      mode,
      primary: { main: role.primary, contrastText: role['primary-foreground'] },
      secondary: {
        main: content.secondary,
        contrastText: role.background,
      },
      error: { main: fb.error },
      warning: { main: fb.warning },
      success: { main: fb.success },
      info: { main: fb.info },
      background: { default: role.background, paper: role.card },
      text: {
        primary: role.foreground ?? content.primary,
        secondary: content.secondary,
        disabled: content.disabled,
      },
      divider: role.border ?? sem.border?.default,
    },
    shape: { borderRadius: px(role.radius ?? tokens.semantic?.radius?.action) },
    typography: {
      fontFamily: tokens.primitive?.typography?.family?.primary,
    },
  };
}

export default hdsMuiThemeOptions;
