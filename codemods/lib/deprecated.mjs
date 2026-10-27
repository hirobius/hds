/**
 * Which versions of @hirobius/design-system npm marks deprecated (hds#472).
 * A bad release is yanked with `npm deprecate` (docs/RELEASING.md, "If a
 * release is bad"), and the upgrade command never moves a consumer onto one.
 *
 * HDS_UPGRADE_REGISTRY picks the source: unset reads the npm registry, `off`
 * reads nothing, anything else is a packument JSON file (the fixtures). It
 * fails open: an unreachable registry means nothing is known to be
 * deprecated, so an offline upgrade still runs. Node builtins only.
 */
import { readFileSync } from 'node:fs';
import { HDS_PACKAGE } from './installed-version.mjs';

export const REGISTRY_URL = `https://registry.npmjs.org/${HDS_PACKAGE.replace('/', '%2f')}`;
const TIMEOUT_MS = 3000;

/** version -> deprecation message, from a packument's `versions`. */
const fromPackument = (packument) =>
  new Map(
    Object.entries(packument?.versions ?? {})
      .filter(([, meta]) => typeof meta?.deprecated === 'string' && meta.deprecated !== '')
      .map(([version, meta]) => [version, meta.deprecated]),
  );

/**
 * @param {{ env?: Record<string, string|undefined>, fetch?: typeof globalThis.fetch }} [io]
 * @returns {Promise<Map<string, string>>}
 */
export async function readDeprecated({ env = process.env, fetch = globalThis.fetch } = {}) {
  const source = env.HDS_UPGRADE_REGISTRY?.trim();
  if (source === 'off') return new Map();
  try {
    if (source) return fromPackument(JSON.parse(readFileSync(source, 'utf8')));
    const res = await fetch(REGISTRY_URL, {
      // The abbreviated packument: small, and it still carries `deprecated`.
      headers: { Accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return new Map();
    return fromPackument(await res.json());
  } catch {
    return new Map();
  }
}
