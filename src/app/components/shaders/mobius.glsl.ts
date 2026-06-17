/**
 * mobius.glsl.ts — Named GLSL constants for MobiusScene.
 *
 * Each export is one shader patch that gets stitched into Three.js's
 * MeshPhysicalMaterial via onBeforeCompile. They are module-level constants
 * so future edits show up as clean, reviewable diffs rather than buried
 * mutations inside a 1 500-line component file.
 *
 * Assembly order (vertex):
 *   1. MOBIUS_VERTEX_COMMON   → replaces '#include <common>'
 *   2. MOBIUS_VERTEX_NORMAL   → replaces '#include <beginnormal_vertex>'
 *   3. MOBIUS_VERTEX_DEFORMATIONS → replaces '#include <begin_vertex>'
 *
 * Assembly order (fragment):
 *   4. MOBIUS_FRAGMENT_COMMON → replaces '#include <common>'
 *   5. MOBIUS_FRAGMENT_PATCHES → replaces 'vec4 diffuseColor = …'
 */

// ── Pass 0: Vertex uniform declarations + shared helper functions ────────────
//
// Declares every uniform consumed by the vertex shader and three pure GLSL
// helpers shared across deformation passes:
//   • mobius_rodrigues — Rodrigues rotation formula; rotates v around unit
//     axis k by angle theta. Used by the twist pass and the normal-rotation
//     patch to keep normals consistent with the deformed geometry.
//   • mobius_wave — single-axis sinusoidal compression wave parameterised by
//     path position (uv.x). Driven by uWaveFrequency / uWaveAmplitude /
//     uWaveSpeed. Returns a scalar pinch magnitude (not a vector).
//   • mobius_hash — 3-component pseudo-random hash. Used by the glitch and
//     pixelate passes to generate per-vertex and per-block noise.
//
// Uniforms consumed here (declared, not read yet):
//   uTime, uPathRadius, uBlend, uTwistCount, uTwistAmount, uRollSpeed,
//   uPixelate, uPixelGrid, uPixelShuffle, uMouse, uMouseVelocity,
//   uMouseScreen, uMouseFlow, uDragOffset, uDragTarget, uDragDirection,
//   uObjectCenter, uStretchRadius, uStretchStrength, uLiquidStrength,
//   uRippleRadius, uRippleFrequency, uLiquidWaveSpeed, uSealedEdges,
//   uMagneticDrag, uMagneticSwirl, uMagneticDepth, uWaveAmplitude,
//   uWaveFrequency, uWaveSpeed, uGlitchIntensity, uSpringTime,
//   uIsDragging, uThinning, uDragAngle
//
// Varying declared here: vMobiusUv — carries uv.x/uv.y into fragment shader.
export const MOBIUS_VERTEX_COMMON = `#include <common>

uniform float uTime;
uniform float uPathRadius;
uniform float uBlend;
uniform float uTwistCount;
uniform float uTwistAmount;
uniform float uRollSpeed;
uniform float uPixelate;
uniform float uPixelGrid;
uniform float uPixelShuffle;
uniform vec3 uMouse;
uniform vec3 uMouseVelocity;
uniform vec2 uMouseScreen;
uniform vec2 uMouseFlow;
uniform vec2 uDragOffset;
uniform vec3 uDragTarget;
uniform vec3 uDragDirection;
uniform vec3 uObjectCenter;
uniform float uStretchRadius;
uniform float uStretchStrength;
uniform float uLiquidStrength;
uniform float uRippleRadius;
uniform float uRippleFrequency;
uniform float uLiquidWaveSpeed;
uniform float uSealedEdges;
uniform float uMagneticDrag;
uniform float uMagneticSwirl;
uniform float uMagneticDepth;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uWaveSpeed;
uniform float uGlitchIntensity;
uniform float uSpringTime;
uniform float uIsDragging;
uniform float uThinning;
uniform float uDragAngle;
varying vec2 vMobiusUv;

// Rodrigues rotation — rotate v around unit axis k by angle theta
vec3 mobius_rodrigues(vec3 v, vec3 k, float theta) {
  float c = cos(theta), s = sin(theta);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

// Compression wave: sinusoidal pinch traveling the tube path
float mobius_wave(float pathPos) {
  float s = sin(uWaveFrequency * pathPos * 6.2831853 + uTime * uWaveSpeed);
  return uWaveAmplitude * s * s;
}

// Pseudo-random hash for glitch vertex displacement
vec3 mobius_hash(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.zxy, p.yxz + 19.19);
  return fract(vec3(p.x * p.y, p.y * p.z, p.z * p.x));
}`;

