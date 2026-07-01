/**
 * `@hirobius/design-system/mui` — theme preset that maps HDS design tokens to a
 * Material UI (v6+) palette, so MUI-based apps theme from HDS without a local
 * Style-Dictionary / token-copy step.
 *
 * It returns a plain `ThemeOptions`-shaped object whose palette values are HDS
 * **token CSS variables** (`var(--semantic-…)`). Because those variables already
 * switch light/dark via `[data-theme]` on the HDS scope, one preset covers both
 * modes — MUI follows the same variables. This is designed for MUI's CSS-variables
 * mode:
 *
 *     import { createTheme, ThemeProvider } from '@mui/material';
 *     import { hdsMuiThemeOptions } from '@hirobius/design-system/mui';
 *
 *     const theme = createTheme({ cssVariables: true, ...hdsMuiThemeOptions() });
 *     // render inside a `data-hds` scope so the HDS token vars resolve.
 *     <ThemeProvider theme={theme}>…</ThemeProvider>
 *
 * `@mui/material` is NOT a dependency of this package — the return type is
 * structural, so this module adds zero weight and no peer requirement unless you
 * import it. HDS's `error/warning/info/success` map to the semantic feedback
 * tokens (the same ones behind `<Button tone>` / `<Badge tone>`), so MUI status
 * colors and HDS status colors stay identical.
 */

/** A CSS `var(--…)` reference to an HDS design token. */
type TokenVar = `var(--${string})`;
const v = (token: string): TokenVar => `var(${token})` as TokenVar;

/** Minimal structural shape of the palette this preset fills in. */
export interface HdsMuiPalette {
  primary: { main: TokenVar };
  error: { main: TokenVar };
  warning: { main: TokenVar };
  info: { main: TokenVar };
  success: { main: TokenVar };
  background: { default: TokenVar; paper: TokenVar };
  text: { primary: TokenVar; secondary: TokenVar };
  divider: TokenVar;
}

/** Structural subset of MUI's `ThemeOptions` this preset returns. */
export interface HdsMuiThemeOptions {
  cssVariables: true;
  palette: HdsMuiPalette;
}

/**
 * MUI `ThemeOptions` (partial) whose palette is wired to HDS token variables.
 * Spread into `createTheme({ cssVariables: true, ...hdsMuiThemeOptions() })`.
 */
export function hdsMuiThemeOptions(): HdsMuiThemeOptions {
  return {
    cssVariables: true,
    palette: {
      primary: { main: v('--semantic-accent-rest') },
      error: { main: v('--semantic-color-feedback-error') },
      warning: { main: v('--semantic-color-feedback-warning') },
      info: { main: v('--semantic-color-feedback-info') },
      success: { main: v('--semantic-color-feedback-success') },
      background: {
        default: v('--semantic-color-surface-page'),
        paper: v('--semantic-color-surface-raised'),
      },
      text: {
        primary: v('--semantic-color-content-primary'),
        secondary: v('--semantic-color-content-secondary'),
      },
      divider: v('--semantic-color-border-default'),
    },
  };
}

export default hdsMuiThemeOptions;
