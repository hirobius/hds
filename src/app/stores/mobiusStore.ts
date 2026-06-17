/**
 * mobiusStore — zustand store for MobiusLogo uniforms and presets.
 *
 * Architecture:
 *   - All visual parameters live here. MobiusScene reads from this store.
 *   - Leva (in LogoLabSketch) writes to this store via setUniforms.
 *   - reset() is called by LogoLabSketch on unmount.
 *   - 'lab' and 'sketchbook' presets do NOT overwrite uniforms — Leva owns them.
 *
 * Slice shape (Phase 1):
 *   State is organised into five named namespaces for devtools readability and
 *   component subscription granularity. All legacy flat top-level accessors
 *   (s.tubeRadius, s.color, etc.) continue working via shim in Phase 1.
 *
 *   geometry   — mesh params that trigger TubeGeometry rebuild
 *   material   — shader/visual surface params
 *   motion     — deformation uniforms, post-processing, transform/animation
 *   layout     — position, scale, anchor, route-splash, nav state
 *   interaction — distortion system + fluid dynamics
 *
 * Phase 2 (next unit): migrate call sites to slice-scoped selectors and remove
 * the flat-field shim layer.
 *
 * @sketchbook-canvas
 * Canvas drawing code and shader uniforms here use values intrinsic to the
 * 3D effect. Exempt from check-hardcoded-colors — surrounding UI chrome uses tokens.
 */

import { create } from 'zustand';
import { tokenValues } from '../design-system/generated-token-values';

// ── Token-sourced WebGL color constants ───────────────────────────────────────
// Three.js material `color` and `fluidColor` require raw hex strings — CSS vars
// cannot be used in WebGL uniforms. These constants keep values traceable to
// hirobius.tokens.json rather than floating magic literals.
const BRAND_BLUE = tokenValues.primitive.color.blue['500'] as string; // primitive.color.blue.500 = #1E2EFD
const PURPLE_500 = tokenValues.primitive.color.projectBrand.microsoftGameDev['500'] as string; // primitive.color.projectBrand.microsoftGameDev.500 = #6d31fb
const GREEN_400 = tokenValues.primitive.color.green['400'] as string; // primitive.color.green.400 = #34d399
// amber.500 (#f59e0b) has no HDS primitive token — nearest are amber.400 (#fbbf24)
// and amber.800 (#92400e). Using literal here; add amber.500 to tokens if a
// semantic "visuals accent" concept is formalised.
const AMBER_500_VISUALS = '#f59e0b'; // color-ok: no amber.500 primitive in HDS token set; used only for /visuals route accent

// ── Types ─────────────────────────────────────────────────────────────────────

type PresetKey =
  | 'home'
  | 'tokens'
  | 'foundations'
  | 'components'
  | 'content'
  | 'hirobius'
  | 'sketchbook'
  | 'glitch'
  | 'lab';

export type PerformanceTier = 'high' | 'medium' | 'low';

// ── Per-tier render budgets ───────────────────────────────────────────────────
// desktop (high):  60 fps, ≤4 ms frame, ≤80 MB GPU
// tablet (medium): 30 fps, ≤8 ms frame, ≤40 MB GPU
// mobile (low):    30 fps degraded, ≤16 ms frame, ≤20 MB GPU
//
// Budgets documented here are the single source of truth. mobius-scene.tsx
// samples renderer.info and exposes readings to telemetry; tests/mobius-perf.spec.ts
// reads those readings and fails if any preset exceeds the active tier's budget.

export type PerformanceBudget = {
  /** Target frame rate (fps) — drives geometry LOD decisions */
  targetFps:        number;
  /** Sustained-drop alert floor (fps). Lower than targetFps; trips warnings */
  fpsFloor:         number;
  /** Max frame time in milliseconds */
  maxFrameMs:       number;
  /** Max combined GPU memory (geometries + textures) in MB */
  maxGpuMemoryMb:   number;
  /** Max draw calls per frame */
  maxDrawCalls:     number;
  /** Max triangles per frame */
  maxTriangles:     number;
};

