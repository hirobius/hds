import { cva } from 'class-variance-authority';

// Track + thumb class sets shared by Toggle and Menu's switch rows (one set of CSS rules).

/**
 * Track — the pill-shaped switch body. This is the fix for #225 ("Toggle
 * renders as a 16x16 transparent box"): previously the *native* checkbox was
 * rendered directly and visibly (sized 16x16 via `accent-color`), which is a
 * native form-control affordance, not a drawn switch. Box model mirrors
 * checkbox.tsx's glyph (`inline-flex shrink-0`, border-solid, static — see
 * the input comment above for why "static" matters here); size is semantic.size.control.md, radius a
 * primitive token, on/off + disabled colors are semantic tokens.
 */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/border/padding; var()-based, no Tailwind-theme utility exists
export const toggleTrackVariants = /* @__PURE__ */ cva(
  // tier-ok: primitive.radius.full is the "fully round" constant
  'inline-flex shrink-0 items-center rounded-[var(--primitive-radius-full)] border-solid border-[length:var(--primitive-borderWidth-sm)] p-[var(--semantic-space-subgrid-xs)] h-[var(--semantic-size-control-md)] w-[calc(var(--semantic-size-control-md)*2)]',
  {
    variants: {
      on: { true: '', false: '' },
      disabled: { true: '', false: '' },
    },
    compoundVariants: [
      // Every (on, disabled) pair is listed explicitly so exactly one compound
      // ever matches — no reliance on array order or a twMerge pass to break
      // ties between overlapping classes (see the segmented-control indicator
      // fix in this same PR for what happens when that discipline slips).
      {
        on: true,
        disabled: false,
        className:
          'bg-[var(--semantic-color-surface-accent)] border-[color:var(--semantic-color-border-accent)]',
      },
      {
        on: false,
        disabled: false,
        className: 'bg-transparent border-[color:var(--semantic-color-content-secondary)]',
      },
      {
        disabled: true,
        className:
          'bg-[var(--semantic-color-surface-raised)] border-[color:var(--semantic-color-border-default)]',
      },
    ],
    defaultVariants: { on: false, disabled: false },
  },
);

/** Thumb — circular indicator that slides across the track. Sized to exactly
 * fill the track's inner (padded) rail; `block` is the same explicit-box-
 * display fix as radio.tsx's dot (a bare `<span>` is `display: inline` and
 * ignores `width`/`height`). Position is animated via framer's `animate={{x}}`
 * below (`TOGGLE_THUMB_TRAVEL`), not cva — it's a transform, not a class swap. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/color; var()-based, no Tailwind-theme utility exists
export const toggleThumbVariants = /* @__PURE__ */ cva(
  // tier-ok: primitive.radius.full is the "fully round" constant; the thumb fills the track's padded rail
  'pointer-events-none block h-full aspect-square rounded-[var(--primitive-radius-full)]',
  {
    variants: {
      on: { true: '', false: '' },
      disabled: { true: '', false: '' },
    },
    compoundVariants: [
      // On: page-coloured thumb on the accent track. Off: the thumb takes the track's own edge colour,
      // so it is a visible dot (>= 3:1, WCAG 1.4.11) instead of the page colour on a transparent track.
      { on: true, disabled: false, className: 'bg-[var(--semantic-color-surface-page)]' },
      { on: false, disabled: false, className: 'bg-[var(--semantic-color-content-secondary)]' },
      { disabled: true, className: 'bg-[var(--semantic-color-content-disabled)]' },
    ],
    defaultVariants: { on: false, disabled: false },
  },
);
