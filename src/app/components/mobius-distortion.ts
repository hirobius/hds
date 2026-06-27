/**
 * mobius-distortion.ts — Preserved, self-contained snapshot of the Möbius drag-physics
 * and distortion-shader assembly logic extracted from mobius-scene.tsx.
 *
 * This module is a preservation artifact — faithfully lifted from the deleted
 * MobiusMesh component so the shader/drag work can be reused or referenced
 * without re-integrating the full three.js / R3F scene stack.
 *
 * Nothing in the live app imports this module. It compiles clean and is kept
 * as a reusable, documented snapshot.
 *
 * @tier utility
 * @internal — not part of @hirobius/design-system public API.
 */

import * as THREE from 'three';
import {
  MOBIUS_VERTEX_COMMON,
  MOBIUS_VERTEX_NORMAL,
  MOBIUS_VERTEX_DEFORMATIONS,
  MOBIUS_FRAGMENT_COMMON,
  MOBIUS_FRAGMENT_PATCHES,
} from './shaders/mobius.glsl';

// ── Re-export GLSL constants so importers can compose their own shaders ───────
export {
  MOBIUS_VERTEX_COMMON,
  MOBIUS_VERTEX_NORMAL,
  MOBIUS_VERTEX_DEFORMATIONS,
  MOBIUS_FRAGMENT_COMMON,
  MOBIUS_FRAGMENT_PATCHES,
};

// ── Distortion shader assembly ────────────────────────────────────────────────

/**
 * applyMobiusDistortionShader — injects the full Möbius deformation shader
 * into a Three.js `MeshPhysicalMaterial` via `onBeforeCompile`.
 *
 * Initialises every custom uniform (uTime, uMagneticDrag, uIsDragging, etc.)
 * and stitches the five named GLSL constant blocks into the Three.js built-in
 * shader chunks via string replacement:
 *
 *   1. MOBIUS_VERTEX_COMMON   → replaces `#include <common>` in vertex shader
 *   2. MOBIUS_VERTEX_NORMAL   → replaces `#include <beginnormal_vertex>`
 *   3. MOBIUS_VERTEX_DEFORMATIONS → replaces `#include <begin_vertex>`
 *   4. MOBIUS_FRAGMENT_COMMON → replaces `#include <common>` in fragment shader
 *   5. MOBIUS_FRAGMENT_PATCHES → replaces the `vec4 diffuseColor = …` line
 *
 * @param shader — the `WebGLProgramParametersWithUniforms` instance passed by
 *   Three.js to `material.onBeforeCompile`.
 */
export function applyMobiusDistortionShader(
  shader: THREE.WebGLProgramParametersWithUniforms,
): void {
  // ── Uniform initialisation ───────────────────────────────────────────────
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

  // ── Shader assembly: stitch named GLSL constants into Three.js chunks ────
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
}

// ── Drag-physics types ────────────────────────────────────────────────────────

/** Mutable ref value for active drag state — mirrors `dragStateRef` in MobiusMesh. */
export type DragPhysicsState = {
  active: boolean;
  targetX: number;
  targetY: number;
};

/**
 * DragUniformInputs — all scalar and vector inputs consumed by
 * `updateDragUniforms`. Everything is passed as a plain value or scratch ref
 * so this module has zero dependency on useMobiusStore.
 */
export type DragUniformInputs = {
  // Drag state
  isDragging: boolean;
  dragOffsetRef: THREE.Vector2;
  dragTargetWorld: THREE.Vector3;
  dragDirectionWorld: THREE.Vector3;

  // Pointer / mouse
  pointerWorld: THREE.Vector3;
  gooPointer: THREE.Vector3;
  pointerVelocity: THREE.Vector3;
  mouseScreen: THREE.Vector2;
  mouseVelocity2D: THREE.Vector2;

  // Group transform (for local-cursor angle)
  groupMatrixWorld: THREE.Matrix4;
  groupPosition: THREE.Vector3;

  // Store-derived scalars (passed in; no store import here)
  pathRadius: number;
  blend: number;
  twistCount: number;
  uTwistAmount: number;
  rollSpeed: number;
  gridSize: number;
  distortionMode: string;
  rippleRadius: number;
  liquidStrength: number;
  rippleFrequency: number;
  waveSpeed: number;
  sealedEdges: boolean;
  magneticDrag: number;
  magneticSwirl: number;
  magneticDepth: number;
  uGlitchIntensity: number;
  uWaveAmplitude: number;
  uWaveFrequency: number;
  uWaveSpeed: number;

  // Frame-derived
  delta: number;
  reducedMotion: boolean;
  isCoarsePointer: boolean;
  routeTransitionDecay: number;
  hoverProximity: number;

  // Spring / release state
  wasDragging: boolean;
  releaseStrength: number;

  // Scratch vectors (reused across calls — caller owns allocation)
  scratchVec: THREE.Vector3;
  scratchVec2: THREE.Vector3;
  scratchMat4: THREE.Matrix4;
};