// ── Pass 0b: Normal-vector rotation (smooth-shaded presets) ─────────────────
//
// Applies the same Möbius twist to the per-vertex normal that the deformation
// pass applies to the position. Without this patch, normals still point at the
// original untwisted surface and lighting shading becomes incorrect when
// uTwistCount / uTwistAmount are non-zero.
//
// Visual signature: in smooth-shaded presets the specular highlight tracks the
// twisted ribbon band correctly; removing this patch causes the highlight to
// appear to orbit around the wrong axis.
//
// Uniforms consumed: uTwistCount, uTwistAmount, uTime, uRollSpeed
// Reads: uv.x (tube path parameter, 0→1 around the loop), objectNormal
// Writes: objectNormal (mutated in-place before the lighting stage reads it)
export const MOBIUS_VERTEX_NORMAL = `#include <beginnormal_vertex>

{
  float _pa  = uv.x * 6.28318530718;
  vec3  _tgt = normalize(vec3(-sin(_pa), cos(_pa), 0.0));
  float _ta  = uv.x * 3.14159265359 * uTwistCount * uTwistAmount + uTime * uRollSpeed;
  vec3 _rotatedNormal = mobius_rodrigues(objectNormal, _tgt, _ta);
  objectNormal = _rotatedNormal;
}`;

