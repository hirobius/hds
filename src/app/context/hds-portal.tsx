/**
 * Portal container resolver for HDS overlay parts (hds#335). Internal — not
 * exported from the package entry points.
 *
 * Radix `Portal` appends to `document.body`, which sits outside a
 * `<div data-hds data-theme="dark">` scope, so overlays would render with light
 * tokens on a dark page. Every portalled part goes through `HdsPortal` (or the
 * `withHdsPortal` factory) so its container resolves, in order, to:
 *
 *   1. the caller's explicit `container` (`null` means `document.body`);
 *   2. the element of the nearest `HdsThemeProvider`;
 *   3. the nearest `[data-hds]` ancestor of a hidden in-place anchor, resolved
 *      in a layout effect (covers a bare `<div data-hds>` with no provider);
 *   4. `undefined`, which the portal treats as `document.body`.
 *
 * Nothing is portalled until the container is known, so an overlay never
 * flashes into `body` first and never remounts (which would break the focus trap).
 * A scope on `<html>` or `<body>` resolves to `undefined`: `body` already
 * inherits it, and a node appended to `<html>` would sit outside `<body>`.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useHdsScope } from './hds-theme';

type PortalContainer = Element | DocumentFragment | null;

const useIsomorphicLayoutEffect =
  typeof document === 'undefined' ? React.useEffect : React.useLayoutEffect;

/** Document roots never receive a portal: `body` already inherits their scope. */
function isDocumentRoot(el: Element | null): boolean {
  return el === document.documentElement || el === document.body;
}

interface ResolvedPortal {
  /** False until the container is known; render no portal while false. */
  ready: boolean;
  /** Element to portal into, or `undefined` for `document.body`. */
  container: HTMLElement | undefined;
  /** Hidden in-place node the layout effect measures from; render it beside the portal. */
  anchor: React.ReactNode;
}

/** Resolve where a portalled part should mount. @internal */
export function useHdsPortalContainer(explicit?: HTMLElement | null): ResolvedPortal {
  const scope = useHdsScope();
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  // undefined = not measured yet, null = measured and resolved to `body`.
  const [found, setFound] = React.useState<HTMLElement | null | undefined>(undefined);
  const needsAnchor = explicit === undefined && scope === null;

  useIsomorphicLayoutEffect(() => {
    if (!needsAnchor) return;
    const nearest = anchorRef.current?.closest<HTMLElement>('[data-hds]') ?? null;
    setFound(nearest && !isDocumentRoot(nearest) ? nearest : null);
  }, [needsAnchor]);

  const anchor = needsAnchor ? (
    <span ref={anchorRef} hidden aria-hidden="true" data-hds-portal-anchor="" />
  ) : null;

  if (explicit !== undefined) return { ready: true, container: explicit ?? undefined, anchor };
  if (scope) return { ready: true, container: isDocumentRoot(scope) ? undefined : scope, anchor };
  if (found === undefined) return { ready: false, container: undefined, anchor };
  return { ready: true, container: found ?? undefined, anchor };
}

/**
 * Wrap a Radix `*.Portal` so it mounts into the resolved scope. The wrapped
 * component keeps the original props, including `container` (explicit wins) and
 * `forceMount`.
 * @internal
 */
export function withHdsPortal<P extends { container?: PortalContainer }>(
  Portal: React.ComponentType<P>,
): React.FC<P> {
  function HdsPortal(props: P) {
    const { ready, container, anchor } = useHdsPortalContainer(
      props.container as HTMLElement | null | undefined,
    );
    if (typeof document === 'undefined') return null;
    return (
      <>
        {anchor}
        {ready ? <Portal {...props} container={container} /> : null}
      </>
    );
  }
  HdsPortal.displayName = `HdsPortal(${Portal.displayName ?? 'Portal'})`;
  return HdsPortal;
}

/** Plain `createPortal` with the same container contract, for non-Radix overlays. */
export const hdsDomPortal = withHdsPortal(function DomPortal({
  container,
  children,
}: {
  container?: PortalContainer;
  children?: React.ReactNode;
}) {
  return createPortal(children, (container as Element | null) ?? document.body);
});
