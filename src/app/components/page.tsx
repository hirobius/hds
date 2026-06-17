/**
 * Page — standard page shell.
 * @category Layout
 * @tier primitive
 *
 * Wraps page content in Container (width constraint) and applies the
 * canonical vertical padding so content breathes against the viewport edges
 * on scroll. Use as the outermost element of any new page so vertical rhythm
 * is consistent across the system without per-page reinvention.
 *
 * Footer: every page mounted under HDSLayout (the standard route shell) gets
 * a shared footer rendered after this component's content, with bottom space
 * below the footer owned by the layout shell. Page intentionally does not
 * render its own footer — the shell is the single source of truth.
 *
 * Use Container directly only for full-bleed surfaces (sketches, hero
 * sections, embedded canvases) where the page owns its own vertical padding.
 *
 * Usage:
 *   <Page>
 *     <Stack direction="column" gap="spacious">...</Stack>
 *   </Page>
 *
 *   <Page maxWidth="content" paddingY="compact">
 *     <article>...</article>
 *   </Page>
 */

import type { ReactNode, CSSProperties } from 'react';
import hds from '../design-system/tokens';
import { Container } from './container';

type MaxWidth = 'content' | 'max';
type PaddingY = 'default' | 'compact' | 'none';

const PADDING_Y: Record<PaddingY, { top: string; bottom: string }> = {
  default: { top: hds.space.px48, bottom: hds.space.px64 },
  compact: { top: hds.space.px24, bottom: hds.space.px32 },
  none:    { top: '0',             bottom: '0'             },
};

interface PageProps {
  children: ReactNode;
  /** Max width: 'content' (760px for prose) | 'max' (1200px). Defaults to 'max'. */
  maxWidth?: MaxWidth;
  /** Vertical padding token: 'default' (48/64) | 'compact' (24/32) | 'none'. Defaults to 'default'. */
  paddingY?: PaddingY;
  /** Escape hatch for narrow page-specific adjustments. */
  style?: CSSProperties;
  className?: string;
}

/** @public */
export function Page({
  children,
  maxWidth = 'max',
  paddingY = 'default',
  style,
  className,
}: PageProps) {
  const py = PADDING_Y[paddingY];
  return (
    <Container maxWidth={maxWidth} className={className}>
      <div
        data-hds-component="Page"
        data-hds-metrics={`paddingY:${paddingY}`}
        style={{ paddingTop: py.top, paddingBottom: py.bottom, ...style }}
      >
        {children}
      </div>
    </Container>
  );
}
