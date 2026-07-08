/**
 * Frame — aspect-ratio-locked, token-clipped media box.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves "media that must reserve a fixed aspect ratio and never
 * cause layout shift while it loads, cropped to a token-governed corner
 * radius" — a thin, token-skinned wrapper over `AspectRatio`
 * (`@radix-ui/react-aspect-ratio`), which already owns the ratio-lock
 * mechanics. Frame adds the overflow-hidden clip and semantic radius that a
 * bare media frame needs and `AspectRatio` deliberately leaves undecorated.
 * @ai-rules Reach for this named layout intent before Box/sx when framing
 * media (image, video, embed, map tile). radius MUST use a semantic
 * borderRadius token, never a raw px value. Do NOT reach for bare
 * `AspectRatio` in product code just to add a border-radius by hand — use
 * Frame. Do NOT use Frame for non-media layout — it exists purely as a media
 * clipping frame.
 *
 * Every Layout reference: https://every-layout.dev/layouts/frame/
 */

import React from 'react';
import hds from '../design-system/tokens';
import { AspectRatio } from './aspect-ratio';

type FrameRadius = 'none' | 'sm' | 'md' | 'full';

const radiusMap: Record<FrameRadius, string> = {
  none: hds.borderRadius[0],
  sm: hds.borderRadius.sm,
  md: hds.borderRadius.md,
  full: hds.borderRadius.full,
};

interface FrameProps {
  /** Media rendered inside the locked-ratio, clipped frame. */
  children: React.ReactNode;
  /** Desired width-to-height ratio, e.g. `16 / 9`. Defaults to `16 / 9`. */
  ratio?: number;
  /** Corner radius token applied to the clipped frame. Defaults to 'md'. */
  radius?: FrameRadius;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer clipping wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Frame = React.forwardRef<HTMLDivElement, FrameProps>(function Frame(
  { children, ratio = 16 / 9, radius = 'md', className, style, as: Tag = 'div' },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Frame"
      data-hds-metrics={`ratio:${ratio}`}
      style={{
        overflow: 'hidden',
        borderRadius: radiusMap[radius],
        ...style,
      }}
    >
      <AspectRatio ratio={ratio}>{children}</AspectRatio>
    </Tag>
  );
});
