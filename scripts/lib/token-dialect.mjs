/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hirobius.tokens.json is strict W3C DTCG (Format Module 2025.10) on disk: it
 * ships in the npm package, so any DTCG tool has to be able to read it.
 *
 * HDS keeps three composites DTCG has no type for. On disk each one carries a
 * valid DTCG form, with the HDS form under $extensions[HDS_NAMESPACE]:
 *
 *   spring     a cubicBezier token (the curve DTCG tools use); the extension
 *              holds { $type: 'spring', $value: { type, stiffness, damping, mass } }.
 *   elevation  the group's extension holds { $type: 'elevation' }; each level is
 *              a node with no $value (a DTCG group) whose extension holds
 *              { $value: { surface, shadow, border } }.
 *   motion     a group of DTCG transitions (duration, delay, timingFunction)
 *              whose extension holds { $type: 'motion' }. HDS motion is
 *              duration + easing with no delay, so a delay other than 0 is
 *              refused rather than dropped.
 *
 * In short: an extension $type replaces the node's $type, and an extension
 * $value makes the node a token with that $value.
 *
 * fromDtcg() returns the HDS form every build script has always read, so the
 * generated CSS, TypeScript and Figma model do not depend on which form is on
 * disk. It is pure (no fs) so the docs app can import it too.
 */

export const HDS_NAMESPACE = 'com.hirobius.hds';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const isZeroDuration = (d) =>
  d === 0 || d === '0ms' || d === '0s' || (isPlainObject(d) && d.value === 0);

/** Removes HDS_NAMESPACE from a node, and $extensions itself once empty. */
function withoutHdsExtension(node) {
  const { [HDS_NAMESPACE]: _hds, ...rest } = node.$extensions;
  const out = { ...node };
  if (Object.keys(rest).length) out.$extensions = rest;
  else delete out.$extensions;
  return out;
}

function motionValue(value, path) {
  if (!isPlainObject(value)) return value; // an alias to another motion token
  const { duration, delay, timingFunction, ...extra } = value;
  if (delay !== undefined && !isZeroDuration(delay)) {
    throw new Error(
      `${path.join('.')}: HDS motion has no delay, but the transition sets delay ${JSON.stringify(delay)}. Set it to 0ms, or make the token a plain transition by removing $extensions["${HDS_NAMESPACE}"].`,
    );
  }
  if (Object.keys(extra).length) {
    throw new Error(
      `${path.join('.')}: unexpected transition keys ${Object.keys(extra).join(', ')}.`,
    );
  }
  return { duration, easing: timingFunction };
}

function convert(node, path, inheritedType, inMotion) {
  if (!isPlainObject(node)) return node;
  const hds = isPlainObject(node.$extensions) ? node.$extensions[HDS_NAMESPACE] : undefined;
  const diskType = node.$type ?? inheritedType;
  let out = hds ? withoutHdsExtension(node) : node;
  let motion = inMotion;

  if (hds) {
    if (!isPlainObject(hds) || !(hds.$type || '$value' in hds)) {
      throw new Error(
        `${path.join('.')}: $extensions["${HDS_NAMESPACE}"] needs a $type, a $value, or both.`,
      );
    }
    if (hds.$type === 'motion') {
      if (diskType !== 'transition') {
        throw new Error(
          `${path.join('.')}: $extensions["${HDS_NAMESPACE}"] marks motion, which must be a DTCG transition (found ${diskType ?? 'no type'}).`,
        );
      }
      motion = true;
    }
    // HDS key order: $type, $value, then the rest.
    const { $type: _t, $value: _v, ...rest } = out;
    const $type = hds.$type ?? out.$type;
    const hasValue = '$value' in hds || '$value' in out;
    out = {
      ...($type ? { $type } : {}),
      ...(hasValue ? { $value: '$value' in hds ? hds.$value : out.$value } : {}),
      ...rest,
    };
    if ('$value' in hds) return out;
  }

  if ('$value' in out) {
    return motion && diskType === 'transition'
      ? { ...out, $value: motionValue(out.$value, path) }
      : out;
  }

  const res = {};
  for (const [key, child] of Object.entries(out)) {
    res[key] = key.startsWith('$') ? child : convert(child, [...path, key], diskType, motion);
  }
  return res;
}

/**
 * Returns the HDS form of a DTCG token tree. Does not mutate `raw`.
 * @param {object} raw parsed hirobius.tokens.json (or a tree of the same shape)
 * @returns {object}
 */
export function fromDtcg(raw) {
  return convert(raw, [], null, false);
}
