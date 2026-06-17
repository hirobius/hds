/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
/**
 * MobiusScene — R3F scene internals for the MÃ¶bius logo.
 *
 * Rendered inside MobiusLogo's <Canvas>. Reads all visual parameters
 * from useMobiusStore. Never imports Leva.
 *
 * MÃ¶bius twist is applied entirely in the vertex shader via Rodrigues rotation
 * around the path tangent at each cross-section. This makes uTwistCount and
 * uTwistAmount smoothly animatable without geometry rebuild.
 *
 * @sketchbook-canvas
 * Shader uniforms and procedural geometry values are intrinsic to the 3D
 * effect and not mappable to design tokens. Exempt from check-hardcoded-colors.
 * The surrounding UI chrome in LogoLabSketch uses tokens normally.
 *
 * @tier utility
 * @doc-exempt: R3F scene internals — rendered inside MobiusLogo's Canvas, not a standalone UI component. Documented via MobiusLogo.
 */

import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MutableRefObject } from 'react';
import { tokenValues } from '../design-system/generated-token-values';
import { MobiusCurve } from '../stores/mobiusCurve';
import {
  useMobiusStore,
  PERFORMANCE_BUDGETS,
  type PerformanceTier,
} from '../stores/mobiusStore';
import {
  MOBIUS_VERTEX_COMMON,
  MOBIUS_VERTEX_NORMAL,
  MOBIUS_VERTEX_DEFORMATIONS,
  MOBIUS_FRAGMENT_COMMON,
  MOBIUS_FRAGMENT_PATCHES,
} from './shaders/mobius.glsl';
import { createFpsCounter, createBudgetWatcher, isPerfDebugEnabled } from './perf-budget';

// ── Prop types ────────────────────────────────────────────────────────────────

type MouseRef = MutableRefObject<{ x: number; y: number }>;
type LerpDurationRef = MutableRefObject<number>;
type DragStateRef = MutableRefObject<{ active: boolean; targetX: number; targetY: number }>;
type InteractionBoundsRef = MutableRefObject<{
  x: number;
  y: number;
  size: number;
  visible: boolean;
}>;

const VIEWPORT_HEIGHT_BASELINE = 900;

// ── MÃ¶bius Mesh ───────────────────────────────────────────────────────────────

