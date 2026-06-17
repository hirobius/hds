/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * MobiusLogo — production R3F Canvas wrapper.
 *
 * Responsibilities (mount-time only):
 *   1. Auto-detect performance tier from navigator.hardwareConcurrency
 *   2. Read brand color from --semantic-color-surface-accent CSS var
 *   3. Read lerp duration from --hds-motion-expressive-duration CSS var
 *   4. Subscribe to prefers-reduced-motion media query
 *   5. Track mouse position for MobiusScene's magnetic influence
 *
 * MobiusScene is responsible for the frame loop and all rendering.
 * This file never imports Leva.
 *
 * @sketchbook-canvas
 * Canvas drawing code and shader uniforms here use values intrinsic to the
 * 3D effect and not mappable to design tokens. Exempt from check-hardcoded-colors.
 * The surrounding UI chrome in LogoLabSketch uses tokens normally.
 *
 * @tier utility
 * @doc-exempt: R3F Canvas host for MobiusScene — a sketchbook visualization component, not a shared HDS primitive. Promoted to shell in a future phase.
 */

import { useEffect, useInsertionEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router';
import { Timer } from 'three';
import type { Clock } from 'three';
import hds from '../design-system/tokens';
import { tokenValues } from '../design-system/generated-token-values';
import { useMobiusStore } from '../stores/mobiusStore';
import type { PerformanceTier } from '../stores/mobiusStore';
import { MobiusScene } from './mobius-scene';

// ── CSS var helpers ───────────────────────────────────────────────────────────

function readCssVar(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function detectPerformanceTier(): PerformanceTier {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
    ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    : undefined;
  if (cores <= 4 || (memory !== undefined && memory <= 4)) return 'low';
  if (cores <= 8 || (memory !== undefined && memory <= 8)) return 'medium';
  return 'high';
}

function downgradePerformanceTier(tier: PerformanceTier): PerformanceTier {
  if (tier === 'high') return 'medium';
  if (tier === 'medium') return 'low';
  return 'low';
}

// ── Component ─────────────────────────────────────────────────────────────────

type MobiusLogoProps = {
  style?: React.CSSProperties;
  className?: string;
  allowGrab?: boolean;
  navScaleMultiplier?: number;
  /** Passed from shell layer; reserved for future acrylic nav effect. */
  showNavAcrylic?: boolean;
  navAcrylicBackground?: string;
  navAcrylicBorder?: string;
};

type DragState = {
  active: boolean;
  targetX: number;
  targetY: number;
};

type InteractionBounds = {
  x: number;
  y: number;
  size: number;
  visible: boolean;
};

const CLOCK_DEPRECATION_MESSAGE = 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

function useClockDeprecationWarningSilencer() {
  useInsertionEffect(() => {
    const originalWarn = console.warn;
    const patchedWarn = (...args: Parameters<typeof console.warn>) => {
      const [message] = args;
      if (typeof message === 'string' && message.includes(CLOCK_DEPRECATION_MESSAGE)) return;
      originalWarn(...args);
    };

    console.warn = patchedWarn;
    return () => {
      if (console.warn === patchedWarn) {
        console.warn = originalWarn;
      }
    };
  }, []);
}

class HdsTimerClock {
  autoStart = false;
  running = true;
  startTime = 0;
  oldTime = 0;
  elapsedTime = 0;

  private readonly timer = new Timer();

  connect(ownerDocument: Document) {
    this.timer.connect(ownerDocument);
  }

  start() {
    this.timer.reset();
    this.running = true;
    this.startTime = performance.now();
    this.oldTime = 0;
    this.elapsedTime = 0;
  }

  stop() {
    this.getElapsedTime();
    this.running = false;
  }

  getElapsedTime() {
    if (!this.running) return this.elapsedTime;
    this.timer.update();
    this.oldTime = this.elapsedTime;
    this.elapsedTime = this.timer.getElapsed();
    return this.elapsedTime;
  }

  getDelta() {
    if (!this.running) return 0;
    this.timer.update();
    this.oldTime = this.elapsedTime;
    this.elapsedTime = this.timer.getElapsed();
    return this.timer.getDelta();
  }

  dispose() {
    this.timer.dispose();
  }
}

export function MobiusLogo({
  style,
  className,
  allowGrab = true,
  navScaleMultiplier = 1,
}: MobiusLogoProps) {
  useClockDeprecationWarningSilencer();

  const navigate           = useNavigate();
  const setUniforms        = useMobiusStore((s) => s.setUniforms);
  const setPerformanceTier = useMobiusStore((s) => s.setPerformanceTier);
  const performanceTier    = useMobiusStore((s) => s.performanceTier);
  const distortionMode     = useMobiusStore((s) => s.distortionMode);
  const initialPerformanceTierRef = useRef<PerformanceTier>(
    typeof window !== 'undefined' ? detectPerformanceTier() : 'high',
  );
  /* eslint-disable react-hooks/refs -- intentional: ref stores one-time detected tier, value does not change after mount */
  const resolvedPerformanceTier = performanceTier === 'high'
    ? initialPerformanceTierRef.current
    : performanceTier;
  /* eslint-enable react-hooks/refs */
  const dragHotspotRef     = useRef<HTMLDivElement>(null);
  const dragStateRef       = useRef<DragState>({ active: false, targetX: 0, targetY: 0 });
  const interactionBoundsRef = useRef<InteractionBounds>({ x: 0, y: 0, size: 0, visible: false });
  const lastInteractionBoundsRef = useRef<InteractionBounds>({ x: Number.NaN, y: Number.NaN, size: Number.NaN, visible: false });
  const lastHotspotCursorRef = useRef<string>('');
  const dragStartRef            = useRef({ x: 0, y: 0 });
  const dragReleaseVelocityRef  = useRef({ x: 0, y: 0 });
  const releaseRafRef           = useRef<number>(0);
  const releaseLastTimeRef      = useRef(0);
  const shouldNavigateHomeRef   = useRef(false);
  const timerClockRef           = useRef(new HdsTimerClock());
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const canvasDpr: [number, number] = resolvedPerformanceTier === 'high'
    ? [1, 2]
    : resolvedPerformanceTier === 'medium'
      ? isCoarsePointer ? [1, 1.45] : [1, 1.6]
      : isCoarsePointer
        ? [1, 1.2]
        : [1, 1.3];
  const antialias = true;

  // ── Mount-time setup ─────────────────────────────────────────────────────

  useLayoutEffect(() => {
    setPerformanceTier(initialPerformanceTierRef.current);
  }, [setPerformanceTier]);

  useEffect(() => {
    const timerClock = timerClockRef.current;
    return () => timerClock.dispose();
  }, []);

  useEffect(() => {
    // 1. Brand color from token cascade
    const color = readCssVar('--semantic-color-surface-accent') || tokenValues.primitive.color.blue['500'];
    setUniforms({ color });

    // 2. Reduced motion — initialize + live listener
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMqChange = (e: MediaQueryListEvent) => {
      useMobiusStore.setState({ reducedMotion: e.matches });
    };
    useMobiusStore.setState({ reducedMotion: mq.matches });
    mq.addEventListener('change', handleMqChange);

    return () => mq.removeEventListener('change', handleMqChange);
  }, [setUniforms, setPerformanceTier]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = 0;
    let warmupFrames = 0;
    let samples: number[] = [];

    const tick = (now: number) => {
      if (document.hidden) {
        lastTime = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (lastTime === 0) {
        lastTime = now;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const delta = now - lastTime;
      lastTime = now;

      if (delta > 120) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (warmupFrames < 20) {
        warmupFrames += 1;
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      samples.push(delta);
      if (samples.length < 45) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const sorted = [...samples].sort((a, b) => a - b);
      const averageFrameMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      const p90FrameMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
      const currentTier = useMobiusStore.getState().performanceTier;
      const needsHeavyDowngrade = averageFrameMs > 30 || p90FrameMs > 38;
      const needsLightDowngrade = averageFrameMs > 22 || p90FrameMs > 28;

      if (needsHeavyDowngrade && currentTier !== 'low') {
        setPerformanceTier('low');
      } else if (needsLightDowngrade && currentTier === 'high') {
        setPerformanceTier(downgradePerformanceTier(currentTier));
      }

      samples = [];
      warmupFrames = 0;
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [setPerformanceTier]);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const updatePointerMode = (event: MediaQueryListEvent) => {
      setIsCoarsePointer(event.matches);
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCoarsePointer(mq.matches);
    mq.addEventListener('change', updatePointerMode);

    return () => mq.removeEventListener('change', updatePointerMode);
  }, []);

  // ── Mouse tracking ────────────────────────────────────────────────────────
  // Normalized [-1, 1] mouse position stored in a ref.
  // MobiusScene reads it each frame. We don't store it in zustand state
  // because that would cause per-move re-renders.

  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let rafId = 0;
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE_MS = 16; // throttle to 60fps

    const syncHotspot = () => {
      const now = performance.now();
      const hotspot = dragHotspotRef.current;
      const { x, y, size, visible } = interactionBoundsRef.current;
      const last = lastInteractionBoundsRef.current;
      const nextCursor = dragStateRef.current.active
        ? 'grabbing'
        : distortionMode === 'magnetic'
          ? 'grab'
          : 'pointer';
      const didBoundsChange =
        Math.abs(x - last.x) > 0.25
        || Math.abs(y - last.y) > 0.25
        || Math.abs(size - last.size) > 0.25
        || visible !== last.visible;
      const didCursorChange = nextCursor !== lastHotspotCursorRef.current;

      if (hotspot && (didBoundsChange || didCursorChange)) {
        const enabled = visible && size > 0;
        const hotspotSize = isCoarsePointer ? Math.max(size, 220) : size;
        hotspot.style.width = `${hotspotSize}px`;
        hotspot.style.height = `${hotspotSize}px`;
        hotspot.style.transform = `translate(${x - hotspotSize / 2}px, ${y - hotspotSize / 2}px)`;
        hotspot.style.pointerEvents = enabled ? 'auto' : 'none';
        hotspot.style.cursor = nextCursor;
      }

      if (now - lastUpdateTime > UPDATE_THROTTLE_MS && typeof document !== 'undefined' && didBoundsChange) {
        document.documentElement.style.setProperty('--hds-mobius-screen-x', `${x}px`);
        document.documentElement.style.setProperty('--hds-mobius-screen-y', `${y}px`);
        document.documentElement.style.setProperty('--hds-mobius-screen-visible', visible ? '1' : '0');
        lastUpdateTime = now;
      }

      if (didBoundsChange) {
        lastInteractionBoundsRef.current = { x, y, size, visible };
      }
      if (didCursorChange) {
        lastHotspotCursorRef.current = nextCursor;
      }

      rafId = window.requestAnimationFrame(syncHotspot);
    };

    rafId = window.requestAnimationFrame(syncHotspot);

    return () => window.cancelAnimationFrame(rafId);
  }, [distortionMode, isCoarsePointer]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      mouseRef.current.x = (event.clientX / width) * 2 - 1;
      mouseRef.current.y = -(event.clientY / height) * 2 + 1;
    };

    const handleDragMove = (event: PointerEvent) => {
      if (!dragStateRef.current.active) return;
      const bounds = interactionBoundsRef.current;
      const size = Math.max(bounds.size, 1);
      const dx = (event.clientX - dragStartRef.current.x) / size;
      const dy = (event.clientY - dragStartRef.current.y) / size;
      // tanh gives progressive resistance — easy to stretch at first, harder near the limit.
      // DRAG_SENSITIVITY: higher = less distance required to reach max stretch.
      // DRAG_MAX: the ceiling value fed into dragOffsetRef (clamped further by uStretchStrength in shader).
      const DRAG_SENSITIVITY = isCoarsePointer ? 0.36 : 0.24;
      const DRAG_MAX = 4.0;
      dragStateRef.current.targetX =  Math.tanh(dx * DRAG_SENSITIVITY) * DRAG_MAX;
      dragStateRef.current.targetY = -Math.tanh(dy * DRAG_SENSITIVITY) * DRAG_MAX;
    };

    const animateRelease = () => {
      const now = performance.now();
      const dt = Math.min((now - releaseLastTimeRef.current) / 1000, 0.1);
      releaseLastTimeRef.current = now;

      if (!dragStateRef.current.active) {
        const { reducedMotion } = useMobiusStore.getState();
        const spring = reducedMotion ? 0.12 : 0.45;
        const damping = reducedMotion ? 0.70 : 0.55;

        const velocity = dragReleaseVelocityRef.current;

        velocity.x += (-dragStateRef.current.targetX * spring) * dt;
        velocity.y += (-dragStateRef.current.targetY * spring) * dt;

        velocity.x *= Math.pow(damping, dt);
        velocity.y *= Math.pow(damping, dt);

        dragStateRef.current.targetX += velocity.x * dt;
        dragStateRef.current.targetY += velocity.y * dt;

        if (Math.abs(dragStateRef.current.targetX) < 0.01 && Math.abs(velocity.x) < 0.01) {
          dragStateRef.current.targetX = 0;
          dragStateRef.current.targetY = 0;
          velocity.x = 0;
          velocity.y = 0;
          return;
        }
      }

      releaseRafRef.current = requestAnimationFrame(animateRelease);
    };

    const endDrag = (goHomeOnRelease: boolean) => {
      cancelAnimationFrame(releaseRafRef.current);
      dragStateRef.current.active = false;
      dragReleaseVelocityRef.current.x = 0;
      dragReleaseVelocityRef.current.y = 0;
      releaseLastTimeRef.current = performance.now();
      releaseRafRef.current = requestAnimationFrame(animateRelease);

      if (goHomeOnRelease && shouldNavigateHomeRef.current) {
        shouldNavigateHomeRef.current = false;
        navigate('/');
        return;
      }

      shouldNavigateHomeRef.current = false;
    };

    const resetPointer = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      endDrag(false);
    };

    const handlePointerUp = () => endDrag(true);
    const handlePointerCancel = () => endDrag(false);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('blur', resetPointer);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('blur', resetPointer);
      cancelAnimationFrame(releaseRafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isCoarsePointer read inside closure; adding it would restart event listeners on pointer mode change
  }, [navigate]);

  // ── Motion token lerp duration ────────────────────────────────────────────
  // Reads --hds-motion-expressive-duration at mount. The exponential lerp
  // factor derived from this value governs how fast presets morph — the same
  // token that controls sidebar and button transitions.
  const lerpDurationRef = useRef(0.35);

  useEffect(() => {
    const raw = readCssVar('--hds-motion-expressive-duration');
    // Value may be "0.3s", "300ms", or bare "0.3" — parseFloat handles all three.
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      // Convert ms to seconds if the value is > 2 (heuristic: tokens use ms)
      lerpDurationRef.current = parsed > 2 ? parsed / 1000 : parsed;
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{ width: '100%', height: '100%', pointerEvents: 'none', ...style }}
      className={className}
    >
      {allowGrab && (
        <div
          ref={dragHotspotRef}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            shouldNavigateHomeRef.current = true;
            dragStateRef.current.active = true;
            dragStartRef.current.x = event.clientX;
            dragStartRef.current.y = event.clientY;
            (event.currentTarget as HTMLDivElement).setPointerCapture?.(event.pointerId);
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            borderRadius: hds.borderRadius.full,
            pointerEvents: 'none',
            background: 'transparent',
            zIndex: hds.zIndex.focus,
            touchAction: 'none',
            userSelect: 'none',
          }}
        />
      )}
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        gl={{ antialias, alpha: true }}
        dpr={canvasDpr}
        style={{ background: 'transparent', pointerEvents: 'none' }}
        onCreated={(state) => {
          timerClockRef.current.connect(document);
          state.set({ clock: timerClockRef.current as unknown as Clock });
        }}
      >
        <MobiusScene
          mouseRef={mouseRef}
          lerpDurationRef={lerpDurationRef}
          dragStateRef={dragStateRef}
          interactionBoundsRef={interactionBoundsRef}
          navScaleMultiplier={navScaleMultiplier}
          isCoarsePointer={isCoarsePointer}
          performanceTierOverride={resolvedPerformanceTier}
        />
      </Canvas>
    </div>
  );
}
