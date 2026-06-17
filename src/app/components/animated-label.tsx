/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
﻿// @doc-exempt: animation slot helper used inside other surfaces; not a standalone component docs surface.
/**
 * AnimatedLabel — animated text slot for use inside interactive surfaces.
 * @category Utilities
 *
 * Renders the shared CinematicLink text treatment (slide-up reveal + underline
 * draw) as a composable span, not a standalone anchor. Designed to slot inside
 * Button asChild or any other interactive surface that owns the hover group.
 *
 * Usage: add className="group" to the parent Button (or any ancestor), then
 * wrap the label text in <AnimatedLabel>. The group-hover classes activate on
 * CSS :hover of the parent group element — no JS hover state needed.
 *
 * @guide Slot pattern: This component is intentionally element-free at the root
 *   level. The parent surface (button, anchor, etc.) owns semantic role, focus,
 *   and pointer events. AnimatedLabel only owns the visual animation layer.
 */

// motion-ok: Uses cubic-bezier(0.19, 1, 0.22, 1) expo-out to match CinematicLink.
// Intentional design direction — matches the established animated link treatment.

interface AnimatedLabelProps {
  children: string;
}

export function AnimatedLabel({ children }: AnimatedLabelProps) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        overflow: 'hidden',
        height: '1.2em',
      }}
    >
      {/* Text that slides up on group hover */}
      <span
        className="relative inline-block transition-transform duration-500 group-hover:-translate-y-full"
        style={{ transitionTimingFunction: 'cubic-bezier(0.19, 1, 0.22, 1)' }}
      >
        {children}
        {/* Duplicate rendered underneath, revealed as the first slides up */}
        <span className="absolute left-0 top-full w-full h-full" aria-hidden>
          {children}
        </span>
      </span>

      {/* Underline that draws in from left on hover */}
      <span
        // eslint-disable-next-line tailwindcss/no-arbitrary-value -- compound transition list; no Tailwind utility covers multi-prop animation
        className="absolute bottom-0 left-0 w-full h-px bg-current origin-right scale-x-0 opacity-0 transition-[transform,opacity] duration-500 group-hover:scale-x-100 group-hover:origin-left group-hover:opacity-100"
        style={{ transitionTimingFunction: 'cubic-bezier(0.19, 1, 0.22, 1)' }}
      />
    </span>
  );
}