function MobiusMesh({
  mouseRef,
  lerpDurationRef,
  routeTransitionDecay,
  dragStateRef,
  interactionBoundsRef,
  navScaleMultiplier,
  isCoarsePointer,
  performanceTier,
}: {
  mouseRef: MouseRef;
  lerpDurationRef: LerpDurationRef;
  routeTransitionDecay: number;
  dragStateRef: DragStateRef;
  interactionBoundsRef: InteractionBoundsRef;
  navScaleMultiplier: number;
  isCoarsePointer: boolean;
  performanceTier: 'high' | 'medium' | 'low';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const shaderRef = useRef<THREE.WebGLProgramParametersWithUniforms | null>(null);
  const currentColorRef = useRef(new THREE.Color(tokenValues.primitive.color.blue['500']));
  const targetColorRef = useRef(new THREE.Color(tokenValues.primitive.color.blue['500']));

  const tubeRadius = useMobiusStore((s) => s.tubeRadius);
  const pathRadius = useMobiusStore((s) => s.pathRadius);
  const _twistCount = useMobiusStore((s) => s.twistCount);
  const tubularSegments = useMobiusStore((s) => s.tubularSegments);
  const radialSegments = useMobiusStore((s) => s.radialSegments);
  const wireframe = useMobiusStore((s) => s.wireframe);
  const flatShading = useMobiusStore((s) => s.flatShading);
  const transmission = useMobiusStore((s) => s.transmission);
  const roughness = useMobiusStore((s) => s.roughness);
  const thickness = useMobiusStore((s) => s.thickness);
  const metalness = useMobiusStore((s) => s.metalness);
  const emissiveIntensity = useMobiusStore((s) => s.emissiveIntensity);
  const color = useMobiusStore((s) => s.color);
  const rotationSpeed = useMobiusStore((s) => s.rotationSpeed);
  const _distortionMode = useMobiusStore((s) => s.distortionMode);
  const _glitchIntensity = useMobiusStore((s) => s.glitchIntensity);
  const _gridSize = useMobiusStore((s) => s.gridSize);
  const _liquidStrength = useMobiusStore((s) => s.liquidStrength);
  const _rippleRadius = useMobiusStore((s) => s.rippleRadius);
  const _rippleFrequency = useMobiusStore((s) => s.rippleFrequency);
  const _waveSpeed = useMobiusStore((s) => s.waveSpeed);
  const _sealedEdges = useMobiusStore((s) => s.sealedEdges);
  const _magneticDrag = useMobiusStore((s) => s.magneticDrag);
  const _magneticSwirl = useMobiusStore((s) => s.magneticSwirl);
  const _magneticDepth = useMobiusStore((s) => s.magneticDepth);
  const magneticLag = useMobiusStore((s) => s.magneticLag);
  const scale = useMobiusStore((s) => s.scale);
  const mouseInfluence = useMobiusStore((s) => s.mouseInfluence);
  const layoutAnchorSelector = useMobiusStore((s) => s.layoutAnchorSelector);
  const layoutPositionX = useMobiusStore((s) => s.layoutPositionX);
  const layoutPositionY = useMobiusStore((s) => s.layoutPositionY);
  const layoutPositionZ = useMobiusStore((s) => s.layoutPositionZ);
  const layoutRotationX = useMobiusStore((s) => s.layoutRotationX);
  const layoutRotationY = useMobiusStore((s) => s.layoutRotationY);
  const layoutRotationZ = useMobiusStore((s) => s.layoutRotationZ);
  const layoutScale = useMobiusStore((s) => s.layoutScale);
  const activePreset = useMobiusStore((s) => s.activePreset);
  const reducedMotion = useMobiusStore((s) => s.reducedMotion);
  const navScrollProgress = useMobiusStore((s) => s.navScrollProgress);
  const navAcrylicHovered = useMobiusStore((s) => s.navAcrylicHovered);
  const anchorDisplayRef = useRef({ x: layoutPositionX, y: layoutPositionY });
  const scrollImpulseRef = useRef(0);
  const scrollLiftRef = useRef(0);
  const scratchVec = useRef(new THREE.Vector3());
  const scratchVec2 = useRef(new THREE.Vector3());
  const scratchVec3 = useRef(new THREE.Vector3());
  const scratchVec4 = useRef(new THREE.Vector3());
  const scratchVec5 = useRef(new THREE.Vector3());
  const scratchQuat = useRef(new THREE.Quaternion());
  const scratchMat4 = useRef(new THREE.Matrix4());
  const dragOffsetRef = useRef(new THREE.Vector2());
  const dragMouseVectorRef = useRef(new THREE.Vector2());
  const dragTargetWorldRef = useRef(new THREE.Vector3());
  const dragDirectionWorldRef = useRef(new THREE.Vector3(1, 0, 0));
  const anchorWorldRef = useRef(new THREE.Vector3());
  const pointerWorldRef = useRef(new THREE.Vector3());
  const previousPointerWorldRef = useRef(new THREE.Vector3());
  const pointerVelocityRef = useRef(new THREE.Vector3());
  const pointerVelocityScratchRef = useRef(new THREE.Vector3());
  const mouseScreenRef = useRef(new THREE.Vector2(0.5, 0.5));
  const previousMouseScreenRef = useRef(new THREE.Vector2(0.5, 0.5));
  const mouseVelocity2DRef = useRef(new THREE.Vector2());
  const mouseVelocity2DScratchRef = useRef(new THREE.Vector2());
  const anchorElementRef = useRef<HTMLElement | null>(null);
  const hoverProximityRef = useRef(0);
  const navHoverProgressRef = useRef(0);
  const gooPointerRef = useRef(new THREE.Vector3());
  const wasDraggingRef = useRef(false);
  const releaseStrengthRef = useRef(0);
  const snapOffsetRef = useRef({ x: 0, y: 0 });
  const snapTargetOffsetRef = useRef({ x: 0, y: 0 });
  const snapPhaseRef = useRef<'idle' | 'return'>('idle');
  const navAnchorPrimedRef = useRef(false);
  const initialDropStartRef = useRef<number | null>(null);
  const initialDropWarmupFramesRef = useRef(0);
  const anchorPlaneRef = useRef(new THREE.Plane());
  const centerPlaneRef = useRef(new THREE.Plane());
  const pointerPlaneRef = useRef(new THREE.Plane());
  const anchorRaycasterRef = useRef(new THREE.Raycaster());
  const originRaycasterRef = useRef(new THREE.Raycaster());
  const visualRaycasterRef = useRef(new THREE.Raycaster());
  const pointerRaycasterRef = useRef(new THREE.Raycaster());
  const anchorNdcRef = useRef(new THREE.Vector2());
  const originNdcRef = useRef(new THREE.Vector2());
  const visualNdcRef = useRef(new THREE.Vector2());
  const pointerNdcRef = useRef(new THREE.Vector2());
  const lowTierInteractionFrameRef = useRef(0);
  const cachedScreenStateRef = useRef({
    screenX: 0,
    screenY: 0,
    screenLocalX: 0,
    screenLocalY: 0,
    projectedRadius: 0,
  });
  const cachedVisualOffsetRef = useRef({ x: 0, y: 0 });
  const cachedHoverProximityRef = useRef(0);
  const lastDomQueryTimeRef = useRef(0);
  const cachedAnchorRectRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const anchorQueryThrottleMs = performanceTier === 'low' ? 100 : 32;

  // ── Perf telemetry ────────────────────────────────────────────────────────
  // Samples renderer.info once per frame and exposes readings on
  // window.__mobiusPerfTelemetry for Playwright tests and devtools inspection.
  // Budget thresholds come from PERFORMANCE_BUDGETS[tier].
  const perfTelemetryRef = useRef<{
    frameMs: number;
    geometries: number;
    textures: number;
    drawCalls: number;
    triangles: number;
    gpuMemoryMb: number;
    fpsAvg: number;
    tier: string;
    budget: {
      maxFrameMs: number;
      maxGpuMemoryMb: number;
      maxDrawCalls: number;
      maxTriangles: number;
      fpsFloor: number;
    };
    violations: string[];
  }>({
    frameMs: 0,
    geometries: 0,
    textures: 0,
    drawCalls: 0,
    triangles: 0,
    gpuMemoryMb: 0,
    fpsAvg: 0,
    tier: performanceTier,
    budget: {
      maxFrameMs: PERFORMANCE_BUDGETS[performanceTier].maxFrameMs,
      maxGpuMemoryMb: PERFORMANCE_BUDGETS[performanceTier].maxGpuMemoryMb,
      maxDrawCalls: PERFORMANCE_BUDGETS[performanceTier].maxDrawCalls,
      maxTriangles: PERFORMANCE_BUDGETS[performanceTier].maxTriangles,
      fpsFloor: PERFORMANCE_BUDGETS[performanceTier].fpsFloor,
    },
    violations: [],
  });

  // ── FPS counter + budget watcher (12i-bloat-mobius-perf-instrumentation) ──
  // Opt-in via isPerfDebugEnabled() (dev / ?perf=1 / localStorage flag).
  // Tracks rolling 60-frame FPS and fires console.warn after 2s sustained drop
  // below the per-tier fpsFloor. Zero overhead in production.
  const fpsCounterRef = useRef(createFpsCounter(60));
  const fpsTier: 'high' | 'mid' | 'low' =
    performanceTier === 'medium' ? 'mid' : (performanceTier as 'high' | 'low');
  const budgetWatcherRef = useRef(
    createBudgetWatcher(fpsTier, PERFORMANCE_BUDGETS[performanceTier].fpsFloor, 'mobius'),
  );
  const perfDebugRef = useRef(isPerfDebugEnabled());

  const initialPosition = useMemo(
    () => new THREE.Vector3(layoutPositionX, layoutPositionY, layoutPositionZ),
    [], // eslint-disable-line react-hooks/exhaustive-deps -- initial values only; prop changes re-animate rather than re-mount
  );
  const initialRotation = useMemo(
    () => new THREE.Euler(layoutRotationX, layoutRotationY, layoutRotationZ),
    [], // eslint-disable-line react-hooks/exhaustive-deps -- initial values only; prop changes re-animate rather than re-mount
  );
  const initialScale = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useEffect(() => {
    anchorElementRef.current = layoutAnchorSelector
      ? document.querySelector<HTMLElement>(layoutAnchorSelector)
      : null;
    navAnchorPrimedRef.current = false;
    scrollImpulseRef.current = 0;
  }, [layoutAnchorSelector]);

  const effectiveTubularSegments =
    performanceTier === 'low'
      ? isCoarsePointer
        ? Math.min(tubularSegments, 160)
        : Math.min(tubularSegments, 220)
      : isCoarsePointer
        ? Math.min(tubularSegments, 220)
        : tubularSegments;
  const effectiveRadialSegments = radialSegments;

  // twistCount is shader-driven; geometry only rebuilds on base tube shape changes.
  const geometry = useMemo(() => {
    const curve = new MobiusCurve(pathRadius);
    const baseGeometry = new THREE.TubeGeometry(
      curve,
      Math.max(120, effectiveTubularSegments),
      tubeRadius,
      Math.max(4, effectiveRadialSegments),
      true,
    );
    const weldedGeometry = mergeVertices(baseGeometry, 0.001);
    weldedGeometry.computeVertexNormals();
    const facetedGeometry = toCreasedNormals(weldedGeometry, Math.PI / 5);
    baseGeometry.dispose();
    weldedGeometry.dispose();
    return facetedGeometry;
  }, [effectiveRadialSegments, effectiveTubularSegments, pathRadius, tubeRadius]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    targetColorRef.current.set(color);
  }, [color]);

  useEffect(() => {
    if (reducedMotion) return;
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const delta = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      scrollImpulseRef.current = Math.max(
        -0.15,
        Math.min(0.15, scrollImpulseRef.current + delta * 0.002),
      );
      scrollLiftRef.current = Math.min(0.42, window.scrollY * 0.00045);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedMotion]);

  // onBeforeCompile injects:
  //   1. Rodrigues rotation — twist the cross-section around the path tangent
  //      (uTwistCount Ã— uTwistAmount controls total rotation; 0=torus, 1=MÃ¶bius)
  //   2. Compression wave — sinusoidal pinch traveling the path (tokens preset)
  //   3. Glitch — pseudo-random vertex displacement (glitch preset)
  const onBeforeCompile = useCallback((shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms['uTime'] = { value: 0 };
    shader.uniforms['uPathRadius'] = { value: 1.0 };
    shader.uniforms['uBlend'] = { value: 0.08 };
    shader.uniforms['uTwistCount'] = { value: 1.0 };
    shader.uniforms['uTwistAmount'] = { value: 1.0 };
    shader.uniforms['uRollSpeed'] = { value: 0.5 };
    shader.uniforms['uPixelate'] = { value: 0 };
    shader.uniforms['uPixelGrid'] = { value: 32 };
    shader.uniforms['uPixelShuffle'] = { value: 0 };
    shader.uniforms['uMouse'] = { value: new THREE.Vector3(0, 0, 0) };
    shader.uniforms['uMouseVelocity'] = { value: new THREE.Vector3(0, 0, 0) };
    shader.uniforms['uMouseScreen'] = { value: new THREE.Vector2(0.5, 0.5) };
    shader.uniforms['uMouseFlow'] = { value: new THREE.Vector2(0, 0) };
    shader.uniforms['uDragOffset'] = { value: new THREE.Vector2(0, 0) };
    shader.uniforms['uDragTarget'] = { value: new THREE.Vector3(0, 0, 0) };
    shader.uniforms['uDragDirection'] = { value: new THREE.Vector3(1, 0, 0) };
    shader.uniforms['uObjectCenter'] = { value: new THREE.Vector3(0, 0, 0) };
    shader.uniforms['uStretchRadius'] = { value: 1.2 };
    shader.uniforms['uStretchStrength'] = { value: 0.18 };
    shader.uniforms['uLiquidStrength'] = { value: 0 };
    shader.uniforms['uRippleRadius'] = { value: 0.5 };
    shader.uniforms['uRippleFrequency'] = { value: 3.0 };
    shader.uniforms['uLiquidWaveSpeed'] = { value: 0.0 };
    shader.uniforms['uSealedEdges'] = { value: 1.0 };
    shader.uniforms['uMagneticDrag'] = { value: 1.15 };
    shader.uniforms['uMagneticSwirl'] = { value: 0.9 };
    shader.uniforms['uMagneticDepth'] = { value: 0.22 };
    shader.uniforms['uWaveAmplitude'] = { value: 0 };
    shader.uniforms['uWaveFrequency'] = { value: 3 };
    shader.uniforms['uWaveSpeed'] = { value: 1.8 };
    shader.uniforms['uGlitchIntensity'] = { value: 0 };
    shader.uniforms['uSpringTime'] = { value: 10 };
    shader.uniforms['uIsDragging'] = { value: 0 };
    shader.uniforms['uThinning'] = { value: 0.5 };
    shader.uniforms['uDragAngle'] = { value: 0 };

    // ── Shader assembly: stitch named GLSL constants into Three.js chunks ──────
    shader.vertexShader = shader.vertexShader.replace('#include <common>', MOBIUS_VERTEX_COMMON);
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      MOBIUS_VERTEX_NORMAL,
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      MOBIUS_VERTEX_DEFORMATIONS,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      MOBIUS_FRAGMENT_COMMON,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec4 diffuseColor = vec4( diffuse, opacity );',
      MOBIUS_FRAGMENT_PATCHES,
    );

    shaderRef.current = shader;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;
    const safeDelta = Math.min(delta, 0.033);
    const canvasRect = state.gl.domElement.getBoundingClientRect();
    const canvasWidth = Math.max(canvasRect.width || state.size.width || 1, 1);
    const canvasHeight = Math.max(canvasRect.height || state.size.height || 1, 1);

    // ── Color lerp ────────────────────────────────────────────────────────────
    if (materialRef.current) {
      currentColorRef.current.lerp(targetColorRef.current, 1 - Math.exp(-safeDelta / 0.18));
      materialRef.current.color.copy(currentColorRef.current);
      materialRef.current.emissive.copy(currentColorRef.current);
    }

    let entranceProgress = 1;

    if (initialDropWarmupFramesRef.current < 2) {
      initialDropWarmupFramesRef.current += 1;
      entranceProgress = 0;
    } else {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (initialDropStartRef.current === null) {
        initialDropStartRef.current = now;
      }
      const elapsed = now - initialDropStartRef.current;
      const rawProgress = Math.min(1, elapsed / 700);
      // Cubic ease out
      entranceProgress = 1 - Math.pow(1 - rawProgress, 3);
    }

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = emissiveIntensity * entranceProgress;
    }

    // Go back to using the standard lerp duration!
    const lerpFactor = reducedMotion ? 0.12 : 1 - Math.exp(-safeDelta / lerpDurationRef.current);
    // Fast lerp — used for look-at rotation so it tracks the cursor directly,
    //
    const lookRotLerp = reducedMotion ? lerpFactor : 1 - Math.exp(-safeDelta / 0.1);

    let resolvedAnchorX = layoutPositionX;
    let resolvedAnchorY = layoutPositionY;
    const overviewScrollLift =
      activePreset === 'home' && !layoutAnchorSelector ? scrollLiftRef.current : 0;

    if (layoutAnchorSelector) {
      const now = state.clock.getElapsedTime();
      const shouldQueryDom = now - lastDomQueryTimeRef.current > anchorQueryThrottleMs / 1000;

      if (shouldQueryDom) {
        if (!anchorElementRef.current || !document.body.contains(anchorElementRef.current)) {
          anchorElementRef.current = document.querySelector<HTMLElement>(layoutAnchorSelector);
        }

        const anchorElement = anchorElementRef.current;
        if (anchorElement) {
          const rect = anchorElement.getBoundingClientRect();
          cachedAnchorRectRef.current = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          };
          lastDomQueryTimeRef.current = now;
        }
      }

      const rect = cachedAnchorRectRef.current;
      if (rect.width > 0 || rect.height > 0) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const ndcX = ((centerX - canvasRect.left) / canvasWidth) * 2 - 1;
        const ndcY = -((centerY - canvasRect.top) / canvasHeight) * 2 + 1;

        const cameraDir = state.camera.getWorldDirection(scratchVec5.current).negate();
        anchorPlaneRef.current.setFromNormalAndCoplanarPoint(
          cameraDir,
          scratchVec.current.set(0, 0, layoutPositionZ),
        );
        anchorRaycasterRef.current.setFromCamera(
          anchorNdcRef.current.set(ndcX, ndcY),
          state.camera,
        );
        anchorRaycasterRef.current.ray.intersectPlane(
          anchorPlaneRef.current,
          anchorWorldRef.current,
        );
        resolvedAnchorX = anchorWorldRef.current.x;
        resolvedAnchorY = anchorWorldRef.current.y;

        if (
          !navAnchorPrimedRef.current &&
          layoutAnchorSelector === '[data-mobius-anchor="shell-top-nav-mobius"]'
        ) {
          anchorDisplayRef.current.x = resolvedAnchorX;
          anchorDisplayRef.current.y = resolvedAnchorY;
          navAnchorPrimedRef.current = true;
        }
      }
    }

    const anchorLerp = reducedMotion ? 1 : 1 - Math.exp(-safeDelta / 0.22);
    anchorDisplayRef.current.x += (resolvedAnchorX - anchorDisplayRef.current.x) * anchorLerp;
    anchorDisplayRef.current.y += (resolvedAnchorY - anchorDisplayRef.current.y) * anchorLerp;

    const anchorX = anchorDisplayRef.current.x;
    const anchorY = anchorDisplayRef.current.y;
    const isShellTopNavRoute =
      layoutAnchorSelector === '[data-mobius-anchor="shell-top-nav-mobius"]';
    const navCursorScale = isShellTopNavRoute ? 0.35 : 1;
    const navParallaxScale = isShellTopNavRoute ? 0 : 1;
    const navScrollScale = isShellTopNavRoute ? 1 - navScrollProgress * 0.08 : 1;
    const navScrollLift = isShellTopNavRoute ? navScrollProgress * 0.04 : 0;
    const routeEntryLift = 0;

    let targetX = reducedMotion
      ? anchorX
      : anchorX - mouseRef.current.x * mouseInfluence * 0.4 * navCursorScale * navParallaxScale;

    let targetY = reducedMotion
      ? anchorY + overviewScrollLift - navScrollLift - routeEntryLift
      : anchorY -
        mouseRef.current.y * mouseInfluence * 0.2 * navCursorScale * navParallaxScale +
        overviewScrollLift -
        navScrollLift -
        routeEntryLift;

    if (isCoarsePointer && !dragStateRef.current.active) {
      targetX = anchorX;
      targetY = anchorY + overviewScrollLift - navScrollLift - routeEntryLift;
    }

    // Normalize against a fixed viewport-height baseline so the Mobius keeps
    // the same perceived size across tall and short windows.
    const viewportHeightScale = VIEWPORT_HEIGHT_BASELINE / Math.max(state.size.height, 1);
    const targetScale =
      layoutScale *
      scale *
      navScrollScale *
      entranceProgress *
      viewportHeightScale *
      navScaleMultiplier;
    const hoverTarget = navAcrylicHovered ? 1 : 0;
    navHoverProgressRef.current +=
      (hoverTarget - navHoverProgressRef.current) * (reducedMotion ? 0.18 : 0.09);
    const hoverEase =
      navHoverProgressRef.current *
      navHoverProgressRef.current *
      (3 - 2 * navHoverProgressRef.current);
    const hoverPathScale = 1 + hoverEase * 0.22;
    // --- LEASH / TENSION LOGIC ---
    const MAX_STRETCH = 1.4;
    const mouseVector = dragMouseVectorRef.current.set(
      dragStateRef.current.targetX,
      dragStateRef.current.targetY,
    );
    const currentDist = mouseVector.length();

    const positionedTargetX = targetX + snapOffsetRef.current.x;
    const positionedTargetY = targetY + snapOffsetRef.current.y;

    groupRef.current.position.x += (positionedTargetX - groupRef.current.position.x) * lerpFactor;
    groupRef.current.position.y += (positionedTargetY - groupRef.current.position.y) * lerpFactor;
    groupRef.current.position.z += (layoutPositionZ - groupRef.current.position.z) * lerpFactor;

    // Use the logo's actual current on-screen position as the look-at center
    // after position/parallax have been applied for this frame.
    groupRef.current.getWorldPosition(scratchVec.current);
    scratchVec.current.project(state.camera);
    const lookDx = mouseRef.current.x - scratchVec.current.x;
    const lookDy = mouseRef.current.y - scratchVec.current.y;
    const lookDist = Math.sqrt(lookDx * lookDx + lookDy * lookDy);

    let targetLookX = lookDx;
    let targetLookY = lookDy;
    if (lookDist > 1.0) {
      targetLookX = lookDx / lookDist;
      targetLookY = lookDy / lookDist;
    }

    if (isCoarsePointer && !dragStateRef.current.active) {
      targetLookX = 0;
      targetLookY = 0;
    }

    if (dragStateRef.current.active && currentDist > 0.0001) {
      const dragLookX = mouseVector.x / currentDist;
      const dragLookY = mouseVector.y / currentDist;
      const dragTiltInfluence = THREE.MathUtils.clamp(currentDist / MAX_STRETCH, 0, 1);
      targetLookX = THREE.MathUtils.lerp(targetLookX, dragLookX, dragTiltInfluence * 0.85);
      targetLookY = THREE.MathUtils.lerp(targetLookY, dragLookY, dragTiltInfluence * 0.85);
    }

    const LOOK_SENS_Y = 0.62 * navCursorScale;
    const LOOK_SENS_X = 0.62 * navCursorScale;
    const targetRotX = reducedMotion
      ? layoutRotationX
      : layoutRotationX - targetLookY * LOOK_SENS_X;
    const targetRotY = reducedMotion
      ? layoutRotationY
      : layoutRotationY + targetLookX * LOOK_SENS_Y;
    const targetRotZ = layoutRotationZ + scrollImpulseRef.current;

    groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * lookRotLerp;
    groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * lookRotLerp;
    groupRef.current.rotation.z += (targetRotZ - groupRef.current.rotation.z) * lerpFactor;
    groupRef.current.scale.x +=
      (targetScale * hoverPathScale - groupRef.current.scale.x) * lerpFactor;
    groupRef.current.scale.y +=
      (targetScale * hoverPathScale - groupRef.current.scale.y) * lerpFactor;
    groupRef.current.scale.z += (targetScale - groupRef.current.scale.z) * lerpFactor;

    meshRef.current.rotation.y += (reducedMotion ? rotationSpeed * 0.2 : rotationSpeed) * delta;
    const routeWarpScaleX = 1 + routeTransitionDecay * 0.004;
    const routeWarpScaleY = 1 - routeTransitionDecay * 0.002;
    const routeWarpScaleZ = 1 + routeTransitionDecay * 0.006;
    meshRef.current.scale.x +=
      (routeWarpScaleX - meshRef.current.scale.x) * (reducedMotion ? 0.16 : 0.08);
    meshRef.current.scale.y +=
      (routeWarpScaleY - meshRef.current.scale.y) * (reducedMotion ? 0.16 : 0.08);
    meshRef.current.scale.z +=
      (routeWarpScaleZ - meshRef.current.scale.z) * (reducedMotion ? 0.16 : 0.08);
    scrollImpulseRef.current *= reducedMotion ? 0.72 : 0.88;

    const interactionUpdateModulo =
      dragStateRef.current.active || routeTransitionDecay > 0.001
        ? 1
        : isCoarsePointer
          ? performanceTier === 'low'
            ? 3
            : 2
          : performanceTier === 'high'
            ? 1
            : performanceTier === 'low'
              ? 3
              : 2;
    const shouldUpdateInteraction =
      interactionUpdateModulo === 1 ||
      lowTierInteractionFrameRef.current++ % interactionUpdateModulo === 0;
    let screenX = cachedScreenStateRef.current.screenX || canvasRect.left + canvasWidth * 0.5;
    let screenY = cachedScreenStateRef.current.screenY || canvasRect.top + canvasHeight * 0.5;
    let screenLocalX = cachedScreenStateRef.current.screenLocalX || canvasWidth * 0.5;
    let screenLocalY = cachedScreenStateRef.current.screenLocalY || canvasHeight * 0.5;
    let projectedRadius = cachedScreenStateRef.current.projectedRadius || 0;

    if (shouldUpdateInteraction) {
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      const bounds = geometry.boundingBox;

      if (bounds) {
        const min = bounds.min;
        const max = bounds.max;
        const corners = [
          [min.x, min.y, min.z],
          [min.x, min.y, max.z],
          [min.x, max.y, min.z],
          [min.x, max.y, max.z],
          [max.x, min.y, min.z],
          [max.x, min.y, max.z],
          [max.x, max.y, min.z],
          [max.x, max.y, max.z],
        ] as const;

        let minScreenX = Number.POSITIVE_INFINITY;
        let maxScreenX = Number.NEGATIVE_INFINITY;
        let minScreenY = Number.POSITIVE_INFINITY;
        let maxScreenY = Number.NEGATIVE_INFINITY;

        for (const [x, y, z] of corners) {
          scratchVec.current.set(x, y, z);
          meshRef.current.localToWorld(scratchVec.current);
          scratchVec.current.project(state.camera);

          const px = (scratchVec.current.x * 0.5 + 0.5) * canvasWidth;
          const py = (-scratchVec.current.y * 0.5 + 0.5) * canvasHeight;
          minScreenX = Math.min(minScreenX, px);
          maxScreenX = Math.max(maxScreenX, px);
          minScreenY = Math.min(minScreenY, py);
          maxScreenY = Math.max(maxScreenY, py);
        }

        if (
          Number.isFinite(minScreenX) &&
          Number.isFinite(maxScreenX) &&
          Number.isFinite(minScreenY) &&
          Number.isFinite(maxScreenY)
        ) {
          screenLocalX = (minScreenX + maxScreenX) * 0.5;
          screenLocalY = (minScreenY + maxScreenY) * 0.5;
          screenX = canvasRect.left + screenLocalX;
          screenY = canvasRect.top + screenLocalY;
          projectedRadius = Math.max(maxScreenX - minScreenX, maxScreenY - minScreenY) * 0.5;
        }
      }

      cachedScreenStateRef.current = {
        screenX,
        screenY,
        screenLocalX,
        screenLocalY,
        projectedRadius,
      };
    }

    const shouldAutoCenterToAnchor = Boolean(layoutAnchorSelector) && !dragStateRef.current.active;
    if (meshGroupRef.current) {
      let targetVisualOffsetX = cachedVisualOffsetRef.current.x;
      let targetVisualOffsetY = cachedVisualOffsetRef.current.y;

      if (shouldUpdateInteraction) {
        targetVisualOffsetX = 0;
        targetVisualOffsetY = 0;

        if (shouldAutoCenterToAnchor) {
          groupRef.current.getWorldPosition(scratchVec2.current);
          scratchVec3.current.copy(scratchVec2.current).project(state.camera);

          const visualCenterNdcX = (screenLocalX / canvasWidth) * 2 - 1;
          const visualCenterNdcY = -(screenLocalY / canvasHeight) * 2 + 1;

          centerPlaneRef.current.setFromNormalAndCoplanarPoint(
            state.camera.getWorldDirection(scratchVec5.current).negate(),
            scratchVec2.current,
          );
          originRaycasterRef.current.setFromCamera(
            originNdcRef.current.set(scratchVec3.current.x, scratchVec3.current.y),
            state.camera,
          );
          visualRaycasterRef.current.setFromCamera(
            visualNdcRef.current.set(visualCenterNdcX, visualCenterNdcY),
            state.camera,
          );
          originRaycasterRef.current.ray.intersectPlane(
            centerPlaneRef.current,
            scratchVec3.current,
          );
          visualRaycasterRef.current.ray.intersectPlane(
            centerPlaneRef.current,
            scratchVec4.current,
          );
          scratchVec3.current.sub(scratchVec4.current);
          scratchVec3.current.applyQuaternion(
            groupRef.current.getWorldQuaternion(scratchQuat.current).invert(),
          );
          targetVisualOffsetX = scratchVec3.current.x;
          targetVisualOffsetY = scratchVec3.current.y;
        }

        cachedVisualOffsetRef.current = { x: targetVisualOffsetX, y: targetVisualOffsetY };
      }

      const visualCenterEase = reducedMotion ? 0.32 : 0.14;
      meshGroupRef.current.position.x +=
        (targetVisualOffsetX - meshGroupRef.current.position.x) * visualCenterEase;
      meshGroupRef.current.position.y +=
        (targetVisualOffsetY - meshGroupRef.current.position.y) * visualCenterEase;
      meshGroupRef.current.position.z += (0 - meshGroupRef.current.position.z) * visualCenterEase;
      meshGroupRef.current.updateMatrixWorld();
    }

    const isPortfolioHomeRoute =
      layoutAnchorSelector === '[data-mobius-anchor="portfolio-home-mobius"]';
    const hotspotScale = isShellTopNavRoute ? navCursorScale : isPortfolioHomeRoute ? 0.82 : 1;
    interactionBoundsRef.current.x = screenX;
    interactionBoundsRef.current.y = screenY;
    interactionBoundsRef.current.size = Math.max(
      120 * hotspotScale,
      projectedRadius * 2.35 * hotspotScale,
    );
    interactionBoundsRef.current.visible = true;

    if (shouldUpdateInteraction) {
      const hoverCenterNdcX = (screenLocalX / canvasWidth) * 2 - 1;
      const hoverCenterNdcY = -(screenLocalY / canvasHeight) * 2 + 1;
      const hoverCenterDx = mouseRef.current.x - hoverCenterNdcX;
      const hoverCenterDy = mouseRef.current.y - hoverCenterNdcY;
      const hoverDistance = Math.sqrt(
        hoverCenterDx * hoverCenterDx + hoverCenterDy * hoverCenterDy,
      );
      const hoverRadius = 1.2;
      const hoverT = THREE.MathUtils.clamp(1 - hoverDistance / hoverRadius, 0, 1);
      const hoverProximity = hoverT * hoverT * (3 - 2 * hoverT);
      cachedHoverProximityRef.current = hoverProximity;
      hoverProximityRef.current +=
        (hoverProximity - hoverProximityRef.current) * (reducedMotion ? 0.07 : 0.12);

      const cameraDir = state.camera.getWorldDirection(scratchVec5.current).negate();
      pointerPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, groupRef.current.position);
      pointerRaycasterRef.current.setFromCamera(
        pointerNdcRef.current.set(mouseRef.current.x, mouseRef.current.y),
        state.camera,
      );
      pointerRaycasterRef.current.ray.intersectPlane(
        pointerPlaneRef.current,
        pointerWorldRef.current,
      );
      mouseScreenRef.current.set(mouseRef.current.x * 0.5 + 0.5, mouseRef.current.y * 0.5 + 0.5);
      gooPointerRef.current.lerp(pointerWorldRef.current, reducedMotion ? 0.04 : magneticLag);
      pointerVelocityScratchRef.current
        .copy(pointerWorldRef.current)
        .sub(previousPointerWorldRef.current)
        .multiplyScalar(1 / Math.max(delta, 0.0001));
      pointerVelocityRef.current.lerp(
        pointerVelocityScratchRef.current,
        reducedMotion ? 0.08 : 0.18,
      );
      previousPointerWorldRef.current.copy(pointerWorldRef.current);
      mouseVelocity2DScratchRef.current
        .copy(mouseScreenRef.current)
        .sub(previousMouseScreenRef.current)
        .multiplyScalar(1 / Math.max(delta, 0.0001));
      mouseVelocity2DRef.current.lerp(
        mouseVelocity2DScratchRef.current,
        reducedMotion ? 0.08 : 0.2,
      );
      previousMouseScreenRef.current.copy(mouseScreenRef.current);
    } else {
      hoverProximityRef.current +=
        (cachedHoverProximityRef.current - hoverProximityRef.current) *
        (reducedMotion ? 0.05 : 0.08);
    }
    dragOffsetRef.current.x +=
      (dragStateRef.current.targetX - dragOffsetRef.current.x) *
      (dragStateRef.current.active ? 0.22 : 0.1);
    dragOffsetRef.current.y +=
      (dragStateRef.current.targetY - dragOffsetRef.current.y) *
      (dragStateRef.current.active ? 0.22 : 0.1);
    dragTargetWorldRef.current.copy(pointerWorldRef.current);
    dragDirectionWorldRef.current.copy(pointerWorldRef.current).sub(groupRef.current.position);
    if (dragDirectionWorldRef.current.lengthSq() < 0.0001) {
      dragDirectionWorldRef.current.set(1, 0, 0);
    } else {
      dragDirectionWorldRef.current.normalize();
    }

    // Push all deformation uniforms each frame — no re-render cost
    if (shaderRef.current) {
      const s = useMobiusStore.getState();
      const isDragging = dragStateRef.current.active;
      const routeWaveAmplitude = routeTransitionDecay * 0.0;
      const routeWaveFrequency = routeTransitionDecay * 0.0;
      const routeWaveSpeed = routeTransitionDecay * 0.0;
      const routeTwistLift = routeTransitionDecay * 0.0;
      const hoverPixelCurve = hoverProximityRef.current * hoverProximityRef.current;
      const hoverHoldLift = hoverPixelCurve * Math.min(0.95, s.glitchIntensity * 0.7);
      const routePixelLift = routeTransitionDecay * Math.min(1.1, s.glitchIntensity);
      const shuffleStrength = Math.max(hoverPixelCurve, Math.min(1, routeTransitionDecay * 1.2));
      const pixelateStrength =
        s.distortionMode === 'linear' ? Math.min(1, hoverHoldLift + routePixelLift) : 0;
      const liquidEnvelope =
        s.distortionMode === 'magnetic' && !isCoarsePointer
          ? THREE.MathUtils.clamp(hoverProximityRef.current + routeTransitionDecay * 0.65, 0, 1)
          : 0;
      const timeStep = reducedMotion ? delta * 0.35 : delta;
      shaderRef.current.uniforms['uTime'].value += timeStep;
      shaderRef.current.uniforms['uPathRadius'].value = s.pathRadius;
      shaderRef.current.uniforms['uBlend'].value = s.blend;
      shaderRef.current.uniforms['uTwistCount'].value = s.twistCount;
      shaderRef.current.uniforms['uTwistAmount'].value = s.uTwistAmount + routeTwistLift;
      shaderRef.current.uniforms['uRollSpeed'].value = reducedMotion
        ? s.rollSpeed * 0.35
        : s.rollSpeed;
      shaderRef.current.uniforms['uPixelate'].value = pixelateStrength;
      shaderRef.current.uniforms['uPixelGrid'].value = s.gridSize;
      shaderRef.current.uniforms['uPixelShuffle'].value =
        s.distortionMode === 'linear' ? shuffleStrength : 0;
      shaderRef.current.uniforms['uMouse'].value.lerp(
        gooPointerRef.current,
        reducedMotion ? 0.04 : 0.08,
      );
      shaderRef.current.uniforms['uMouseVelocity'].value.lerp(
        pointerVelocityRef.current,
        reducedMotion ? 0.08 : 0.16,
      );
      shaderRef.current.uniforms['uMouseScreen'].value.lerp(
        mouseScreenRef.current,
        reducedMotion ? 0.08 : 0.22,
      );
      shaderRef.current.uniforms['uMouseFlow'].value.lerp(
        mouseVelocity2DRef.current,
        reducedMotion ? 0.08 : 0.18,
      );
      shaderRef.current.uniforms['uDragOffset'].value.lerp(
        dragOffsetRef.current,
        reducedMotion ? 0.1 : 0.2,
      );
      shaderRef.current.uniforms['uDragTarget'].value.lerp(
        dragTargetWorldRef.current,
        reducedMotion ? 0.1 : 0.2,
      );
      if (groupRef.current) {
        groupRef.current.updateMatrixWorld();
        const invMatrix = scratchMat4.current.copy(groupRef.current.matrixWorld).invert();
        const localCursor = scratchVec.current
          .copy(pointerWorldRef.current)
          .applyMatrix4(invMatrix);
        const normalizedLocalCursor = scratchVec2.current.copy(localCursor).normalize();
        shaderRef.current.uniforms['uDragAngle'].value = Math.atan2(localCursor.y, localCursor.x);
        shaderRef.current.uniforms['uDragDirection'].value.copy(normalizedLocalCursor);
      }
      shaderRef.current.uniforms['uObjectCenter'].value.copy(groupRef.current.position);
      shaderRef.current.uniforms['uStretchRadius'].value = THREE.MathUtils.lerp(
        0.9,
        3.4,
        THREE.MathUtils.clamp(s.rippleRadius / 5, 0, 1),
      );
      const isReleaseFrame = !isDragging && wasDraggingRef.current;
      if (isReleaseFrame) {
        // Capture stretch direction before zeroing — teleport the logo along it
        const mag = dragOffsetRef.current.length();
        releaseStrengthRef.current = Math.min(mag / 1.4, 1);
        if (mag > 0.08) {
          const jumpDist =
            Math.min(mag, isCoarsePointer ? 3.4 : 3) * (isCoarsePointer ? 0.24 : 0.044);
          snapTargetOffsetRef.current.x = -(dragOffsetRef.current.x / mag) * jumpDist;
          snapTargetOffsetRef.current.y = -(dragOffsetRef.current.y / mag) * jumpDist;
          snapPhaseRef.current = 'return';
        }
        dragOffsetRef.current.x = 0;
        dragOffsetRef.current.y = 0;
        dragStateRef.current.targetX = 0;
        dragStateRef.current.targetY = 0;
      }

      // Snap state machine: glide briefly into the release jump, then ease it back to origin.
      if (snapPhaseRef.current === 'return') {
        const snapIn = reducedMotion ? 0.18 : isCoarsePointer ? 0.6 : 0.6;
        const snapOut = reducedMotion ? 0.11 : isCoarsePointer ? 0.05 : 0.055;
        snapOffsetRef.current.x +=
          (snapTargetOffsetRef.current.x - snapOffsetRef.current.x) * snapIn;
        snapOffsetRef.current.y +=
          (snapTargetOffsetRef.current.y - snapOffsetRef.current.y) * snapIn;
        snapTargetOffsetRef.current.x += (0 - snapTargetOffsetRef.current.x) * snapOut;
        snapTargetOffsetRef.current.y += (0 - snapTargetOffsetRef.current.y) * snapOut;
        if (
          Math.abs(snapOffsetRef.current.x) < 0.001 &&
          Math.abs(snapOffsetRef.current.y) < 0.001 &&
          Math.abs(snapTargetOffsetRef.current.x) < 0.001 &&
          Math.abs(snapTargetOffsetRef.current.y) < 0.001
        ) {
          snapOffsetRef.current.x = 0;
          snapOffsetRef.current.y = 0;
          snapTargetOffsetRef.current.x = 0;
          snapTargetOffsetRef.current.y = 0;
          snapPhaseRef.current = 'idle';
        }
      }

      const rawStretch = isReleaseFrame ? 0 : dragOffsetRef.current.length();
      const MAX_STRETCH = 1.4;
      shaderRef.current.uniforms['uStretchStrength'].value = Math.min(rawStretch, MAX_STRETCH);
      shaderRef.current.uniforms['uLiquidStrength'].value =
        s.distortionMode === 'magnetic' ? s.liquidStrength * liquidEnvelope : 0;
      shaderRef.current.uniforms['uRippleRadius'].value = s.rippleRadius;
      shaderRef.current.uniforms['uRippleFrequency'].value = s.rippleFrequency;
      shaderRef.current.uniforms['uLiquidWaveSpeed'].value = s.waveSpeed;
      shaderRef.current.uniforms['uSealedEdges'].value = s.sealedEdges ? 1 : 0;
      shaderRef.current.uniforms['uMagneticDrag'].value = s.magneticDrag;
      shaderRef.current.uniforms['uMagneticSwirl'].value = s.magneticSwirl;
      shaderRef.current.uniforms['uMagneticDepth'].value = s.magneticDepth;
      shaderRef.current.uniforms['uGlitchIntensity'].value = s.uGlitchIntensity;
      shaderRef.current.uniforms['uIsDragging'].value = isDragging ? 1 : 0;
      shaderRef.current.uniforms['uThinning'].value = 0.5;

      // Update springTime first so shockwave can read the current post-release value
      if (isDragging) {
        shaderRef.current.uniforms['uSpringTime'].value = 0;
      } else if (wasDraggingRef.current || shaderRef.current.uniforms['uSpringTime'].value < 2.0) {
        shaderRef.current.uniforms['uSpringTime'].value += delta;
      }

      // Shockwave pulse: quick rise, decays to zero over ~0.4 s after release
      const springTime = shaderRef.current.uniforms['uSpringTime'].value;
      const shockwaveAmp =
        !isDragging && springTime < 0.55
          ? 0.1 * Math.exp(-springTime * 7.5) * releaseStrengthRef.current
          : 0;
      const shockwaveFreq = shockwaveAmp > 0.005 ? 1.4 : 0;

      shaderRef.current.uniforms['uWaveAmplitude'].value =
        s.uWaveAmplitude + routeWaveAmplitude + shockwaveAmp;
      shaderRef.current.uniforms['uWaveFrequency'].value =
        s.uWaveFrequency + routeWaveFrequency + shockwaveFreq;
      shaderRef.current.uniforms['uWaveSpeed'].value = s.uWaveSpeed + routeWaveSpeed;

      wasDraggingRef.current = isDragging;
    }

    // ── Telemetry sampling ───────────────────────────────────────────────────
    // Read renderer.info after all draw calls for this frame have been issued.
    const info = state.gl.info;
    const frameMs = delta * 1000;
    const geometries = info.memory.geometries;
    const textures = info.memory.textures;
    const drawCalls = info.render.calls;
    const triangles = info.render.triangles;
    // GPU memory: rough estimate — each geometry counts ~1 MB, each texture ~4 MB.
    // Three.js doesn't expose a precise byte count so we use renderer.info as proxy.
    const gpuMemoryMb = geometries * 1 + textures * 4;

    const budget = PERFORMANCE_BUDGETS[performanceTier];
    const violations: string[] = [];
    if (frameMs > budget.maxFrameMs)
      violations.push(`frameMs ${frameMs.toFixed(1)} > ${budget.maxFrameMs}`);
    if (gpuMemoryMb > budget.maxGpuMemoryMb)
      violations.push(`gpuMemoryMb ${gpuMemoryMb} > ${budget.maxGpuMemoryMb}`);
    if (drawCalls > budget.maxDrawCalls)
      violations.push(`drawCalls ${drawCalls} > ${budget.maxDrawCalls}`);
    if (triangles > budget.maxTriangles)
      violations.push(`triangles ${triangles} > ${budget.maxTriangles}`);

    const telemetry = perfTelemetryRef.current;
    telemetry.frameMs = frameMs;
    telemetry.geometries = geometries;
    telemetry.textures = textures;
    telemetry.drawCalls = drawCalls;
    telemetry.triangles = triangles;
    telemetry.gpuMemoryMb = gpuMemoryMb;
    telemetry.tier = performanceTier;
    telemetry.budget = {
      maxFrameMs: budget.maxFrameMs,
      maxGpuMemoryMb: budget.maxGpuMemoryMb,
      maxDrawCalls: budget.maxDrawCalls,
      maxTriangles: budget.maxTriangles,
      fpsFloor: budget.fpsFloor,
    };
    telemetry.violations = violations;

    // FPS tracking + sustained-drop alert (opt-in via isPerfDebugEnabled).
    if (perfDebugRef.current) {
      fpsCounterRef.current.push(delta);
      const fpsAvg = fpsCounterRef.current.avg();
      telemetry.fpsAvg = fpsAvg;
      budgetWatcherRef.current(fpsAvg, performance.now());
    }

    if (typeof window !== 'undefined') {
      // @ts-expect-error — dev/test telemetry hook
      window.__mobiusPerfTelemetry = telemetry;
    }
  });

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      rotation={initialRotation}
      scale={initialScale}
    >
      <group ref={meshGroupRef}>
        <mesh ref={meshRef} geometry={geometry}>
          <meshPhysicalMaterial
            ref={materialRef}
            wireframe={wireframe}
            flatShading={false}
            transmission={transmission}
            ior={1.1}
            roughness={roughness}
            thickness={thickness}
            metalness={metalness}
            emissive={tokenValues.primitive.color.blue['500']}
            emissiveIntensity={emissiveIntensity}
            color={tokenValues.primitive.color.blue['500']}
            opacity={1}
            transparent
            side={THREE.DoubleSide}
            envMapIntensity={0.22}
            dithering
            clearcoat={0}
            clearcoatRoughness={0}
            reflectivity={0.42}
            onBeforeCompile={onBeforeCompile}
            customProgramCacheKey={() => `mobius-deform-v2-${flatShading ? 'flat' : 'smooth'}`}
          />
        </mesh>
      </group>
    </group>
  );
}

