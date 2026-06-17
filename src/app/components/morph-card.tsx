/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * @tier utility
 */
﻿// @doc-exempt: portfolio presentation utility, not a consumer-facing HDS component
import { useRef, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import hds from '../design-system/tokens';

const morphCardStyles = {
  contentOverlay: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: hds.semantic.space.component.padding,
    gap: hds.semantic.space.component.gap,
    height: '100%',
  } satisfies React.CSSProperties,
} as const;

// ─── CONFIG ───────────────────────────────────────────
const SEGS          = 120;    // polygon points per edge — higher = smoother curve
const EDGE_MAX      = 14;     // max px the edge pushes outward
const FALLOFF       = 0.25;   // gaussian radius as fraction of diagonal
const ZOOM_MAX      = 1.30;   // background scale on hover (bumped to match logo growth)
const LOGO_SCALE_IDLE  = 0.55;  // logo size at rest
const LOGO_SCALE_HOVER = 0.78;  // logo size on hover — grows up, eases back on leave
const SMOOTH        = 0.08;   // cursor follow speed (while active)
const RETURN_SMOOTH = 0.022;  // cursor return-to-center speed — slower drift back
const ESPEED        = 0.07;   // edge/zoom lerp speed
const SCALE_SMOOTH  = 0.07;   // logo scale grow speed (on enter)
const SCALE_RETURN  = 0.040;  // logo scale shrink speed (on leave — eases back)
const WARP_STRENGTH = 4;      // multiplier: velocity → stretch amount
const WARP_SMOOTH   = 0.07;   // how fast warp catches up
const WARP_MAX      = 0.028;  // hard cap on warp velocity magnitude
const WARP_SHRINK   = 0.30;   // logo shrinks up to 30% of base at peak warp (squash-and-stretch)
/** Thumbnail hover fill — resolved from hds.color.brand (single source of truth for #1E2FFF) */
const BRAND_BLUE    = hds.color.brand;
// CORNER_R is a canvas-drawing radius. CSS tokens in hds.borderRadius are strings ('2px' etc.)
// and cannot be passed to SVG path / arc operations which need bare numbers.
// Flagged: no direct token equivalent. Keep as canvas-specific constant.
const CORNER_R      = 5;      // corner-arc radius in px

interface MorphCardProps {
  color: string;        // Idle background color
  alt: string;
  isDark: boolean;
  onClick: () => void;
  disabled?: boolean;
  shape?: 'square' | 'circle' | 'triangle';
  customSvg?: React.ReactNode;
  customSvgHovered?: React.ReactNode;
  aspectRatio?: string;
  maxHeight?: string;
  hoverColor?: string;  // Override the default brand-blue hover fill
  hoverForegroundColor?: string;
  customSvgIdleScale?: number;
  customSvgHoverScale?: number;
  children?: ReactNode | ((state: { isHovered: boolean }) => ReactNode);
}

