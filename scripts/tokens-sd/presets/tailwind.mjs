/**
 * HDS → Tailwind v3 preset (RFC #3 Tier 2, roadmap C13).
 *
 * Maps the token graph onto a Tailwind v3 `preset` (`theme.extend`). Unlike the
 * MUI preset (which needs literals for color math), this emits `var(--…)` refs,
 * so it stays **theme-aware** — the `[data-theme="dark"]` / `[data-tenant]`
 * cascade re-skins Tailwind utilities for free.
 *
 * Usage in a consuming app (tailwind.config.js):
 *
 *   const { hdsTailwindPreset } = require('@hirobius/design-system/tailwind');
 *   module.exports = { presets: [hdsTailwindPreset()], content: [...] };
 *   // and import '@hirobius/design-system/tokens.css' once at the app root.
 *
 * Returns a plain object — no `tailwindcss` import — so it's testable in
 * isolation.
 */

import { collectScalarTokens, readRawTokens } from '../config.mjs';

const ref = (name) => `var(--${name})`;

export function hdsTailwindPreset(rawTokens = readRawTokens()) {
  const colors = {};
  const spacing = {};
  const borderRadius = {};
  const fontFamily = {};

  for (const t of collectScalarTokens(rawTokens)) {
    const p = t.path;
    if (t.type === 'color') {
      if (p[0] === 'primitive' && p[1] === 'color') {
        const ramp = p[2];
        const stop = p.slice(3).join('-') || 'DEFAULT';
        (colors[ramp] ??= {})[stop] = ref(t.name);
      } else if (p[0] === 'role') {
        colors[p.slice(1).join('-')] = ref(t.name);
      }
    } else if (p[0] === 'primitive' && p[1] === 'space') {
      spacing[p.slice(2).join('-')] = ref(t.name);
    } else if (p[0] === 'primitive' && p[1] === 'radius') {
      borderRadius[p.slice(2).join('-')] = ref(t.name);
    } else if (p[0] === 'primitive' && p[1] === 'typography' && p[2] === 'family') {
      fontFamily[p[3]] = [ref(t.name)];
    }
  }

  return { theme: { extend: { colors, spacing, borderRadius, fontFamily } } };
}

export default hdsTailwindPreset;