export const PERFORMANCE_BUDGETS: Record<PerformanceTier, PerformanceBudget> = {
  high: {
    targetFps:      60,
    fpsFloor:       55,
    maxFrameMs:      4,
    maxGpuMemoryMb: 80,
    maxDrawCalls:   50,
    maxTriangles:   400_000,
  },
  medium: {
    targetFps:      30,
    fpsFloor:       40,
    maxFrameMs:      8,
    maxGpuMemoryMb: 40,
    maxDrawCalls:   30,
    maxTriangles:   200_000,
  },
  low: {
    targetFps:      30,
    fpsFloor:       25,
    maxFrameMs:     16,
    maxGpuMemoryMb: 20,
    maxDrawCalls:   20,
    maxTriangles:   100_000,
  },
};

type MobiusLayoutMode = 'hidden' | 'ambient' | 'immersive';
type DistortionMode = 'organic' | 'linear' | 'magnetic';
type DistortionAxisLock = 'horizontal' | 'vertical' | 'both';

// ── Slice types ───────────────────────────────────────────────────────────────
// Each slice groups semantically-related fields. All slice fields also appear
// flat on MobiusState via shim (Phase 1).

/** Geometry slice — drives TubeGeometry rebuild via useMemo */
type GeometrySlice = {
  tubeRadius: number;
  pathRadius: number;
  blend: number;
  twistCount: number;
  tubularSegments: number;
  radialSegments: number;
};

/** Material slice — surface appearance / shader params */
type MaterialSlice = {
  wireframe: boolean;
  flatShading: boolean; // hard facet edges
  transmission: number;
  roughness: number;
  thickness: number;
  metalness: number;
  emissiveIntensity: number; // self-glow from mesh color
  color: string;
};

/** Motion slice — GPU deformation uniforms, post-processing, transform / animation */
type MotionSlice = {
  uTwistAmount: number; // 0 = torus, 1 = full Möbius, fractional = partial twist
  uWaveAmplitude: number;
  uWaveFrequency: number;
  uWaveSpeed: number;
  uGlitchIntensity: number;
  bloomIntensity: number;
  bloomThreshold: number;
  chromaticAberration: number;
  noiseOpacity: number;
  vignetteIntensity: number;
  scale: number;
  rotationSpeed: number;
  rollSpeed: number;
  mouseInfluence: number;
};

/** Layout slice — position, orientation, anchor, nav + route-splash state */
type LayoutSlice = {
  layoutMode: MobiusLayoutMode;
  layoutOpacity: number;
  layoutAnchorSelector: string | null;
  layoutPositionX: number;
  layoutPositionY: number;
  layoutPositionZ: number;
  layoutRotationX: number;
  layoutRotationY: number;
  layoutRotationZ: number;
  layoutScale: number;
  routeSplashActive: boolean;
  routeSplashStartedAt: number;
  routeSplashDurationMs: number;
  routeSplashStrength: number;
  routeSplashOriginX: number;
  routeSplashOriginY: number;
  activePreset: PresetKey;
  performanceTier: PerformanceTier;
  reducedMotion: boolean;
  navScrollVisible: boolean;
  navScrollProgress: number;
  navAcrylicHovered: boolean;
};

/** Interaction slice — fluid dynamics + distortion system */
type InteractionSlice = {
  fluidEnabled: boolean;
  fluidIntensity: number;
  fluidRadius: number;
  fluidCurl: number;
  fluidSwirl: number;
  fluidDistortion: number;
  fluidForce: number;
  fluidRainbow: boolean;
  fluidColor: string;
  distortionMode: DistortionMode;
  glitchProgress: number;
  glitchIntensity: number;
  gridSize: number;
  axisLock: DistortionAxisLock;
  magneticRadius: number;
  magneticStrength: number;
  liquidStrength: number;
  rippleRadius: number;
  rippleFrequency: number;
  waveSpeed: number;
  sealedEdges: boolean;
  magneticDrag: number;
  magneticSwirl: number;
  magneticDepth: number;
  magneticLag: number;
  fluidDissipation: number;
  fluidVelocity: number;
};

// ── Legacy union type for full backwards-compat surface ────────────────────────
// MobiusUniforms is kept as-is so all importers continue to compile.

export type MobiusUniforms = GeometrySlice & MaterialSlice & MotionSlice & InteractionSlice;

// ── Internal layout/splash types (kept for MobiusRouteConfig + HIDDEN_LAYOUT) ─

type MobiusLayoutState = {
  layoutMode: MobiusLayoutMode;
  layoutOpacity: number;
  layoutAnchorSelector: string | null;
  layoutPositionX: number;
  layoutPositionY: number;
  layoutPositionZ: number;
  layoutRotationX: number;
  layoutRotationY: number;
  layoutRotationZ: number;
  layoutScale: number;
};