export function MorphCard({
  color,
  alt,
  isDark: _isDark,
  onClick,
  disabled = false,
  shape,
  customSvg,
  customSvgHovered,
  aspectRatio = '16 / 9',
  maxHeight = '240px',
  hoverColor,
  hoverForegroundColor,
  customSvgIdleScale,
  customSvgHoverScale,
  children,
}: MorphCardProps) {
  const wrapRef        = useRef<HTMLDivElement>(null);
  const svgRef         = useRef<SVGSVGElement>(null);
  const shapeRef       = useRef<SVGPathElement>(null);
  const rectRef        = useRef<SVGRectElement>(null);
  const innerSquareRef = useRef<SVGRectElement>(null);
  const logoShapeRef   = useRef<SVGElement>(null);   // outer translate group
  const logoWarpRef    = useRef<SVGGElement>(null);  // inner warp matrix group
  const logoBaseScaleRef = useRef<SVGGElement>(null); // uniform scale (warp-driven squash)

  const [dimensions, setDimensions] = useState({ W: 280, H: 157 });
  const [isHovered, setIsHovered]   = useState(false);
  const rafRef = useRef<number | null>(null);

  // stable ID for the SVG clip-path — useState lazy init: computed once on mount,
  // never changes. useRef(Math.random()…) would call Math.random() on every render
  // (re-evaluating the arg) and triggers react-hooks/purity lint.
  const [clipPathId] = useState(() => `morphClip-${Math.random().toString(36).substr(2, 9)}`);

  // Animation state
  const stateRef = useRef({
    active: false,
    cx: 0.5, cy: 0.5,
    tx: 0.5, ty: 0.5,
    edge: 0, edgeTgt: 0,
    zoom: 1, zoomTgt: 1,
    warpX: 0, warpY: 0,
    scale:    customSvgIdleScale ?? LOGO_SCALE_IDLE,
    scaleTgt: customSvgIdleScale ?? LOGO_SCALE_IDLE,
  });

  // ── Distort a single border point ──────────────────────
  const distortPt = (bx: number, by: number, pcx: number, pcy: number, W: number, H: number): [number, number] => {
    const state = stateRef.current;
    const diag  = Math.sqrt(W * W + H * H);
    const dx    = bx - W / 2;
    const dy    = by - H / 2;
    const len   = Math.sqrt(dx * dx + dy * dy) || 1;
    const dist  = Math.sqrt((bx - pcx) ** 2 + (by - pcy) ** 2);
    const sigma = diag * FALLOFF;
    const t     = Math.exp(-(dist * dist) / (2 * sigma * sigma));
    return [
      bx + (dx / len) * state.edge * EDGE_MAX * t,
      by + (dy / len) * state.edge * EDGE_MAX * t,
    ];
  };

  /**
   * Build an SVG path `d` string with:
   *  - Rounded corners via cubic bezier curves (all control points pass through
   *    distortPt so corners flex dynamically with the rest of the shape)
   *  - Distorted straight-edge segments (the core morph effect)
   */
  const buildPath = (pcx: number, pcy: number, W: number, H: number): string => {
    const R = CORNER_R;
    const K = 0.5523 * R; // bezier kappa — best approximation of a quarter-circle arc
    const f = (n: number) => n.toFixed(2);
    const d = (x: number, y: number): [number, number] => distortPt(x, y, pcx, pcy, W, H);
    const L = ([x, y]: [number, number]) => `L ${f(x)} ${f(y)}`;
    const C = (a: [number, number], b: [number, number], e: [number, number]) =>
      `C ${f(a[0])} ${f(a[1])}, ${f(b[0])} ${f(b[1])}, ${f(e[0])} ${f(e[1])}`;

    const parts: string[] = [];

    // M: top-left arc end — where the top edge begins
    const [mx, my] = d(R, 0);
    parts.push(`M ${f(mx)} ${f(my)}`);

    // ── Top edge (R,0) → (W-R,0) ──────────────────────────────────────────
    for (let i = 1; i <= SEGS; i++) {
      parts.push(L(d(R + (i / SEGS) * (W - 2 * R), 0)));
    }
    // Top-right corner: implicit start = d(W-R,0), end = d(W,R)
    parts.push(C(d(W - R + K, 0), d(W, R - K), d(W, R)));

    // ── Right edge (W,R) → (W,H-R) ────────────────────────────────────────
    for (let i = 1; i <= SEGS; i++) {
      parts.push(L(d(W, R + (i / SEGS) * (H - 2 * R))));
    }
    // Bottom-right corner: implicit start = d(W,H-R), end = d(W-R,H)
    parts.push(C(d(W, H - R + K), d(W - R + K, H), d(W - R, H)));

    // ── Bottom edge (W-R,H) → (R,H) ───────────────────────────────────────
    for (let i = 1; i <= SEGS; i++) {
      parts.push(L(d((W - R) - (i / SEGS) * (W - 2 * R), H)));
    }
    // Bottom-left corner: implicit start = d(R,H), end = d(0,H-R)
    parts.push(C(d(R - K, H), d(0, H - R + K), d(0, H - R)));

    // ── Left edge (0,H-R) → (0,R) ─────────────────────────────────────────
    for (let i = 1; i <= SEGS; i++) {
      parts.push(L(d(0, (H - R) - (i / SEGS) * (H - 2 * R))));
    }
    // Top-left corner: implicit start = d(0,R), end = d(R,0) — closes to M
    parts.push(C(d(0, R - K), d(R - K, 0), d(R, 0)));

    parts.push('Z');
    return parts.join(' ');
  };

  // ── Dimension sync ─────────────────────────────────────
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        const width  = rect.width;
        const height = rect.height;
        if (width <= 0 || height <= 0) return;
        setDimensions({ W: width, H: height });
        if (shapeRef.current) {
          shapeRef.current.setAttribute('d', buildPath(width / 2, height / 2, width, height));
        }
      }
    };

    updateDimensions();

    if (!wrapRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          setDimensions({ W: width, H: height });
          if (shapeRef.current) {
            shapeRef.current.setAttribute('d', buildPath(width / 2, height / 2, width, height));
          }
          return;
        }
      }
      updateDimensions();
    });

    observer.observe(wrapRef.current);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPath and render are stable arrow fns; adding them would re-mount observer on every render
  }, []);

  // ── Main animation loop ────────────────────────────────
  const render = () => {
    const state = stateRef.current;
    const { W, H } = dimensions;

    // ── 1. Capture velocity — slower drift when cursor has left ──
    const followSpeed = state.active ? SMOOTH : RETURN_SMOOTH;
    const velX = (state.tx - state.cx) * followSpeed;
    const velY = (state.ty - state.cy) * followSpeed;

    // ── 2. Lerp position, edge, zoom ──
    state.cx   += velX;
    state.cy   += velY;
    state.edge += (state.edgeTgt - state.edge) * ESPEED;
    state.zoom += (state.zoomTgt - state.zoom) * ESPEED;

    // ── 3. Smooth warp velocity, then clamp magnitude ──
    state.warpX += (velX - state.warpX) * WARP_SMOOTH;
    state.warpY += (velY - state.warpY) * WARP_SMOOTH;
    // Clamp: no matter how fast the cursor moves, the logo stretch stays controlled
    const warpMag = Math.sqrt(state.warpX * state.warpX + state.warpY * state.warpY);
    if (warpMag > WARP_MAX) {
      const scale = WARP_MAX / warpMag;
      state.warpX *= scale;
      state.warpY *= scale;
    }

    // ── 3b. Logo scale: grows to HOVER size on enter, shrinks with warp, eases back on leave ──
    const baseScale = state.active
      ? (customSvgHoverScale ?? LOGO_SCALE_HOVER)
      : (customSvgIdleScale ?? LOGO_SCALE_IDLE);
    const warpFraction = Math.min(warpMag / WARP_MAX, 1);
    state.scaleTgt = baseScale * (1 - warpFraction * WARP_SHRINK);
    const scaleSpeed = state.active ? SCALE_SMOOTH : SCALE_RETURN;
    state.scale += (state.scaleTgt - state.scale) * scaleSpeed;

    // Apply uniform scale to the squash group
    if (logoBaseScaleRef.current) {
      logoBaseScaleRef.current.setAttribute('transform', `scale(${state.scale.toFixed(4)})`);
    }

    // ── 4. Update path clip shape ──
    if (shapeRef.current) {
      shapeRef.current.setAttribute('d', buildPath(state.cx * W, state.cy * H, W, H));
    }

    // ── 5. Zoom background rect ──
    if (rectRef.current) {
      const iw = W * state.zoom;
      const ih = H * state.zoom;
      rectRef.current.setAttribute('x',      ((W - iw) / 2).toFixed(2));
      rectRef.current.setAttribute('y',      ((H - ih) / 2).toFixed(2));
      rectRef.current.setAttribute('width',  iw.toFixed(2));
      rectRef.current.setAttribute('height', ih.toFixed(2));
    }

    // ── 6. Logo parallax translate — cursor pulls logo closer ──
    if (logoShapeRef.current) {
      const maxOffset = W * 0.27;
      const tx = W * 0.5 + (state.cx - 0.5) * maxOffset;
      const ty = H * 0.5 + (state.cy - 0.5) * maxOffset;
      logoShapeRef.current.setAttribute('transform', `translate(${tx.toFixed(2)},${ty.toFixed(2)})`);
    }

    // ── 7. Logo warp — directional stretch matrix ──
    if (logoWarpRef.current) {
      const speed = Math.sqrt(state.warpX ** 2 + state.warpY ** 2) * WARP_STRENGTH;
      if (speed < 0.005) {
        logoWarpRef.current.setAttribute('transform', 'matrix(1,0,0,1,0,0)');
      } else {
        const theta = Math.atan2(state.warpY, state.warpX);
        const sx    = 1 + speed;          // stretch along motion direction
        const sy    = 1 / sx;             // compress perpendicularly (area-preserving)
        const cos   = Math.cos(theta);
        const sin   = Math.sin(theta);
        // Rotation-scaled-rotation decomposition:
        const a = cos * cos * sx + sin * sin * sy;
        const b = cos * sin * (sx - sy);
        const d = sin * sin * sx + cos * cos * sy;
        logoWarpRef.current.setAttribute(
          'transform',
          `matrix(${a.toFixed(4)},${b.toFixed(4)},${b.toFixed(4)},${d.toFixed(4)},0,0)`
        );
      }
    }

    // ── 8. Inner square legacy parallax ──
    if (innerSquareRef.current) {
      const maxOffset = W * 0.05;
      innerSquareRef.current.setAttribute('x', (W * 0.3 + (state.cx - 0.5) * maxOffset).toFixed(2));
      innerSquareRef.current.setAttribute('y', (H * 0.3 + (state.cy - 0.5) * maxOffset).toFixed(2));
    }

    // ── 9. Stop loop once fully settled ──
    const settled = !state.active
      && state.edge   < 0.002
      && Math.abs(state.zoom  - 1)                 < 0.001
      && Math.abs(state.cx    - 0.5)               < 0.001
      && Math.abs(state.cy    - 0.5)               < 0.001
      && Math.abs(state.warpX)                     < 0.001
      && Math.abs(state.warpY)                     < 0.001
      && Math.abs(state.scale - (customSvgIdleScale ?? LOGO_SCALE_IDLE)) < 0.001;

    if (!settled) rafRef.current = requestAnimationFrame(render);
  };

  // ── Event handlers ───────────────────────────────────
  const handleMouseEnter = () => {
    if (disabled) return;
    const state = stateRef.current;
    state.active   = true;
    state.edgeTgt  = 1;
    state.zoomTgt  = ZOOM_MAX;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
    setIsHovered(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;
    if (svgRef.current) {
      const r      = svgRef.current.getBoundingClientRect();
      const state  = stateRef.current;
      state.tx     = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      state.ty     = Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height));
    }
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    const state   = stateRef.current;
    state.active  = false;
    state.edgeTgt = 0;
    state.zoomTgt = 1;
    state.tx      = 0.5;
    state.ty      = 0.5;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
    setIsHovered(false);
  };

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useLayoutEffect(() => {
    // Whenever the card resizes, force one render tick so the SVG path,
    // clip-path, and warp transforms snap to the new dimensions before paint.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- render is stable; re-running on render identity change is unnecessary
  }, [dimensions.W, dimensions.H]);

  const { W, H } = dimensions;
  const CW = W * 0.52;  // 2:1 container width
  const _CH = CW / 2;    // 2:1 container height
  const renderedChildren =
    typeof children === 'function'
      ? children({ isHovered })
      : children;

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-visible hds-focus ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      style={{
        ...(aspectRatio && !children ? { aspectRatio } : {}),
        ...(maxHeight && !children ? { maxHeight } : {}),
        opacity: disabled ? 0.4 : 1,
        filter: disabled ? 'grayscale(100%)' : 'none',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={disabled ? undefined : handleMouseEnter}
      onMouseMove={disabled ? undefined : handleMouseMove}
      onMouseLeave={disabled ? undefined : handleMouseLeave}
      onKeyDown={disabled ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={alt}
      aria-disabled={disabled}
    >
      <svg
        ref={svgRef}
        aria-hidden="true"
        className="block"
        style={{
          overflow: 'visible',
          display: 'block',
          ...(children
            ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
            : { width: '100%', height: '100%' }),
        }}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          <clipPath id={clipPathId}>
            <path ref={shapeRef} />
          </clipPath>
        </defs>

        {/* Background rect — solid accent idle, brand blue on hover */}
        <rect
          ref={rectRef}
          x="0" y="0" width={W} height={H}
          fill={isHovered ? (hoverColor ?? BRAND_BLUE) : color}
          clipPath={`url(#${clipPathId})`}
          style={{ transition: 'fill 0.35s ease' }} // audit-ok: SVG fill transition — no token maps to 0.35s; hds.motion.productive.duration(0.15) is too fast for a color fill sweep
        />

        {/* ── Primitive shape logo ── */}
        {shape && (
          <g
            ref={logoShapeRef as React.RefObject<SVGGElement>}
            transform={`translate(${W * 0.5},${H * 0.5})`}
          >
            {/* Initial transform seeds the correct idle scale so cards never flash at 1.0 */}
            <g ref={logoBaseScaleRef} transform={`scale(${LOGO_SCALE_IDLE})`}>
              <g ref={logoWarpRef}>
                {shape === 'circle'   && <circle  cx={0} cy={0} r={W * 0.15}                                                   fill="white" opacity="0.9" />}
                {shape === 'square'   && <rect    x={-W * 0.15} y={-W * 0.15} width={W * 0.3} height={W * 0.3}                fill="white" opacity="0.9" />}
                {shape === 'triangle' && <polygon points={`0,${-W * 0.17} ${W * 0.15},${W * 0.15} ${-W * 0.15},${W * 0.15}`} fill="white" opacity="0.9" />}
              </g>
            </g>
          </g>
        )}

        {/* ── Custom SVG logo — centered, scale driven imperatively ── */}
        {customSvg && (
          <g
            ref={logoShapeRef as React.RefObject<SVGGElement>}
            transform={`translate(${W * 0.5},${H * 0.5})`}
            style={{
              color: isHovered
                ? (hoverForegroundColor ?? 'white')
                : 'var(--semantic-color-content-primary)',
              transition: `color ${hds.motion.productive.duration}s`,
            }}
          >
            {/* Squash group — initial transform seeds correct idle scale; animation loop overrides each frame */}
            <g ref={logoBaseScaleRef} transform={`scale(${customSvgIdleScale ?? LOGO_SCALE_IDLE})`}>
              {/* Warp group — directional stretch matrix applied each frame */}
              <g ref={logoWarpRef}>
                {isHovered && customSvgHovered ? customSvgHovered : customSvg}
              </g>
            </g>
          </g>
        )}
      </svg>

      {children ? (
        <div
          style={morphCardStyles.contentOverlay}
        >
          {renderedChildren}
        </div>
      ) : null}
    </div>
  );
}
