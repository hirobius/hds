/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * validators/binding-completeness.mjs
 *
 * Manifest-level invariant, formerly exposed to the LLM retry loop. If a
 * componentSpec declares any tokens (`tokens` object or legacy
 * `tokenMapping`), it MUST also have a non-empty slots[] entry whose
 * tokenBinding has at least one resolved token-path value. Without
 * that, the (now-retired, #50) masters pipeline couldn't project a
 * Figma binding for the spec — declared tokens became orphans that
 * never reached the canvas.
 *
 * Walks the JSX, looks up each Hds* element in componentSpecs, and
 * emits BINDING_INCOMPLETE for any reference whose spec violates the
 * invariant. UNKNOWN_COMPONENT cases are left to manifest-validator —
 * this file only reports binding shape.
 *
 * Test ergonomics:
 *   - validate(string)                        — production path
 *   - validate({ jsx, manifestOverride })     — fixture path; override
 *     componentSpecs are merged on top of the real manifest so test
 *     cases can describe a synthetic spec without polluting the real
 *     hds-manifest.json.
 */

import { walkJsx, getElementName, loadManifest, parseOrError } from './lib/jsx.mjs';

function effectiveSpecs(manifestOverride) {
  const real = loadManifest().componentSpecs || {};
  if (manifestOverride && manifestOverride.componentSpecs) {
    return { ...real, ...manifestOverride.componentSpecs };
  }
  return real;
}

function specHasTokens(spec) {
  const tokens = spec.tokens && typeof spec.tokens === 'object' ? spec.tokens : null;
  const mapping =
    spec.tokenMapping && typeof spec.tokenMapping === 'object' ? spec.tokenMapping : null;
  return Boolean(
    (tokens && Object.keys(tokens).length > 0) || (mapping && Object.keys(mapping).length > 0),
  );
}

function specHasNonEmptySlotBindings(spec) {
  const slots = Array.isArray(spec.slots) ? spec.slots : [];
  if (slots.length === 0) return false;
  return slots.some((slot) => {
    const tb =
      slot && slot.tokenBinding && typeof slot.tokenBinding === 'object' ? slot.tokenBinding : null;
    if (!tb) return false;
    return Object.values(tb).some((v) => typeof v === 'string' && v.length > 0);
  });
}

function isBindingIncomplete(spec) {
  if (!spec) return false;
  if (!specHasTokens(spec)) return false;
  return !specHasNonEmptySlotBindings(spec);
}

function explain(spec, name) {
  const slots = Array.isArray(spec.slots) ? spec.slots : [];
  if (slots.length === 0) {
    return `${name} declares tokens but slots[] is missing — masters pipeline has nothing to bind`;
  }
  return (
    `${name} declares tokens and slots[] but every slot.tokenBinding is empty — ` +
    `masters pipeline cannot project a Figma binding`
  );
}

/**
 * @param {string|{jsx:string,manifestOverride?:object}} input
 * @returns {Promise<{ ok: boolean, errors: Array<{path, code, message, suggestion}> }>}
 */
export default async function validate(input) {
  let jsxString;
  let manifestOverride;
  if (typeof input === 'string') {
    jsxString = input;
  } else if (input && typeof input === 'object') {
    jsxString = typeof input.jsx === 'string' ? input.jsx : '';
    manifestOverride = input.manifestOverride;
  } else {
    jsxString = '';
  }

  const { ast, result } = parseOrError(jsxString);
  if (result) return result;

  const specs = effectiveSpecs(manifestOverride);
  const errors = [];
  const reported = new Set();

  walkJsx(ast, (element) => {
    const name = getElementName(element);
    if (!name) return;
    if (name[0] === name[0].toLowerCase()) return;
    if (reported.has(name)) return;

    const spec = specs[name];
    if (!spec) return;
    if (!isBindingIncomplete(spec)) return;

    reported.add(name);
    errors.push({
      path: name,
      code: 'BINDING_INCOMPLETE',
      message: explain(spec, name),
      suggestion:
        `Either add slots[] with non-empty tokenBinding to ${name} in public/hds-manifest.json, ` +
        `or pick a different binding-complete component for this slot.`,
    });
  });

  return { ok: errors.length === 0, errors };
}
