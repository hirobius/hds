/**
 * perf-budget — shared performance instrumentation for Three.js / @react-three/fiber scenes.
 *
 * Used by mobius-scene and the vibe-sketchbook three-scene routes (BACKLOG items
 * 12i-bloat-mobius-perf-instrumentation + 12o-perf-three-js-budget-per-tier).
 *
 * @internal — observation only; opt-in via `import.meta.env.DEV`, URL `?perf=1`,
 * or `localStorage['hds-perf-debug'] === '1'`.
 *
 * @tier utility
 *
 * --- Per-device-tier scene budgets (Three.js) ---
 * Tier   | Draw calls | Vertices/Tris | GPU memory
 * -------|------------|---------------|------------
 * high   | 80         | 50,000        | 100 MB
 * mid    | 40         | 20,000        | 50 MB
 * low    | 20         | 5,000         | 15 MB
 *
 * --- Per-device-tier FPS floor (sustained-drop alerts) ---
 * Tier   | floor   | targetFps (from PERFORMANCE_BUDGETS)
 * -------|---------|---------------------------------------
 * high   | 55 fps  | 60
 * mid    | 40 fps  | 30
 * low    | 25 fps  | 30
 *
 * The FPS floor is independent of targetFps — targetFps drives LOD decisions,
 * while fpsFloor triggers a sustained-drop warning when the rolling average
 * stays below the floor for >2s. See PERFORMANCE_BUDGETS in mobiusStore.ts.
 */

export type PerfTier = 'high' | 'mid' | 'low';

/**
 * Three.js-specific budgets — draw calls / triangles / GPU memory.
 * Triangle count is used as a vertex proxy (Three.js renderer.info doesn't
 * expose raw vertex counts).
 */
export const SCENE_BUDGETS: Record<
  PerfTier,
  {
    drawCalls: number;
    maxVertices: number;
    gpuMemoryMb: number;
  }
> = {
  high: { drawCalls: 80, maxVertices: 50_000, gpuMemoryMb: 100 },
  mid: { drawCalls: 40, maxVertices: 20_000, gpuMemoryMb: 50 },
  low: { drawCalls: 20, maxVertices: 5_000, gpuMemoryMb: 15 },
};

/**
 * Is perf-debug instrumentation enabled? Any of:
 *  - `import.meta.env.DEV` (dev server)
 *  - `?perf=1` in URL
 *  - `localStorage['hds-perf-debug'] === '1'`
 *
 * Returns false in SSR / no-window environments (safe to call from useFrame).
 */
export function isPerfDebugEnabled(): boolean {
  // dev mode — always on
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true;
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('perf') === '1') return true;
    if (window.localStorage?.getItem('hds-perf-debug') === '1') return true;
  } catch {
    // localStorage may throw in private-browsing / SSR contexts
  }
  return false;
}

/**
 * Detect device performance tier. Returns 'high' on capable desktops,
 * 'low' on phones / low-spec hardware, 'mid' otherwise.
 *
 * Coordinates with the more-detailed `detectPerformanceTier()` in
 * mobius-logo.tsx (which uses `hardwareConcurrency` + `deviceMemory`).
 * This helper is a sketchbook-friendly equivalent that doesn't depend on
 * the mobius module graph.
 */
export function detectTier(): PerfTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'mid';
  const cores =
    (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const touch = (navigator.maxTouchPoints ?? 0) > 1;
  // Heuristics: mobile/tablet OR low-spec → low | high-spec desktop → high | else mid
  if (touch && (cores <= 4 || mem <= 2)) return 'low';
  if (!touch && cores >= 8 && mem >= 8 && dpr >= 1.5) return 'high';
  return 'mid';
}

/**
 * Rolling FPS counter. `push(delta)` per frame (delta in seconds, from useFrame),
 * `avg()` returns the rolling FPS over the last N frames.
 */
export function createFpsCounter(windowFrames = 60) {
  const samples: number[] = [];
  return {
    push(deltaSec: number) {
      const fps = deltaSec > 0 ? 1 / deltaSec : 0;
      samples.push(fps);
      if (samples.length > windowFrames) samples.shift();
    },
    avg(): number {
      if (samples.length === 0) return 0;
      const sum = samples.reduce((a, b) => a + b, 0);
      return sum / samples.length;
    },
    reset() {
      samples.length = 0;
    },
  };
}

/**
 * Budget watcher: tracks how long FPS has been below floor.
 * Fires `console.warn` after 2s sustained, rate-limited to once per 5s.
 * Returns a `tick(currentFpsAvg, nowMs)` callable.
 */
export function createBudgetWatcher(tier: PerfTier, fpsFloor: number, sceneName: string) {
  let belowSince: number | null = null;
  let lastWarnAt = 0;
  const SUSTAINED_MS = 2000;
  const COOLDOWN_MS = 5000;

  return function tick(currentFpsAvg: number, nowMs: number) {
    if (currentFpsAvg < fpsFloor) {
      if (belowSince === null) belowSince = nowMs;
      const elapsed = nowMs - belowSince;
      if (elapsed >= SUSTAINED_MS && nowMs - lastWarnAt >= COOLDOWN_MS) {
        console.warn(
          `[perf-budget] ${sceneName} FPS floor violation (${tier} tier): ` +
            `${currentFpsAvg.toFixed(1)} fps avg, floor ${fpsFloor}, ` +
            `sustained ${(elapsed / 1000).toFixed(1)}s`,
        );
        lastWarnAt = nowMs;
      }
    } else {
      belowSince = null;
    }
  };
}
