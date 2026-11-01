/**
 * One resolver for the shipped token sheet (hds#961). `dist/variables.css` is
 * `src/styles/tokens.generated.css` verbatim plus a banner
 * (scripts/build-vars-css.mjs), so tests that resolve a token to the value the
 * browser paints read it from here instead of each carrying a parser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../../src/styles/tokens.generated.css'), 'utf8');

/**
 * The custom-property declarations of every top-level block `selector` opens,
 * in sheet order (later blocks win, as in the browser). Blocks may be spaced
 * (`:root {`) or minified (`:root{`, the raised-edge block).
 */
export function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opens = [...css.matchAll(new RegExp(`^${escaped}\\s*\\{`, 'gm'))];
  if (!opens.length) throw new Error(`no ${selector} block in the token sheet`);
  const vars: Record<string, string> = {};
  for (const open of opens) {
    const from = open.index! + open[0].length;
    const body = css.slice(from, css.indexOf('}', from));
    for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  }
  return vars;
}

const ROOT = block(':root');
export const THEMES = {
  light: ROOT,
  dark: { ...ROOT, ...block('[data-theme="dark"]') },
} as const;
type Theme = keyof typeof THEMES;

/** A custom property's value in a theme, following `var(--x)` chains. */
export function resolveVar(name: string, theme: Theme): string {
  let value = THEMES[theme][name];
  for (let i = 0; value !== undefined && i < 10; i++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) return value;
    value = THEMES[theme][ref[1]];
  }
  throw new Error(`could not resolve ${name} (${theme})`);
}

/** A custom property resolved to a hex colour in a theme. */
export function color(name: string, theme: Theme): string {
  const value = resolveVar(name, theme);
  if (!value.startsWith('#')) throw new Error(`${name} (${theme}) does not resolve to a hex`);
  return value;
}
