/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Structural validation of hirobius.tokens.json (V1–V5). Pure (no fs); split
 * out of scripts/build-tokens.mjs (hds#645).
 */

import { readModes } from './token-modes.mjs';
import { resolveAlias, walkTokens } from './token-tree.mjs';

// ── Token validator ───────────────────────────────────────────────────────────
/**
 * EXEMPT CONSUMERS
 *
 * Components that use CSS vars from theme.css directly should be explicitly
 * justified in their source and migrated toward semantic/component tokens.
 */

/**
 * Validates hirobius.tokens.json against HDS structural rules.
 * Returns an array of error strings. Empty array = pass.
 *
 * Rules enforced:
 *   V1 — Semantic/component tokens must alias a primitive, except
 *        computed color values expressed as oklch()
 *   V2 — All alias {refs} must resolve to an existing token path
 *   V3 — No circular alias chains
 *   V4 — $extensions namespace must be "com.figma.variables" (not com.hirobius.*)
 *   V5 — Mode keys must be "Light" / "Dark" (capitalized)
 */
export function validateTokens(raw) {
  const errors = [];

  // Build a flat path → node index for ref resolution
  const pathIndex = new Map();
  for (const { path } of walkTokens(raw)) {
    pathIndex.set(path.join('.'), true);
  }

  for (const { path, type, value, extensions } of walkTokens(raw)) {
    const dotPath = path.join('.');
    const tier = path[0];
    const isAlias = typeof value === 'string' && value.startsWith('{');

    // V1 — semantic/component tokens must be aliases unless they are
    // computed color values expressed as oklch().
    // Composite types (typography, transition, motion, shadow, elevation) are exempt:
    // DTCG spec requires their $value to be a composite object or a pre-composed
    // CSS string (shadows can layer multiple parts with hsl(var(--shadow-color) / α)
    // tints that no single primitive can express). Color tokens may also use oklch()
    // directly when the semantic layer needs a derived tint.
    const isComposite =
      type === 'typography' ||
      type === 'transition' ||
      type === 'motion' ||
      type === 'shadow' ||
      type === 'elevation';
    const isOklch = type === 'color' && typeof value === 'string' && value.startsWith('oklch(');
    if (
      (tier === 'semantic' || tier === 'component' || tier === 'role') &&
      !isAlias &&
      !isComposite &&
      !isOklch
    ) {
      errors.push(
        `V1 [${dotPath}] ${tier} token has raw value — must alias an upstream token (raw: "${String(value).slice(0, 60)}")`,
      );
    }

    // V2 — alias must resolve to a known path
    if (isAlias) {
      const ref = value.replace(/^\{|\}$/g, '');
      if (!pathIndex.has(ref)) {
        errors.push(`V2 [${dotPath}] alias "${value}" points to unknown path "${ref}"`);
      }
    }

    // V2b — elevation composite slots may carry aliases; verify each one resolves.
    if (type === 'elevation' && value && typeof value === 'object') {
      for (const [slot, slotVal] of Object.entries(value)) {
        if (typeof slotVal === 'string' && slotVal.startsWith('{')) {
          const slotRef = slotVal.replace(/^\{|\}$/g, '');
          if (!pathIndex.has(slotRef)) {
            errors.push(
              `V2 [${dotPath}.${slot}] alias "${slotVal}" points to unknown path "${slotRef}"`,
            );
          }
        }
      }
    }

    // V3 — circular references (build-time check via resolveAlias throws)
    if (isAlias) {
      try {
        resolveAlias(value, raw);
      } catch (e) {
        if (e.message.startsWith('Circular')) errors.push(`V3 [${dotPath}] ${e.message}`);
      }
    }

    // V4 — $extensions namespace check
    if (extensions) {
      for (const ns of Object.keys(extensions)) {
        if (ns.startsWith('com.hirobius')) {
          errors.push(`V4 [${dotPath}] stale namespace "${ns}" — use "com.figma.variables"`);
        }
      }
    }

    // V5 — mode key capitalization
    const modes = readModes(extensions);
    if (modes) {
      for (const key of Object.keys(modes)) {
        if (key === 'light' || key === 'dark') {
          errors.push(`V5 [${dotPath}] mode key "${key}" must be capitalized: "Light" / "Dark"`);
        }
      }
    }
  }

  return errors;
}
