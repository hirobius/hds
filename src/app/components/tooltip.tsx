/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
// @doc-exempt: image affordance utility, not a consumer-facing HDS component
/**
 * Tooltip — HDS image interaction tooltip
 *
 * A pill-shaped label (brand blue / white text) that indicates an image
 * is expandable. Supports two render modes:
 *
 *   'cursor'   — fixed-positioned portal tracking the mouse cursor.
 *                Appears offset from the cursor tip on hover.
 *   'centered' — absolute overlay centered within the nearest positioned
 *                ancestor. Used for keyboard-focus state so keyboard
 *                users get an identical visual treatment.
 *
 * Rendered by AssetImg whenever `expandable` is true and an `onClick`
 * handler is provided — no per-call configuration needed at the call site.
 */

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import hds from '../design-system/tokens';
import { Grid } from './grid';
import { Stack } from './stack';
import { Surface } from './surface';

interface TooltipProps {
  /** Controls visibility and drives AnimatePresence enter/exit. */
  visible: boolean;
  /** Render strategy for cursor-following or centered placement. */
  mode: 'cursor' | 'centered';
  /** Pill label text. */
  label?: string;
  /** Cursor X position in client coordinates. */
  x?: number;
  /** Cursor Y position in client coordinates. */
  y?: number;
}

const PILL_SURFACE_STYLE: React.CSSProperties = {
  background: 'var(--semantic-color-surface-accent)',
  border: 'none',
  borderRadius: hds.borderRadius.full,
  color: hds.color.white,
  display: 'inline-flex',
  pointerEvents: 'none',
  paddingBlock: hds.space.px6,
  paddingInline: hds.space.px16,
};

const PILL_TEXT_STYLE: React.CSSProperties = {
  ...hds.typeStyles.ui,
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

function Pill({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.82 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
    >
      <Surface as="span" padding="none" style={PILL_SURFACE_STYLE}>
        <Stack as="span" direction="row" gap="xs" align="center" style={PILL_TEXT_STYLE}>
          <span>{label}</span>
        </Stack>
      </Surface>
    </motion.div>
  );
}

export function Tooltip({ visible, mode, label = 'Expand', x = 0, y = 0 }: TooltipProps) {
  if (mode === 'cursor') {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <AnimatePresence>
        {visible && (
          <Stack
            gap="xs"
            style={{
              position: 'fixed',
              left: x,
              top: y,
              zIndex: hds.zIndex.modal,
              transform: 'translate(14px, -50%)',
              pointerEvents: 'none',
            }}
          >
            <Pill label={label} />
          </Stack>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <Grid
          columns={1}
          gap="tight"
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyItems: 'center',
            pointerEvents: 'none',
            zIndex: hds.zIndex.focus,
          }}
        >
          <Pill label={label} />
        </Grid>
      )}
    </AnimatePresence>
  );
}