/**
 * computeDragOffset — updates `dragOffsetRef` in place by lerping toward
 * the current drag target each frame.
 *
 * @param dragOffset — mutable Vector2 tracking smoothed XY drag magnitude.
 * @param dragState — current drag state (active flag + raw target values).
 */
export function computeDragOffset(dragOffset: THREE.Vector2, dragState: DragPhysicsState): void {
  dragOffset.x += (dragState.targetX - dragOffset.x) * (dragState.active ? 0.22 : 0.1);
  dragOffset.y += (dragState.targetY - dragOffset.y) * (dragState.active ? 0.22 : 0.1);
}

/**
 * computeDragTargetWorld — projects the pointer world position into the drag
 * target and direction vectors.
 *
 * @param dragTargetWorld — output: world-space pointer position.
 * @param dragDirectionWorld — output: normalised direction from group to pointer.
 * @param pointerWorld — current world-space pointer position.
 * @param groupPosition — group's world-space origin.
 */
export function computeDragTargetWorld(
  dragTargetWorld: THREE.Vector3,
  dragDirectionWorld: THREE.Vector3,
  pointerWorld: THREE.Vector3,
  groupPosition: THREE.Vector3,
): void {
  dragTargetWorld.copy(pointerWorld);
  dragDirectionWorld.copy(pointerWorld).sub(groupPosition);
  if (dragDirectionWorld.lengthSq() < 0.0001) {
    dragDirectionWorld.set(1, 0, 0);
  } else {
    dragDirectionWorld.normalize();
  }
}

/**
 * computePointerVelocity — updates the smoothed 3D pointer velocity ref.
 *
 * @param pointerVelocity — output: smoothed velocity (mutated in place).
 * @param pointerVelocityScratch — scratch vector reused across frames.
 * @param pointerWorld — current world-space pointer position.
 * @param previousPointerWorld — pointer position from the previous frame (updated in place).
 * @param delta — frame delta in seconds.
 * @param reducedMotion — when true, uses a lower smoothing factor.
 */
export function computePointerVelocity(
  pointerVelocity: THREE.Vector3,
  pointerVelocityScratch: THREE.Vector3,
  pointerWorld: THREE.Vector3,
  previousPointerWorld: THREE.Vector3,
  delta: number,
  reducedMotion: boolean,
): void {
  pointerVelocityScratch
    .copy(pointerWorld)
    .sub(previousPointerWorld)
    .multiplyScalar(1 / Math.max(delta, 0.0001));
  pointerVelocity.lerp(pointerVelocityScratch, reducedMotion ? 0.08 : 0.18);
  previousPointerWorld.copy(pointerWorld);
}

/**
 * computeMouseVelocity2D — updates the smoothed 2D screen-space mouse velocity ref.
 *
 * @param mouseVelocity2D — output: smoothed 2D velocity (mutated in place).
 * @param mouseVelocity2DScratch — scratch Vector2.
 * @param mouseScreen — current normalised screen coords [0,1].
 * @param previousMouseScreen — screen coords from the previous frame (updated in place).
 * @param delta — frame delta in seconds.
 * @param reducedMotion — when true, uses a lower smoothing factor.
 */
export function computeMouseVelocity2D(
  mouseVelocity2D: THREE.Vector2,
  mouseVelocity2DScratch: THREE.Vector2,
  mouseScreen: THREE.Vector2,
  previousMouseScreen: THREE.Vector2,
  delta: number,
  reducedMotion: boolean,
): void {
  mouseVelocity2DScratch
    .copy(mouseScreen)
    .sub(previousMouseScreen)
    .multiplyScalar(1 / Math.max(delta, 0.0001));
  mouseVelocity2D.lerp(mouseVelocity2DScratch, reducedMotion ? 0.08 : 0.2);
  previousMouseScreen.copy(mouseScreen);
}

/**
 * updateDragUniforms — writes all drag- and distortion-related shader uniform
 * values into the given `shader` ref for the current frame. Must be called
 * after `computeDragOffset` and `computeDragTargetWorld`.
 *
 * This is a PURE function over its parameters — no reads from useMobiusStore.
 * Every store-derived scalar must be passed in via `inputs`.
 */
