/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * contrast-pairs.mjs: the semantic color pairs scripts/check-contrast.mjs
 * checks, kept apart from its run so build-stats-json.mjs can count them
 * without executing the check (ops#681). check-contrast.mjs is the only
 * place that evaluates them.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Pairs to check ────────────────────────────────────────────

export const BASE_PAIRS = [
  {
    label: 'content.primary / surface.page',
    text: 'semantic.color.content.primary',
    bg: 'semantic.color.surface.page',
  },
  {
    label: 'content.primary / surface.raised',
    text: 'semantic.color.content.primary',
    bg: 'semantic.color.surface.raised',
  },
  {
    label: 'content.primary / surface.overlay',
    text: 'semantic.color.content.primary',
    bg: 'semantic.color.surface.overlay',
  },
  {
    label: 'content.secondary / surface.page',
    text: 'semantic.color.content.secondary',
    bg: 'semantic.color.surface.page',
  },
  {
    label: 'content.secondary / surface.raised',
    text: 'semantic.color.content.secondary',
    bg: 'semantic.color.surface.raised',
  },
  {
    label: 'content.secondary / surface.overlay',
    text: 'semantic.color.content.secondary',
    bg: 'semantic.color.surface.overlay',
  },
  {
    label: 'content.secondary / surface.sunken',
    text: 'semantic.color.content.secondary',
    bg: 'semantic.color.surface.sunken',
  },
  {
    label: 'content.tertiary / surface.page',
    text: 'semantic.color.content.tertiary',
    bg: 'semantic.color.surface.page',
  },
  {
    label: 'content.tertiary / surface.raised',
    text: 'semantic.color.content.tertiary',
    bg: 'semantic.color.surface.raised',
  },
  {
    label: 'content.onAccent / surface.accent',
    text: 'semantic.color.content.onAccent',
    bg: 'semantic.color.surface.accent',
  },
  {
    label: 'content.accent / surface.page',
    text: 'semantic.color.content.accent',
    bg: 'semantic.color.surface.page',
  },
  {
    label: 'content.accent / surface.raised',
    text: 'semantic.color.content.accent',
    bg: 'semantic.color.surface.raised',
  },
  {
    label: 'accent.delight.onDelight / accent.delight.base',
    text: 'semantic.accent.delight.onDelight',
    bg: 'semantic.accent.delight.base',
  },
  // Semantic feedback text on both the page ("background") and raised ("card")
  // surfaces. Consumers theme status UI (Saved / Applied / Interviewing / …)
  // from these tokens, so each must clear AA for small text on both surfaces in
  // light and dark. `info` is omitted here because its dark stop (blue.300) is
  // expressed in oklch, which this hex-only checker can't evaluate; its AA is
  // held by the token pipeline's own verification. The other four are hex.
  ...['success', 'warning', 'error', 'inProgress'].flatMap((tone) => [
    {
      label: `feedback.${tone} / surface.page`,
      text: `semantic.color.feedback.${tone}`,
      bg: 'semantic.color.surface.page',
    },
    {
      label: `feedback.${tone} / surface.raised`,
      text: `semantic.color.feedback.${tone}`,
      bg: 'semantic.color.surface.raised',
    },
  ]),
  // content.{success,warning,danger} — new status-toned content tokens (ISSUE-03,
  // #127) decoupled from the feedback.* banner tokens. Same AA bar applies since
  // these are used directly as text/icon color.
  ...['success', 'warning', 'danger'].flatMap((tone) => [
    {
      label: `content.${tone} / surface.page`,
      text: `semantic.color.content.${tone}`,
      bg: 'semantic.color.surface.page',
    },
    {
      label: `content.${tone} / surface.raised`,
      text: `semantic.color.content.${tone}`,
      bg: 'semantic.color.surface.raised',
    },
  ]),
];

// Accent themes (accents/<name>/tokens.json, set with data-accent) re-run the
// accent pairs with the theme's overlay laid over the base, so an opt-in accent
// is held to the same bar. Delight pairs are not accent-theme pairs.
const ACCENTS_DIR = fileURLToPath(new URL('../../accents/', import.meta.url));
const isAccentPair = (p) =>
  [p.text, p.bg].some((t) => /\.(?:accent|onAccent|accentSubtle)(?:\.|$)/.test(t)) &&
  ![p.text, p.bg].some((t) => t.startsWith('semantic.accent.delight.'));

export const ACCENT_THEME_PAIRS = readdirSync(ACCENTS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .flatMap((d) => {
    const overlay = JSON.parse(readFileSync(join(ACCENTS_DIR, d.name, 'tokens.json'), 'utf8'));
    return BASE_PAIRS.filter(isAccentPair).map((p) => ({
      ...p,
      label: `${p.label} [${d.name}]`,
      overlay,
    }));
  });

export const PAIRS = [...BASE_PAIRS, ...ACCENT_THEME_PAIRS];

// ── Non-text pairs (WCAG 1.4.11, #230) ──────────────────────────

// Control boundaries where the border is the *only* affordance — no fill
// carries it. Add a pair here whenever a new component's sole boundary
// starts resolving through `semantic.color.border.interactive`; decorative
// hairlines (dividers, card edges, `border.subtle` under
// `semantic.elevation.flat`) stay off this list, since 1.4.11 only binds
// UI-component boundaries, not ornamentation.
export const NONTEXT_PAIRS = [
  {
    label: 'border.interactive / surface.page',
    border: 'semantic.color.border.interactive',
    bg: 'semantic.color.surface.page',
  },
];
