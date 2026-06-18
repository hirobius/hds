/**
 * Minimal telemetry logger.
 *
 * The full telemetry sink lives in the ops repo; in this standalone
 * design-system repo this is a no-op stub so the Figma generative pipeline
 * (scripts/build-figma-masters.mjs, pipeline/retry-loop.mjs) runs without an
 * ops dependency. Signature matches callers: log(event, data).
 */
export function log(_event, _data) {}

export default { log };