export function updateDragUniforms(
  shader: THREE.WebGLProgramParametersWithUniforms,
  inputs: DragUniformInputs,
  snapState: {
    snapOffsetRef: { x: number; y: number };
    snapTargetOffsetRef: { x: number; y: number };
    snapPhaseRef: { current: 'idle' | 'return' };
    releaseStrengthRef: { current: number };
    wasDraggingRef: { current: boolean };
  },
): void {
  const {
    isDragging,
    dragOffsetRef,
    dragTargetWorld,
    dragDirectionWorld: _dragDirectionWorld,
    pointerWorld,
    gooPointer,
    pointerVelocity,
    mouseScreen,
    mouseVelocity2D,
    groupMatrixWorld,
    groupPosition,
    pathRadius,
    blend,
    twistCount,
    uTwistAmount,
    rollSpeed,
    gridSize,
    distortionMode,
    rippleRadius,
    liquidStrength,
    rippleFrequency,
    waveSpeed,
    sealedEdges,
    magneticDrag,
    magneticSwirl,
    magneticDepth,
    uGlitchIntensity,
    uWaveAmplitude,
    uWaveFrequency,
    uWaveSpeed,
    delta,
    reducedMotion,
    isCoarsePointer,
    routeTransitionDecay,
    hoverProximity,
    scratchVec,
    scratchVec2,
    scratchMat4,
  } = inputs;

  const routeWaveAmplitude = routeTransitionDecay * 0.0;
  const routeWaveFrequency = routeTransitionDecay * 0.0;
  const routeWaveSpeed = routeTransitionDecay * 0.0;
  const routeTwistLift = routeTransitionDecay * 0.0;
  const hoverPixelCurve = hoverProximity * hoverProximity;
  const hoverHoldLift = hoverPixelCurve * Math.min(0.95, uGlitchIntensity * 0.7);
  const routePixelLift = routeTransitionDecay * Math.min(1.1, uGlitchIntensity);
  const shuffleStrength = Math.max(hoverPixelCurve, Math.min(1, routeTransitionDecay * 1.2));
  const pixelateStrength =
    distortionMode === 'linear' ? Math.min(1, hoverHoldLift + routePixelLift) : 0;
  const liquidEnvelope =
    distortionMode === 'magnetic' && !isCoarsePointer
      ? THREE.MathUtils.clamp(hoverProximity + routeTransitionDecay * 0.65, 0, 1)
      : 0;
  const timeStep = reducedMotion ? delta * 0.35 : delta;

  shader.uniforms['uTime'].value += timeStep;
  shader.uniforms['uPathRadius'].value = pathRadius;
  shader.uniforms['uBlend'].value = blend;
  shader.uniforms['uTwistCount'].value = twistCount;
  shader.uniforms['uTwistAmount'].value = uTwistAmount + routeTwistLift;
  shader.uniforms['uRollSpeed'].value = reducedMotion ? rollSpeed * 0.35 : rollSpeed;
  shader.uniforms['uPixelate'].value = pixelateStrength;
  shader.uniforms['uPixelGrid'].value = gridSize;
  shader.uniforms['uPixelShuffle'].value = distortionMode === 'linear' ? shuffleStrength : 0;
  shader.uniforms['uMouse'].value.lerp(gooPointer, reducedMotion ? 0.04 : 0.08);
  shader.uniforms['uMouseVelocity'].value.lerp(pointerVelocity, reducedMotion ? 0.08 : 0.16);
  shader.uniforms['uMouseScreen'].value.lerp(mouseScreen, reducedMotion ? 0.08 : 0.22);
  shader.uniforms['uMouseFlow'].value.lerp(mouseVelocity2D, reducedMotion ? 0.08 : 0.18);
  shader.uniforms['uDragOffset'].value.lerp(dragOffsetRef, reducedMotion ? 0.1 : 0.2);
  shader.uniforms['uDragTarget'].value.lerp(dragTargetWorld, reducedMotion ? 0.1 : 0.2);

  // Compute local-cursor angle from group inverse matrix
  const invMatrix = scratchMat4.copy(groupMatrixWorld).invert();
  const localCursor = scratchVec.copy(pointerWorld).applyMatrix4(invMatrix);
  const normalizedLocalCursor = scratchVec2.copy(localCursor).normalize();
  shader.uniforms['uDragAngle'].value = Math.atan2(localCursor.y, localCursor.x);
  shader.uniforms['uDragDirection'].value.copy(normalizedLocalCursor);

  shader.uniforms['uObjectCenter'].value.copy(groupPosition);
  shader.uniforms['uStretchRadius'].value = THREE.MathUtils.lerp(
    0.9,
    3.4,
    THREE.MathUtils.clamp(rippleRadius / 5, 0, 1),
  );

  // ── Release snap / shockwave ─────────────────────────────────────────────
  const isReleaseFrame = !isDragging && snapState.wasDraggingRef.current;
  if (isReleaseFrame) {
    const mag = dragOffsetRef.length();
    snapState.releaseStrengthRef.current = Math.min(mag / 1.4, 1);
    if (mag > 0.08) {
      const jumpDist = Math.min(mag, isCoarsePointer ? 3.4 : 3) * (isCoarsePointer ? 0.24 : 0.044);
      snapState.snapTargetOffsetRef.x = -(dragOffsetRef.x / mag) * jumpDist;
      snapState.snapTargetOffsetRef.y = -(dragOffsetRef.y / mag) * jumpDist;
      snapState.snapPhaseRef.current = 'return';
    }
    dragOffsetRef.x = 0;
    dragOffsetRef.y = 0;
  }

  // Snap state machine
  if (snapState.snapPhaseRef.current === 'return') {
    const snapIn = reducedMotion ? 0.18 : isCoarsePointer ? 0.6 : 0.6;
    const snapOut = reducedMotion ? 0.11 : isCoarsePointer ? 0.05 : 0.055;
    snapState.snapOffsetRef.x +=
      (snapState.snapTargetOffsetRef.x - snapState.snapOffsetRef.x) * snapIn;
    snapState.snapOffsetRef.y +=
      (snapState.snapTargetOffsetRef.y - snapState.snapOffsetRef.y) * snapIn;
    snapState.snapTargetOffsetRef.x += (0 - snapState.snapTargetOffsetRef.x) * snapOut;
    snapState.snapTargetOffsetRef.y += (0 - snapState.snapTargetOffsetRef.y) * snapOut;
    if (
      Math.abs(snapState.snapOffsetRef.x) < 0.001 &&
      Math.abs(snapState.snapOffsetRef.y) < 0.001 &&
      Math.abs(snapState.snapTargetOffsetRef.x) < 0.001 &&
      Math.abs(snapState.snapTargetOffsetRef.y) < 0.001
    ) {
      snapState.snapOffsetRef.x = 0;
      snapState.snapOffsetRef.y = 0;
      snapState.snapTargetOffsetRef.x = 0;
      snapState.snapTargetOffsetRef.y = 0;
      snapState.snapPhaseRef.current = 'idle';
    }
  }

  const rawStretch = isReleaseFrame ? 0 : dragOffsetRef.length();
  const MAX_STRETCH = 1.4;
  shader.uniforms['uStretchStrength'].value = Math.min(rawStretch, MAX_STRETCH);
  shader.uniforms['uLiquidStrength'].value =
    distortionMode === 'magnetic' ? liquidStrength * liquidEnvelope : 0;
  shader.uniforms['uRippleRadius'].value = rippleRadius;
  shader.uniforms['uRippleFrequency'].value = rippleFrequency;
  shader.uniforms['uLiquidWaveSpeed'].value = waveSpeed;
  shader.uniforms['uSealedEdges'].value = sealedEdges ? 1 : 0;
  shader.uniforms['uMagneticDrag'].value = magneticDrag;
  shader.uniforms['uMagneticSwirl'].value = magneticSwirl;
  shader.uniforms['uMagneticDepth'].value = magneticDepth;
  shader.uniforms['uGlitchIntensity'].value = uGlitchIntensity;
  shader.uniforms['uIsDragging'].value = isDragging ? 1 : 0;
  shader.uniforms['uThinning'].value = 0.5;

  // Spring time — drives snap-back bounce and shockwave pulse
  if (isDragging) {
    shader.uniforms['uSpringTime'].value = 0;
  } else if (snapState.wasDraggingRef.current || shader.uniforms['uSpringTime'].value < 2.0) {
    shader.uniforms['uSpringTime'].value += delta;
  }

  const springTime = shader.uniforms['uSpringTime'].value;
  const shockwaveAmp =
    !isDragging && springTime < 0.55
      ? 0.1 * Math.exp(-springTime * 7.5) * snapState.releaseStrengthRef.current
      : 0;
  const shockwaveFreq = shockwaveAmp > 0.005 ? 1.4 : 0;

  shader.uniforms['uWaveAmplitude'].value = uWaveAmplitude + routeWaveAmplitude + shockwaveAmp;
  shader.uniforms['uWaveFrequency'].value = uWaveFrequency + routeWaveFrequency + shockwaveFreq;
  shader.uniforms['uWaveSpeed'].value = uWaveSpeed + routeWaveSpeed;

  snapState.wasDraggingRef.current = isDragging;
}
