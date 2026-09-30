/** @internal — pure helpers for scripts/eval-consistency.mjs (hds#343). */
/**
 * Component-set overlap between agent-built apps.
 *
 * An app's set is every value name it imports from `@hirobius/design-system`
 * or any subpath (`/patterns`, ...). The subpath is dropped on purpose: a
 * pattern re-exported from the root and from `/patterns` is the same
 * component. Type-only imports, side-effect imports (css) and default imports
 * are not components and are ignored. Namespace imports count by member
 * (`HDS.Card` -> `Card`).
 */
import { stripComments } from './violations.mjs';

const IMPORT_RE =
  /\bimport\s+(?!type\b)([^'";]*?)\s*from\s*(['"])@hirobius\/design-system(?:\/[^'"]*)?\2/g;

/** @param {string} src @returns {Set<string>} */
export function extractImports(src) {
  const code = stripComments(src);
  const names = new Set();
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(code))) {
    const clause = m[1];
    const named = /\{([\s\S]*?)\}/.exec(clause);
    if (named) {
      for (const raw of named[1].split(',')) {
        const spec = raw.trim();
        if (!spec || /^type\s/.test(spec)) continue;
        names.add(spec.split(/\s+as\s+/)[0].trim());
      }
    }
    const ns = /\*\s*as\s+([A-Za-z_$][\w$]*)/.exec(clause);
    if (ns) {
      const member = new RegExp(`\\b${ns[1].replace(/\$/g, '\\$')}\\.([A-Za-z_$][\\w$]*)`, 'g');
      let u;
      while ((u = member.exec(code))) names.add(u[1]);
    }
  }
  return names;
}

/** |A ∩ B| / |A ∪ B|; 0 when both are empty. */
export function jaccard(a, b) {
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * @param {Record<string,string>} apps app id -> all of that app's source text
 * @returns {{ pairs: {a:string,b:string,value:number}[], min: number|null }}
 */
export function pairwiseJaccard(apps) {
  const ids = Object.keys(apps).sort();
  const sets = Object.fromEntries(ids.map((id) => [id, extractImports(apps[id])]));
  const pairs = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      pairs.push({ a: ids[i], b: ids[j], value: jaccard(sets[ids[i]], sets[ids[j]]) });
    }
  }
  return { pairs, min: pairs.length ? Math.min(...pairs.map((p) => p.value)) : null };
}
