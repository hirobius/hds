/**
 * useVisualViewport — reads `window.visualViewport`, the part of the page the
 * on-screen keyboard leaves visible (hds#1432).
 * @internal Shared by Dock; not part of the public API.
 */
import * as React from 'react';

export interface VisualViewportState {
  /** Visible height in px, or `null` without visualViewport (old browsers, jsdom, SSR). */
  height: number | null;
  /** How far the on-screen keyboard reaches up over the layout viewport, in px. 0 when closed. */
  keyboardInset: number;
}

const NONE: VisualViewportState = { height: null, keyboardInset: 0 };

/** Tracks the visual viewport. Without visualViewport it returns `{ height: null, keyboardInset: 0 }`. */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = React.useState<VisualViewportState>(NONE);

  React.useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const apply = () => {
      const height = Math.round(vv.height);
      // Pinch-zoom also shrinks the visual viewport: only an unzoomed one reads as a keyboard.
      const zoomed = Math.abs((vv.scale ?? 1) - 1) > 0.01;
      const keyboardInset = zoomed
        ? 0
        : Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      setState((prev) =>
        prev.height === height && prev.keyboardInset === keyboardInset
          ? prev
          : { height, keyboardInset },
      );
    };
    apply();
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
    };
  }, []);

  return state;
}
