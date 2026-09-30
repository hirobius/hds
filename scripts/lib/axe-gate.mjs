/** @internal — axe classification helpers and the axe-core source loader shared by scripts/check-storybook-axe.mjs (hds#310) and the consistency harness (hds#344). */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * The axe-core engine source, for injecting into a page and running directly
 * (going through AxeBuilder re-injects the engine on every call). axe-core is a
 * dependency of @axe-core/playwright, not a direct one, so it is resolved from
 * there and no dependency is added. `root` is the repository root.
 */
export function loadAxeSource(root) {
  const pkg = fs.realpathSync(path.join(root, 'node_modules/@axe-core/playwright/package.json'));
  return fs.readFileSync(createRequire(pkg).resolve('axe-core/axe.min.js'), 'utf8');
}

/** The rule sets both scans run: WCAG 2.0 and 2.1 A/AA plus 2.2 AA. */
export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

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