// ── Passes 1–6: Vertex position deformations ────────────────────────────────
//
// All six deformation passes are combined in a single '#include <begin_vertex>'
// replacement so each pass can read the `transformed` position output by the
// previous one. Splitting into separate replaces would require additional hooks
// or custom chunk ordering — the combined approach keeps the assembly thin.
//
// Pass 1 — Möbius Twist + Global Core Thinning
//   Applies the Rodrigues-based twist that converts a plain torus into a Möbius
//   strip. The cross-section at every path position is rotated around the local
//   tangent by uTwistCount × uTwistAmount × π (1 = classic Möbius, 0 = torus).
//   uRollSpeed animates the phase so the strip appears to roll continuously.
//   uThinning squeezes the tube cross-section inward proportionally to the
//   current drag stretch magnitude, preventing vertices from interpenetrating
//   when the strip is pulled hard. A spring-bounce envelope (uSpringTime,
//   uIsDragging) gives the snap-back its characteristic elastic feel.
//   The triangleCenter nudge bends the circular ring toward a rounded-triangle
//   path, adding the signature HDS logo silhouette without rebuilding geometry.
//   Uniforms: uPathRadius, uBlend, uTwistCount, uTwistAmount, uRollSpeed,
//             uSpringTime, uIsDragging, uStretchStrength, uThinning
//
// Pass 2 — Compression Wave
//   A sinusoidal "pinch" that travels the tube path, driven by mobius_wave().
//   seamFade zeroes the displacement near uv.x ≈ 0/1 (the geometry weld seam),
//   preventing the mesh from tearing where toCreasedNormals has split
//   coincident vertices. Active only when uWaveAmplitude > 0.
//   Uniforms: uWaveAmplitude (guard), uWaveFrequency, uWaveSpeed (via mobius_wave)
//
// Pass 3 — Glitch Displacement
//   Pseudo-random per-vertex displacement using mobius_hash(). The hash seed
//   includes floor(uTime × 8) so the noise pattern snaps to a new configuration
//   eight times per second (the characteristic "digital glitch" stutter).
//   Active only when uGlitchIntensity > 0.
//   Uniforms: uGlitchIntensity (guard), uTime
//
// Pass 4 — Magnetic Liquid Mesh
//   Projects each vertex to screen space, measures its distance from
//   uMouseScreen, then applies a pressure-weighted flow displacement composed
//   of a drag component (uMouseFlow × uMagneticDrag) and a tangential swirl
//   component (perpendicular-to-diff × flowMagnitude × uMagneticSwirl).
//   The resulting screen-space flow is lifted into world-space Z by
//   uMagneticDepth to produce a subtle bulge toward the camera.
//   Active only when uLiquidStrength ≠ 0.
//   Uniforms: uLiquidStrength (guard), uMouseScreen, uMouseFlow, uRippleRadius,
//             uRippleFrequency, uMagneticDrag, uMagneticSwirl, uMagneticDepth
//
// Pass 5 — Direct Drag Stretch (V-Shape Rubber Band + 1:1 Tracking)
//   Stretches vertices along the drag direction (uDragDirection) by an amount
//   weighted by how closely each vertex aligns with that direction (dotDist →
//   globalMask). A cosine-envelope spring (uSpringTime, uIsDragging) drives
//   the snap-back bounce after the user releases. An additional pinch force
//   draws off-axis vertices toward the stretch axis, creating the rubber-band
//   V-shape. A small Z push (currentStretch × 0.08) makes the strip lean into
//   the drag like a physical object. Active when drag offset is non-zero OR
//   the spring is still decaying (uSpringTime < 2.0).
//   Uniforms: uDragOffset (length guard), uSpringTime, uDragDirection,
//             uStretchStrength, uIsDragging
//
// Pass 6 — Linear Digital Breakup (Pixelate)
//   Snaps vertex positions to a regular grid of size uPixelGrid × 0.18, then
//   adds a cross-fading per-block noise generated by mobius_hash() seeded on
//   the block coordinates and a time-stepped shuffle counter. shuffleBlend
//   cross-fades between consecutive noise frames so the blocks don't pop
//   instantly. seamMask suppresses the effect near the geometry weld seam.
//   Active only when uPixelate > 0.
//   Uniforms: uPixelate (guard), uPixelGrid, uPixelShuffle, uTime
export const MOBIUS_VERTEX_DEFORMATIONS = `#include <begin_vertex>

// 1. Möbius twist + Global Core Thinning
{
  vMobiusUv = vec2(fract(uv.x), fract(uv.y));
  float pathAngle  = uv.x * 6.28318530718;
  vec3  pathCenter = vec3(uPathRadius * cos(pathAngle), uPathRadius * sin(pathAngle), 0.0);
  vec3  tgt        = normalize(vec3(-sin(pathAngle), cos(pathAngle), 0.0));
  float tangle     = uv.x * 3.14159265359 * uTwistCount * uTwistAmount + uTime * uRollSpeed;
  vec3 offset      = transformed - pathCenter;
  float decay      = exp(-uSpringTime * 3.0);
  float bounce     = cos(uSpringTime * 12.0) * decay;
  float springFactor = mix(bounce, 1.0, uIsDragging);
  float globalStretch = uStretchStrength * springFactor;
  // Allow pronounced necking while preserving a readable ribbon volume.
  float squeeze = 1.0 - clamp(globalStretch * uThinning * 0.6, 0.0, 0.48);
  offset *= squeeze;
  transformed = pathCenter + mobius_rodrigues(offset, tgt, tangle);

  // Bend the circular ring toward a rounded triangle without changing the
  // underlying tube path or twist axis. This preserves the rolling tube read.
  vec3 triangleCenter = vec3(
    uPathRadius * (cos(pathAngle) - uBlend * cos(pathAngle * 2.0)),
    uPathRadius * (sin(pathAngle) + uBlend * sin(pathAngle * 2.0)),
    0.0
  );
  transformed.xy += triangleCenter.xy - pathCenter.xy;
}

// 2. Compression wave
// seamFade zeroes the displacement at the weld (uv.x ≈ 0/1) where toCreasedNormals
// splits coincident vertices, preventing the mesh from tearing open during the wave.
if (uWaveAmplitude > 0.0) {
  float seamDist = min(vMobiusUv.x, 1.0 - vMobiusUv.x);
  float seamFade = smoothstep(0.0, 0.06, seamDist);
  float pinch = mobius_wave(uv.x) * seamFade;
  transformed -= objectNormal * pinch;
}

// 3. Glitch displacement
if (uGlitchIntensity > 0.0) {
  vec3 noise = mobius_hash(position + floor(uTime * 8.0) * 0.1);
  transformed += (noise - 0.5) * uGlitchIntensity * 0.12;
}

// 4. Magnetic liquid mesh — smear the surface with a 2D fluid-like flow field.
if (uLiquidStrength != 0.0) {
  vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  vec2 screenUv = (clipPosition.xy / max(clipPosition.w, 0.0001)) * 0.5 + 0.5;
  vec2 diff = screenUv - uMouseScreen;
  float dist = length(diff);
  float radius = mix(0.04, 0.3, clamp((uRippleRadius - 0.1) / 4.9, 0.0, 1.0));
  float influence = 1.0 - smoothstep(0.0, radius, dist);
  float pressureCurve = mix(0.8, 2.8, clamp((uRippleFrequency - 1.0) / 19.0, 0.0, 1.0));
  float pressure = pow(max(influence, 0.0), pressureCurve);
  vec2 flowVelocity = uMouseFlow;
  float flowMagnitude = length(flowVelocity);
  vec2 tangent = dist > 0.0001 ? normalize(vec2(-diff.y, diff.x)) : vec2(0.0);
  vec2 swirl = tangent * flowMagnitude * uMagneticSwirl;
  vec2 drag = flowVelocity * uMagneticDrag;
  vec2 flow = (drag + swirl) * pressure * uLiquidStrength * 0.045;
  transformed.x += flow.x;
  transformed.y += flow.y;
  transformed.z += length(flow) * abs(uLiquidStrength) * uMagneticDepth;
}

// 5. Direct drag stretch — V-Shape Rubber Band + 1:1 Tracking
if (length(uDragOffset) > 0.0001 || uSpringTime < 2.0) {
  vec3 dragDir = normalize(uDragDirection);
  vec3 localVertexDir = normalize(transformed);
  float dotDist = dot(localVertexDir, dragDir);
  float globalMask = smoothstep(-0.3, 1.0, dotDist);

  float seamDistance = min(vMobiusUv.x, 1.0 - vMobiusUv.x);
  float seamBlend = 0.96 + 0.04 * smoothstep(0.0, 0.14, seamDistance);
  float decay = exp(-uSpringTime * 3.5);
  float bounce = cos(uSpringTime * 12.0) * decay;
  float springFactor = mix(bounce, 1.0, uIsDragging);
  float pullPower = pow(globalMask, 1.1) * seamBlend;
  float currentStretch = pullPower * uStretchStrength * springFactor;

  vec3 pointOnAxis = dragDir * dot(transformed, dragDir);
  vec3 pinchVector = pointOnAxis - transformed;
  float pinchStrength = globalMask * (1.0 - globalMask) * 2.5;
  float pinchAmount = currentStretch * 0.35 * pinchStrength;

  transformed += dragDir * currentStretch;
  transformed += pinchVector * pinchAmount;
  transformed.z += currentStretch * 0.08;
}

// 6. Linear digital breakup — snap the mesh into chunky blocks.
  if (uPixelate > 0.0) {
    float grid = max(uPixelGrid * 0.18, 1.0);
    float seamDistance = min(vMobiusUv.x, 1.0 - vMobiusUv.x);
    float seamMask = smoothstep(0.0, 0.035, seamDistance);
    float pixelStrength = clamp(uPixelate, 0.0, 1.0) * seamMask;
    vec3 snapped = floor(transformed * grid + 0.5) / grid;
    float shuffleRate = 1.2 + uPixelShuffle * 5.0;
    float shuffleTime = uTime * shuffleRate;
    float shuffleStep = floor(shuffleTime);
    float shuffleBlend = smoothstep(0.0, 1.0, fract(shuffleTime));
    vec3 blockSeed = vec3(
      floor(vMobiusUv.x * grid + 0.5),
      floor(vMobiusUv.y * grid + 0.5),
      shuffleStep
    );
    vec3 nextBlockSeed = vec3(blockSeed.xy, shuffleStep + 1.0);
    vec3 blockNoiseA = mobius_hash(blockSeed) - 0.5;
    vec3 blockNoiseB = mobius_hash(nextBlockSeed) - 0.5;
    vec3 blockNoise = mix(blockNoiseA, blockNoiseB, shuffleBlend) * (0.1 / grid);
    transformed = mix(transformed, snapped + blockNoise, pixelStrength);
  }`;

