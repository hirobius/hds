/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * MobiusShellLayer — persistent shell-level host for the Möbius canvas.
 *
 * This layer mounts once inside HDSLayout and never unmounts during route
 * changes. Route changes only update store-driven presets and layout state.
 *
 * @doc-exempt: Shell-only visualization host. Routed pages consume the shared
 * @tier utility
 * scene indirectly through mobiusStore and do not render their own canvas.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useMobiusStore } from '../stores/mobiusStore';
import hds from '../design-system/tokens';
import { MobiusLogo } from './mobius-logo';

const SHELL_TOP_NAV_LAYER = hds.zIndex.focus;
const SHELL_MOBIUS_LAYER  = `calc(${SHELL_TOP_NAV_LAYER} + 1)`;
const MOBIUS_SCROLL_HIDE_OFFSET_PX = 40;

export const NAV_MOBIUS_ANCHOR = '[data-mobius-anchor="shell-top-nav-mobius"]';

// Y distance the canvas slides when hidden — must match pill's Y in HDSLayout.
export const MOBIUS_SCROLL_HIDE_Y = `-${MOBIUS_SCROLL_HIDE_OFFSET_PX}px`;

// Shared easing for scroll show/hide so canvas and pill move identically.
export const MOBIUS_SCROLL_EASING = '260ms cubic-bezier(0.2, 0.85, 0.32, 1)';

type MobiusShellLayerProps = {
  showNavAcrylic?: boolean;
  navAcrylicBackground?: string;
  navAcrylicBorder?: string;
  forceVisible?: boolean;
  layerZIndex?: string;
  navScaleMultiplier?: number;
};

export function MobiusShellLayer({
  showNavAcrylic = false,
  navAcrylicBackground = 'transparent',
  navAcrylicBorder = 'transparent',
  forceVisible = false,
  layerZIndex = SHELL_MOBIUS_LAYER,
  navScaleMultiplier = 1,
}: MobiusShellLayerProps) {
  const location         = useLocation();
  const syncRoute        = useMobiusStore((s) => s.syncRoute);
  const layoutMode       = useMobiusStore((s) => s.layoutMode);
  const layoutAnchor     = useMobiusStore((s) => s.layoutAnchorSelector);
  const navScrollProgress = useMobiusStore((s) => s.navScrollProgress);
  const reducedMotion    = useMobiusStore((s) => s.reducedMotion);

  const isNavAnchor = layoutAnchor === NAV_MOBIUS_ANCHOR;
  const scrollProgress = isNavAnchor ? navScrollProgress : 0;
  const isScrollHidden = !forceVisible && isNavAnchor && scrollProgress >= 0.98;

  const shellOpacity = forceVisible
    ? 1
    : layoutMode === 'hidden'
    ? 0
    : Math.max(0, 1 - scrollProgress);
  const shellTranslateY = forceVisible ? '0px' : `${-MOBIUS_SCROLL_HIDE_OFFSET_PX * scrollProgress}px`;

  useEffect(() => {
    syncRoute(location.pathname);
  }, [location.pathname, syncRoute]);

  const isVisible = layoutMode !== 'hidden' && !isScrollHidden;

  return (
    <div
      aria-hidden="true"
      // inline-ok: Möbius shell layer — opacity/visibility/transform/zIndex all driven by scroll+route state
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     layerZIndex,
        pointerEvents: 'none',
        opacity:    shellOpacity,
        visibility: isVisible ? 'visible' : 'hidden',
        transform:  `translateY(${shellTranslateY})`,
        transition: [
          `opacity ${reducedMotion ? '120ms linear' : MOBIUS_SCROLL_EASING}`,
          `transform ${reducedMotion ? '120ms linear' : MOBIUS_SCROLL_EASING}`,
        ].join(', '),
        willChange: 'opacity, transform',
      }}
    >
      <MobiusLogo
        style={{
          width: '100%',
          height: '100%',
        }}
        allowGrab={!isNavAnchor}
        navScaleMultiplier={navScaleMultiplier}
        showNavAcrylic={showNavAcrylic && isNavAnchor}
        navAcrylicBackground={navAcrylicBackground}
        navAcrylicBorder={navAcrylicBorder}
      />
    </div>
  );
}