export function MobiusScene({
  mouseRef,
  lerpDurationRef,
  dragStateRef,
  interactionBoundsRef,
  navScaleMultiplier = 1,
  isCoarsePointer = false,
  performanceTierOverride,
}: {
  mouseRef: MouseRef;
  lerpDurationRef: LerpDurationRef;
  dragStateRef: DragStateRef;
  interactionBoundsRef: InteractionBoundsRef;
  navScaleMultiplier?: number;
  isCoarsePointer?: boolean;
  performanceTierOverride?: PerformanceTier;
}) {
  const bloomIntensity = useMobiusStore((s) => s.bloomIntensity);
  const bloomThreshold = useMobiusStore((s) => s.bloomThreshold);
  const noiseOpacity = useMobiusStore((s) => s.noiseOpacity);
  const vignetteIntensity = useMobiusStore((s) => s.vignetteIntensity);
  const storePerformanceTier = useMobiusStore((s) => s.performanceTier);
  const reducedMotion = useMobiusStore((s) => s.reducedMotion);
  const _glitchProgress = useMobiusStore((s) => s.glitchProgress);
  const _glitchIntensity2 = useMobiusStore((s) => s.glitchIntensity);
  const _gridSize2 = useMobiusStore((s) => s.gridSize);
  const _axisLock = useMobiusStore((s) => s.axisLock);
  const _magneticRadius = useMobiusStore((s) => s.magneticRadius);
  const _magneticStrength = useMobiusStore((s) => s.magneticStrength);
  const routeSplashActive = useMobiusStore((s) => s.routeSplashActive);
  const routeSplashStartedAt = useMobiusStore((s) => s.routeSplashStartedAt);
  const routeSplashDurationMs = useMobiusStore((s) => s.routeSplashDurationMs);
  const _routeSplashStrength = useMobiusStore((s) => s.routeSplashStrength);
  const clearRouteSplash = useMobiusStore((s) => s.clearRouteSplash);
  const [routeSplashDecay, setRouteSplashDecay] = useState(0);
  const performanceTier = performanceTierOverride ?? storePerformanceTier;

  const effectiveBloom = reducedMotion ? 0 : bloomIntensity;
  const effectiveNoise = reducedMotion ? 0 : noiseOpacity;
  const splashDecay = reducedMotion ? 0 : routeSplashDecay;
  const tunedBloomIntensity = effectiveBloom * 0.7;
  const tunedBloomThreshold = Math.max(0.18, bloomThreshold);
  const shouldRenderBloom = performanceTier === 'high' && tunedBloomIntensity > 0;
  const shouldRenderNoise =
    performanceTier === 'high' && !reducedMotion && (effectiveNoise > 0 || vignetteIntensity > 0);
  const shouldRenderComposer = shouldRenderBloom || shouldRenderNoise;

  useEffect(() => {
    if (!routeSplashActive || routeSplashDurationMs <= 0 || reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRouteSplashDecay(0);
      return;
    }

    let rafId = 0;

    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const progress = Math.min(1, (now - routeSplashStartedAt) / routeSplashDurationMs);
      const decay = Math.max(0, 1 - progress);
      setRouteSplashDecay(decay * decay);

      if (progress >= 1) {
        clearRouteSplash();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    clearRouteSplash,
    reducedMotion,
    routeSplashActive,
    routeSplashDurationMs,
    routeSplashStartedAt,
  ]);

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} frames={1} />
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, -2]} intensity={3} />
      <MobiusMesh
        mouseRef={mouseRef}
        lerpDurationRef={lerpDurationRef}
        routeTransitionDecay={splashDecay}
        dragStateRef={dragStateRef}
        interactionBoundsRef={interactionBoundsRef}
        navScaleMultiplier={navScaleMultiplier}
        isCoarsePointer={isCoarsePointer}
        performanceTier={performanceTier}
      />
      {shouldRenderComposer && (
        <EffectComposer>
          {shouldRenderBloom && (
            <Bloom
              luminanceThreshold={tunedBloomThreshold}
              intensity={tunedBloomIntensity}
              blendFunction={BlendFunction.ADD}
            />
          )}
          {shouldRenderNoise && (
            <>
              {effectiveNoise > 0 && (
                <Noise opacity={effectiveNoise} blendFunction={BlendFunction.OVERLAY} />
              )}
              {vignetteIntensity > 0 && (
                <Vignette
                  offset={0.3}
                  darkness={vignetteIntensity}
                  blendFunction={BlendFunction.NORMAL}
                />
              )}
            </>
          )}
        </EffectComposer>
      )}
    </>
  );
}