// ── Fragment: uniform declarations ──────────────────────────────────────────
//
// Declares the small subset of uniforms the fragment shader actually reads
// (the vertex shader declares its own set in MOBIUS_VERTEX_COMMON).
// Also re-declares the vMobiusUv varying so the fragment stage can access the
// per-vertex uv coordinates packed by Pass 1.
//
// Uniforms declared: uTime, uPixelate, uPixelGrid, uPixelShuffle,
//                    uSpringTime, uIsDragging
// Varying declared:  vMobiusUv
export const MOBIUS_FRAGMENT_COMMON = `#include <common>

uniform float uTime;
uniform float uPixelate;
uniform float uPixelGrid;
uniform float uPixelShuffle;
uniform float uSpringTime;
uniform float uIsDragging;
varying vec2 vMobiusUv;`;

// ── Fragment passes: pixelate shimmer + release flash ────────────────────────
//
// Pixelate Shimmer (guarded by uPixelate > 0)
//   Quantises vMobiusUv to a coarser grid matching the vertex-side block size,
//   then generates a per-block shimmer value by evaluating a sine wave over
//   the block's quantised coordinates. The shimmer creates a rolling colour
//   shift across the block grid (slight red+blue desaturation, green unchanged),
//   giving the pixelated surface a synthetic "LED matrix" look.
//   Uniforms: uPixelate (guard), uPixelGrid, uPixelShuffle, uTime
//
// Release Flash
//   Adds a brief additive white flash to diffuseColor immediately after the
//   user releases a drag. The flash amplitude decays with exp(-uSpringTime × 10)
//   and is only applied when uIsDragging < 0.5 (i.e. the drag has just ended).
//   Visual signature: a quick "pop" of brightness that coincides with the
//   spring-bounce snap-back.
//   Uniforms: uSpringTime, uIsDragging
export const MOBIUS_FRAGMENT_PATCHES = `vec4 diffuseColor = vec4( diffuse, opacity );
if (uPixelate > 0.0) {
  float uvGrid = max(uPixelGrid * 0.3, 1.0);
  vec2 blockUv = floor(vMobiusUv * uvGrid) / uvGrid;
  float shimmerPhase = uTime * (0.8 + uPixelShuffle * 2.2);
  float shimmer = 0.5 + 0.5 * sin((blockUv.x + blockUv.y) * uvGrid * 3.14159265 + shimmerPhase);
  float blockMask = smoothstep(0.42, 0.58, shimmer);
  vec3 shifted = vec3(
    diffuseColor.r * (0.84 + 0.16 * blockMask),
    diffuseColor.g * (0.96 - 0.08 * blockMask),
    diffuseColor.b * (1.0 - 0.08 * blockMask)
  );
  diffuseColor.rgb = mix(diffuseColor.rgb, shifted, clamp(uPixelate, 0.0, 1.0));
}
float releaseFlash = exp(-uSpringTime * 10.0) * 0.4;
diffuseColor.rgb += uIsDragging < 0.5 ? releaseFlash : 0.0;`;