type MobiusRouteConfig = {
  preset: PresetKey;
  layout: MobiusLayoutState;
};

type MobiusRouteSplashState = {
  routeSplashActive: boolean;
  routeSplashStartedAt: number;
  routeSplashDurationMs: number;
  routeSplashStrength: number;
  routeSplashOriginX: number;
  routeSplashOriginY: number;
};

// ── MobiusState: slice objects + flat legacy surface + actions ─────────────────
// Phase 1: both s.geometry.tubeRadius AND s.tubeRadius work simultaneously.
// Phase 2 (next unit): migrate subscribers to slice selectors, then remove flat surface.

type MobiusState = MobiusUniforms &
  MobiusLayoutState &
  MobiusRouteSplashState & {
    // ── Slice namespaces (new in Phase 1) ──────────────────────────────────────
    geometry: GeometrySlice;
    material: MaterialSlice;
    motion: MotionSlice;
    layout: LayoutSlice;
    interaction: InteractionSlice;

    // ── Scalar state ──────────────────────────────────────────────────────────
    activePreset: PresetKey;
    performanceTier: PerformanceTier;
    reducedMotion: boolean;
    navScrollVisible: boolean;
    navScrollProgress: number;
    navAcrylicHovered: boolean;

    // ── Actions ────────────────────────────────────────────────────────────────
    setUniforms: (partial: Partial<MobiusUniforms>) => void;
    setPreset: (preset: PresetKey) => void;
    setPerformanceTier: (tier: PerformanceTier) => void;
    setNavScrollVisible: (visible: boolean) => void;
    setNavScrollProgress: (progress: number) => void;
    setNavAcrylicHovered: (hovered: boolean) => void;
    syncRoute: (pathname: string) => void;
    triggerRouteSplash: (
      config?: Partial<
        Pick<
          MobiusRouteSplashState,
          | 'routeSplashDurationMs'
          | 'routeSplashStrength'
          | 'routeSplashOriginX'
          | 'routeSplashOriginY'
        >
      >,
    ) => void;
    clearRouteSplash: () => void;
    reset: () => void;
  };

// ── Defaults ────────────────────────────────────────────────────────────────
// flatShading + 8 radial segments = octagonal faceted cross-section.
// Matte clay baseline — low-refraction, softly lit, lightly gummy edges.

export const MOBIUS_DEFAULTS: MobiusUniforms = {
  tubeRadius: 0.25,
  pathRadius: 0.67,
  blend: 0.08,
  twistCount: 1,
  tubularSegments: 320,
  radialSegments: 6,
  wireframe: false,
  flatShading: false,
  transmission: 0.12,
  roughness: 0.82,
  thickness: 0.5,
  metalness: 0.1,
  emissiveIntensity: 0.2,
  color: BRAND_BLUE, // overwritten from CSS var at mount
  uTwistAmount: 1.0, // full Möbius by default
  uWaveAmplitude: 0.0,
  uWaveFrequency: 3,
  uWaveSpeed: 1.8,
  uGlitchIntensity: 0.0,
  bloomIntensity: 0.3,
  bloomThreshold: 0.1,
  chromaticAberration: 0,
  noiseOpacity: 0.03,
  vignetteIntensity: 0.35,
  scale: 0.45,
  rotationSpeed: 0,
  rollSpeed: 0.5,
  mouseInfluence: 0.5,

  fluidEnabled: true,
  fluidIntensity: 6,
  fluidRadius: 0.1,
  fluidCurl: 3.5,
  fluidSwirl: 0,
  fluidDistortion: 1.5,
  fluidForce: 6,
  fluidRainbow: false,
  fluidColor: BRAND_BLUE,
  distortionMode: 'magnetic',
  glitchProgress: 0,
  glitchIntensity: 1.0,
  gridSize: 32,
  axisLock: 'both',
  magneticRadius: 0.25,
  magneticStrength: 0.5,
  liquidStrength: 3,
  rippleRadius: 3,
  rippleFrequency: 1,
  waveSpeed: 0.0,
  sealedEdges: true,
  magneticDrag: 0.7,
  magneticSwirl: 0,
  magneticDepth: 1,
  magneticLag: 0.5,
  fluidDissipation: 0.985,
  fluidVelocity: 1.2,
};

// ── Presets ───────────────────────────────────────────────────────────────────
// 'lab' and 'sketchbook' are intentionally empty — Leva owns those values.

