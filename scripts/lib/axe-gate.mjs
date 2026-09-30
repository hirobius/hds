/** @internal — pure classification helpers for scripts/check-storybook-axe.mjs (hds#310). */

export const BLOCKING_IMPACTS = ['serious', 'critical'];
const ENTRY_KEYS = ['storyId', 'ruleId', 'reason', 'addedOn'];

/** Returns a list of problems with the allowlist file contents (empty when valid). */
export function validateAllowlist(entries) {
  if (!Array.isArray(entries)) return ['allowlist must be an array'];
  const problems = [];
  const seen = new Set();
  entries.forEach((e, i) => {
    const at = `entry ${i}`;
    for (const k of ENTRY_KEYS) {
      if (typeof e?.[k] !== 'string' || !e[k].trim()) problems.push(`${at}: missing ${k}`);
    }
    for (const k of Object.keys(e ?? {})) {
      if (!ENTRY_KEYS.includes(k)) problems.push(`${at}: unexpected key ${k}`);
    }
    const key = `${e?.storyId}::${e?.ruleId}`;
    if (seen.has(key)) problems.push(`${at}: duplicate ${key}`);
    seen.add(key);
  });
  return problems;
}

/**
 * scans: [{ storyId, theme, violations: [{ id, impact, nodes }], error }]
 * allowlist: [{ storyId, ruleId, reason, addedOn }] (an entry covers both themes)
 */
export function evaluateScan(scans, allowlist) {
  const blocking = [];
  const allowed = [];
  const errored = [];
  const retried = [];
  const matched = new Set();
  const allowKey = new Set(allowlist.map((e) => `${e.storyId}::${e.ruleId}`));

  for (const s of scans) {
    if (s.retried) retried.push({ storyId: s.storyId, theme: s.theme });
    if (s.error) {
      errored.push({ storyId: s.storyId, theme: s.theme, error: s.error });
      continue;
    }
    for (const viol of s.violations) {
      if (!BLOCKING_IMPACTS.includes(viol.impact)) continue;
      const item = {
        storyId: s.storyId,
        theme: s.theme,
        ruleId: viol.id,
        impact: viol.impact,
        nodes: viol.nodes,
      };
      const key = `${s.storyId}::${viol.id}`;
      if (allowKey.has(key)) {
        matched.add(key);
        allowed.push(item);
      } else {
        blocking.push(item);
      }
    }
  }

  const stale = allowlist.filter((e) => !matched.has(`${e.storyId}::${e.ruleId}`));
  return {
    scanned: scans.length,
    blocking,
    allowed,
    errored,
    retried,
    stale,
    ok: blocking.length === 0 && errored.length === 0 && stale.length === 0,
  };
}
