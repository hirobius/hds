import { loadCodeConnectTemplateCount, loadParityKnownCount } from '../lib/site-data';

/**
 * The number of Code Connect templates, read from figma/code-connect.json when
 * the site builds, so the "Figma and code" guide never states a stale count.
 */
export function CodeConnectCount() {
  return <>{loadCodeConnectTemplateCount()}</>;
}

/**
 * The number of known Figma and code differences, read from
 * figma/parity/baseline.json when the site builds.
 */
export function ParityKnownCount() {
  return <>{loadParityKnownCount()}</>;
}