type PresetOverride = Partial<MobiusUniforms>;
const MAGNETIC_DRAG_DEFAULT = 0.7;

export const PRESETS: Record<PresetKey, PresetOverride> = {
  // Faceted metallic — matches the HDS overview WebGL logo
  home: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 320,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: BRAND_BLUE,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.3,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  tokens: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 320,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: BRAND_BLUE,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.3,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  // Low-poly structural — 6-sided cross-section, high metalness
  foundations: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 300,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: BRAND_BLUE,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.25,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  // Soft frosted clay — smoother normals with low refraction
  components: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 320,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: BRAND_BLUE,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.35,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  content: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 300,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: PURPLE_500,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.2,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  hirobius: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 320,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: BRAND_BLUE,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.3,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  glitch: {
    tubeRadius: 0.325,
    pathRadius: 0.67,
    blend: 0.08,
    twistCount: 1,
    tubularSegments: 300,
    radialSegments: 6,
    wireframe: false,
    flatShading: false,
    transmission: 0.12,
    roughness: 0.82,
    thickness: 0.5,
    metalness: 0.1,
    emissiveIntensity: 0.2,
    color: BRAND_BLUE,
    uWaveAmplitude: 0.0,
    uWaveFrequency: 3,
    uWaveSpeed: 1.8,
    uGlitchIntensity: 0.0,
    bloomIntensity: 0.3,
    chromaticAberration: 0,
    scale: 0.45,
    rotationSpeed: 0,
    mouseInfluence: 0.5,
    fluidEnabled: true,
    fluidIntensity: 6,
    fluidRadius: 0.1,
    fluidCurl: 3.5,
    fluidSwirl: 0,
    fluidDistortion: 1.5,
    fluidForce: 6,
    fluidRainbow: false,
    fluidColor: BRAND_BLUE,
    distortionMode: 'magnetic',
    glitchProgress: 0,
    glitchIntensity: 1,
    gridSize: 32,
    axisLock: 'both',
    magneticRadius: 0.25,
    magneticStrength: 0.5,
    liquidStrength: 3,
    rippleRadius: 3,
    rippleFrequency: 1,
    waveSpeed: 0.0,
    sealedEdges: true,
    magneticDrag: MAGNETIC_DRAG_DEFAULT,
    magneticSwirl: 0,
    magneticDepth: 1,
    magneticLag: 0.5,
    fluidDissipation: 0.985,
    fluidVelocity: 1.2,
  },

  sketchbook: {},
  lab: {},
};

function getThemeAwareHomeColor(): string {
  if (typeof document === 'undefined') return PRESETS.home.color ?? MOBIUS_DEFAULTS.color;

  return document.documentElement.dataset['theme'] === 'dark'
    ? tokenValues.primitive.color.neutral['100']
    : tokenValues.primitive.color.neutral['850'];
}

function getRouteMobiusColor(pathname: string, fallback: string) {
  if (pathname === '/' || pathname === '/info') {
    return getThemeAwareHomeColor();
  }

  if (pathname === '/visuals') {
    return AMBER_500_VISUALS;
  }

  if (pathname === '/vibe-sketchbook' || pathname.startsWith('/vibe-sketchbook/')) {
    return GREEN_400;
  }

  return fallback;
}

const HIDDEN_LAYOUT: MobiusLayoutState = {
  layoutMode: 'hidden',
  layoutOpacity: 0,
  layoutAnchorSelector: null,
  layoutPositionX: 0,
  layoutPositionY: 0,
  layoutPositionZ: 0,
  layoutRotationX: 0,
  layoutRotationY: 0,
  layoutRotationZ: 0,
  layoutScale: 0.9,
};

const SHELL_TOP_NAV_LAYOUT_SCALE = 0.3375;
const SHELL_TOP_NAV_ROUTE_LAYOUT = {
  layoutMode: 'ambient' as const,
  layoutAnchorSelector: '[data-mobius-anchor="shell-top-nav-mobius"]',
  layoutPositionX: 0,
  layoutPositionY: 0,
  layoutPositionZ: -0.16,
  layoutRotationX: -0.04,
  layoutRotationY: 0,
  layoutRotationZ: 0,
  layoutScale: SHELL_TOP_NAV_LAYOUT_SCALE,
};

const DEFAULT_ROUTE_SPLASH: MobiusRouteSplashState = {
  routeSplashActive: false,
  routeSplashStartedAt: 0,
  routeSplashDurationMs: 620,
  routeSplashStrength: 0.9,
  routeSplashOriginX: 0.5,
  routeSplashOriginY: 0.5,
};

const ROUTE_LAYOUTS = {
  ambientPortfolioHome: {
    layoutMode: 'ambient',
    layoutOpacity: 0.92,
    layoutAnchorSelector: '[data-mobius-anchor="portfolio-home-mobius"]',
    layoutPositionX: 0,
    layoutPositionY: 0.2,
    layoutPositionZ: -0.16,
    layoutRotationX: -0.04,
    layoutRotationY: 0,
    layoutRotationZ: 0,
    layoutScale: 0.75,
  },
  ambientHome: {
    layoutOpacity: 0.88,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  ambientTokens: {
    layoutOpacity: 0.9,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  ambientFoundations: {
    layoutOpacity: 0.78,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  ambientComponents: {
    layoutOpacity: 0.86,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  ambientContent: {
    layoutOpacity: 0.7,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  ambientHirobius: {
    layoutOpacity: 0.94,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  ambientSketchbook: {
    layoutOpacity: 0.86,
    ...SHELL_TOP_NAV_ROUTE_LAYOUT,
  },
  immersiveLab: {
    layoutMode: 'immersive',
    layoutOpacity: 1,
    layoutAnchorSelector: null,
    layoutPositionX: 0,
    layoutPositionY: 0,
    layoutPositionZ: 0,
    layoutRotationX: 0,
    layoutRotationY: 0,
    layoutRotationZ: 0,
    layoutScale: 0.74,
  },
} as const satisfies Record<string, MobiusLayoutState>;

const FOUNDATIONS_PREFIXES = [
  '/ops/hds/color',
  '/ops/hds/typography',
  '/ops/hds/spacing',
  '/ops/hds/shape',
  '/ops/hds/elevation',
  '/ops/hds/motion',
  '/ops/hds/breakpoints',
] as const;

function startsWithAny(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function getRouteConfig(pathname: string): MobiusRouteConfig {
  if (pathname === '/vibe-sketchbook/logo-lab') {
    return { preset: 'lab', layout: ROUTE_LAYOUTS.immersiveLab };
  }

  if (pathname.startsWith('/vibe-sketchbook/')) {
    return { preset: 'sketchbook', layout: ROUTE_LAYOUTS.ambientSketchbook };
  }

  if (pathname === '/vibe-sketchbook') {
    return { preset: 'sketchbook', layout: ROUTE_LAYOUTS.ambientSketchbook };
  }

  if (
    pathname === '/case-studies/hirobius' ||
    pathname === '/portfolio/hirobius' ||
    pathname === '/hds/case-studies/hirobius' || // route-ok: legacy redirect source
    pathname === '/hds/process' || // route-ok: legacy redirect source
    pathname === '/ops/hds/case-studies/hirobius' ||
    pathname === '/ops/hds/process'
  ) {
    return { preset: 'hirobius', layout: ROUTE_LAYOUTS.ambientHirobius };
  }

  if (pathname === '/') {
    return { preset: 'home', layout: ROUTE_LAYOUTS.ambientPortfolioHome };
  }

  if (pathname === '/ops/hds' || pathname === '/hds') {
    // route-ok: /hds is legacy redirect source
    return { preset: 'home', layout: ROUTE_LAYOUTS.ambientHome };
  }

  if (pathname === '/info') {
    return { preset: 'content', layout: ROUTE_LAYOUTS.ambientContent };
  }

  if (pathname === '/ops/hds/tokens') {
    return { preset: 'tokens', layout: ROUTE_LAYOUTS.ambientTokens };
  }

  if (startsWithAny(pathname, FOUNDATIONS_PREFIXES)) {
    return { preset: 'foundations', layout: ROUTE_LAYOUTS.ambientFoundations };
  }

  if (pathname.startsWith('/ops/hds/components/')) {
    return { preset: 'components', layout: ROUTE_LAYOUTS.ambientComponents };
  }

  if (pathname === '/ops/hds/patterns') {
    return { preset: 'components', layout: ROUTE_LAYOUTS.ambientComponents };
  }

  if (
    pathname === '/visuals' ||
    pathname === '/microsoft-design-systems' ||
    pathname.startsWith('/portfolio/')
  ) {
    return { preset: 'content', layout: ROUTE_LAYOUTS.ambientContent };
  }

  return { preset: 'home', layout: HIDDEN_LAYOUT };
}

// ── Slice object builders ──────────────────────────────────────────────────────
// These extract slice sub-objects from a flat state snapshot so the slice
// namespace objects are always kept in sync with the flat fields.

function buildGeometrySlice(s: MobiusUniforms): GeometrySlice {
  return {
    tubeRadius: s.tubeRadius,
    pathRadius: s.pathRadius,
    blend: s.blend,
    twistCount: s.twistCount,
    tubularSegments: s.tubularSegments,
    radialSegments: s.radialSegments,
  };
}

function buildMaterialSlice(s: MobiusUniforms): MaterialSlice {
  return {
    wireframe: s.wireframe,
    flatShading: s.flatShading,
    transmission: s.transmission,
    roughness: s.roughness,
    thickness: s.thickness,
    metalness: s.metalness,
    emissiveIntensity: s.emissiveIntensity,
    color: s.color,
  };
}

function buildMotionSlice(s: MobiusUniforms): MotionSlice {
  return {
    uTwistAmount: s.uTwistAmount,
    uWaveAmplitude: s.uWaveAmplitude,
    uWaveFrequency: s.uWaveFrequency,
    uWaveSpeed: s.uWaveSpeed,
    uGlitchIntensity: s.uGlitchIntensity,
    bloomIntensity: s.bloomIntensity,
    bloomThreshold: s.bloomThreshold,
    chromaticAberration: s.chromaticAberration,
    noiseOpacity: s.noiseOpacity,
    vignetteIntensity: s.vignetteIntensity,
    scale: s.scale,
    rotationSpeed: s.rotationSpeed,
    rollSpeed: s.rollSpeed,
    mouseInfluence: s.mouseInfluence,
  };
}

function buildInteractionSlice(s: MobiusUniforms): InteractionSlice {
  return {
    fluidEnabled: s.fluidEnabled,
    fluidIntensity: s.fluidIntensity,
    fluidRadius: s.fluidRadius,
    fluidCurl: s.fluidCurl,
    fluidSwirl: s.fluidSwirl,
    fluidDistortion: s.fluidDistortion,
    fluidForce: s.fluidForce,
    fluidRainbow: s.fluidRainbow,
    fluidColor: s.fluidColor,
    distortionMode: s.distortionMode,
    glitchProgress: s.glitchProgress,
    glitchIntensity: s.glitchIntensity,
    gridSize: s.gridSize,
    axisLock: s.axisLock,
    magneticRadius: s.magneticRadius,
    magneticStrength: s.magneticStrength,
    liquidStrength: s.liquidStrength,
    rippleRadius: s.rippleRadius,
    rippleFrequency: s.rippleFrequency,
    waveSpeed: s.waveSpeed,
    sealedEdges: s.sealedEdges,
    magneticDrag: s.magneticDrag,
    magneticSwirl: s.magneticSwirl,
    magneticDepth: s.magneticDepth,
    magneticLag: s.magneticLag,
    fluidDissipation: s.fluidDissipation,
    fluidVelocity: s.fluidVelocity,
  };
}

function buildLayoutSlice(
  layoutState: MobiusLayoutState,
  splashState: MobiusRouteSplashState,
  scalars: {
    activePreset: PresetKey;
    performanceTier: PerformanceTier;
    reducedMotion: boolean;
    navScrollVisible: boolean;
    navScrollProgress: number;
    navAcrylicHovered: boolean;
  },
): LayoutSlice {
  return {
    ...layoutState,
    ...splashState,
    ...scalars,
  };
}

// ── Store factory (exported for testing) ─────────────────────────────────────

export function createMobiusStore() {
  const reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const initialScalars = {
    activePreset: 'home' as PresetKey,
    performanceTier: 'high' as PerformanceTier,
    reducedMotion,
    navScrollVisible: true,
    navScrollProgress: 0,
    navAcrylicHovered: false,
  };

  return create<MobiusState>()((set) => ({
    // ── Flat fields (legacy surface, Phase 1 shim via initial spread) ────────
    ...MOBIUS_DEFAULTS,
    ...HIDDEN_LAYOUT,
    ...DEFAULT_ROUTE_SPLASH,
    ...initialScalars,

    // ── Slice namespace objects (new in Phase 1) ─────────────────────────────
    geometry: buildGeometrySlice(MOBIUS_DEFAULTS),
    material: buildMaterialSlice(MOBIUS_DEFAULTS),
    motion: buildMotionSlice(MOBIUS_DEFAULTS),
    interaction: buildInteractionSlice(MOBIUS_DEFAULTS),
    layout: buildLayoutSlice(HIDDEN_LAYOUT, DEFAULT_ROUTE_SPLASH, initialScalars),

    // ── Actions ──────────────────────────────────────────────────────────────

    setUniforms: (partial) =>
      set((s) => {
        const next = { ...s, ...partial };
        return {
          ...next,
          geometry: buildGeometrySlice(next),
          material: buildMaterialSlice(next),
          motion: buildMotionSlice(next),
          interaction: buildInteractionSlice(next),
        };
      }),

    setPreset: (preset) => {
      if (preset === 'lab' || preset === 'sketchbook') {
        set((s) => ({
          ...s,
          activePreset: preset,
          layout: { ...s.layout, activePreset: preset },
        }));
        return;
      }
      set((s) => {
        const merged = { ...s, ...PRESETS[preset], activePreset: preset };

        if (!s.reducedMotion) {
          merged.routeSplashActive = true;
          merged.routeSplashStartedAt =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
          merged.routeSplashDurationMs = 260;
          merged.routeSplashStrength = 0.22;
          merged.routeSplashOriginX = 0.5;
          merged.routeSplashOriginY = 0.18;
        }

        return {
          ...merged,
          geometry: buildGeometrySlice(merged),
          material: buildMaterialSlice(merged),
          motion: buildMotionSlice(merged),
          interaction: buildInteractionSlice(merged),
          layout: buildLayoutSlice(
            {
              layoutMode: merged.layoutMode,
              layoutOpacity: merged.layoutOpacity,
              layoutAnchorSelector: merged.layoutAnchorSelector,
              layoutPositionX: merged.layoutPositionX,
              layoutPositionY: merged.layoutPositionY,
              layoutPositionZ: merged.layoutPositionZ,
              layoutRotationX: merged.layoutRotationX,
              layoutRotationY: merged.layoutRotationY,
              layoutRotationZ: merged.layoutRotationZ,
              layoutScale: merged.layoutScale,
            },
            {
              routeSplashActive: merged.routeSplashActive,
              routeSplashStartedAt: merged.routeSplashStartedAt,
              routeSplashDurationMs: merged.routeSplashDurationMs,
              routeSplashStrength: merged.routeSplashStrength,
              routeSplashOriginX: merged.routeSplashOriginX,
              routeSplashOriginY: merged.routeSplashOriginY,
            },
            {
              activePreset: merged.activePreset,
              performanceTier: merged.performanceTier,
              reducedMotion: merged.reducedMotion,
              navScrollVisible: merged.navScrollVisible,
              navScrollProgress: merged.navScrollProgress,
              navAcrylicHovered: merged.navAcrylicHovered,
            },
          ),
        } as MobiusState;
      });
    },

    setPerformanceTier: (tier) =>
      set((s) => ({
        ...s,
        performanceTier: tier,
        layout: { ...s.layout, performanceTier: tier },
      })),

    setNavScrollVisible: (visible) =>
      set((s) => ({
        ...s,
        navScrollVisible: visible,
        layout: { ...s.layout, navScrollVisible: visible },
      })),

    setNavScrollProgress: (progress) => {
      const clamped = Math.min(1, Math.max(0, progress));
      set((s) => ({
        ...s,
        navScrollProgress: clamped,
        layout: { ...s.layout, navScrollProgress: clamped },
      }));
    },

    setNavAcrylicHovered: (hovered) =>
      set((s) => ({
        ...s,
        navAcrylicHovered: hovered,
        layout: { ...s.layout, navAcrylicHovered: hovered },
      })),

    syncRoute: (pathname) => {
      const { preset, layout } = getRouteConfig(pathname);

      set((s) => {
        const routePreset = PRESETS[preset];
        const routeColor = getRouteMobiusColor(pathname, routePreset.color ?? s.color);
        const nextFlat: Partial<MobiusState> = {
          ...layout,
          color: routeColor,
          fluidColor: routePreset.fluidColor ?? s.fluidColor,
          activePreset: preset,
          navScrollVisible: true,
          navScrollProgress: 0,
          navAcrylicHovered: false,
        };
        const merged = { ...s, ...nextFlat };
        return {
          ...merged,
          material: buildMaterialSlice(merged),
          interaction: buildInteractionSlice(merged),
          layout: buildLayoutSlice(
            {
              layoutMode: merged.layoutMode,
              layoutOpacity: merged.layoutOpacity,
              layoutAnchorSelector: merged.layoutAnchorSelector,
              layoutPositionX: merged.layoutPositionX,
              layoutPositionY: merged.layoutPositionY,
              layoutPositionZ: merged.layoutPositionZ,
              layoutRotationX: merged.layoutRotationX,
              layoutRotationY: merged.layoutRotationY,
              layoutRotationZ: merged.layoutRotationZ,
              layoutScale: merged.layoutScale,
            },
            {
              routeSplashActive: merged.routeSplashActive,
              routeSplashStartedAt: merged.routeSplashStartedAt,
              routeSplashDurationMs: merged.routeSplashDurationMs,
              routeSplashStrength: merged.routeSplashStrength,
              routeSplashOriginX: merged.routeSplashOriginX,
              routeSplashOriginY: merged.routeSplashOriginY,
            },
            {
              activePreset: merged.activePreset,
              performanceTier: merged.performanceTier,
              reducedMotion: merged.reducedMotion,
              navScrollVisible: merged.navScrollVisible,
              navScrollProgress: merged.navScrollProgress,
              navAcrylicHovered: merged.navAcrylicHovered,
            },
          ),
        };
      });
    },

    triggerRouteSplash: (config) => {
      set((s) => {
        if (s.reducedMotion) return s;

        const splashUpdate = {
          routeSplashActive: true,
          routeSplashStartedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
          routeSplashDurationMs:
            config?.routeSplashDurationMs ?? DEFAULT_ROUTE_SPLASH.routeSplashDurationMs,
          routeSplashStrength:
            config?.routeSplashStrength ?? DEFAULT_ROUTE_SPLASH.routeSplashStrength,
          routeSplashOriginX: config?.routeSplashOriginX ?? DEFAULT_ROUTE_SPLASH.routeSplashOriginX,
          routeSplashOriginY: config?.routeSplashOriginY ?? DEFAULT_ROUTE_SPLASH.routeSplashOriginY,
        };

        return {
          ...s,
          ...splashUpdate,
          layout: { ...s.layout, ...splashUpdate },
        };
      });
    },

    clearRouteSplash: () =>
      set((s) => ({
        ...s,
        routeSplashActive: false,
        routeSplashStartedAt: 0,
        layout: { ...s.layout, routeSplashActive: false, routeSplashStartedAt: 0 },
      })),

    reset: () =>
      set((s) => {
        const merged = {
          ...s,
          ...MOBIUS_DEFAULTS,
          ...DEFAULT_ROUTE_SPLASH,
          activePreset: 'home' as PresetKey,
          navScrollVisible: true,
          navScrollProgress: 0,
          navAcrylicHovered: false,
        };
        return {
          ...merged,
          geometry: buildGeometrySlice(merged),
          material: buildMaterialSlice(merged),
          motion: buildMotionSlice(merged),
          interaction: buildInteractionSlice(merged),
          layout: buildLayoutSlice(
            {
              layoutMode: merged.layoutMode,
              layoutOpacity: merged.layoutOpacity,
              layoutAnchorSelector: merged.layoutAnchorSelector,
              layoutPositionX: merged.layoutPositionX,
              layoutPositionY: merged.layoutPositionY,
              layoutPositionZ: merged.layoutPositionZ,
              layoutRotationX: merged.layoutRotationX,
              layoutRotationY: merged.layoutRotationY,
              layoutRotationZ: merged.layoutRotationZ,
              layoutScale: merged.layoutScale,
            },
            {
              routeSplashActive: merged.routeSplashActive,
              routeSplashStartedAt: merged.routeSplashStartedAt,
              routeSplashDurationMs: merged.routeSplashDurationMs,
              routeSplashStrength: merged.routeSplashStrength,
              routeSplashOriginX: merged.routeSplashOriginX,
              routeSplashOriginY: merged.routeSplashOriginY,
            },
            {
              activePreset: merged.activePreset,
              performanceTier: merged.performanceTier,
              reducedMotion: merged.reducedMotion,
              navScrollVisible: merged.navScrollVisible,
              navScrollProgress: merged.navScrollProgress,
              navAcrylicHovered: merged.navAcrylicHovered,
            },
          ),
        };
      }),
  }));
}

// ── Singleton (used by all app code) ─────────────────────────────────────────

export const useMobiusStore = createMobiusStore();
