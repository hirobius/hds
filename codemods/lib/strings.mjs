/**
 * strings — HDS names inside text a codemod cannot rewrite: strings, template
 * literals and comments, such as an LLM prompt that teaches `<Stack
 * direction="vertical">` (hds#957, hirobius/ops#443). Each JSX-like tag in
 * that text is checked against the manifest this package ships and its
 * upgrade ledger, and what is wrong comes back as a warning:
 *
 *   'Use <Stack direction="vertical">'
 *   → { line: 1, text: '<Stack direction="vertical">: Stack direction takes row | column, not vertical' }
 *   `Render a <Calendar />`
 *   → { line: 1, text: '<Calendar>: Calendar is removed with no drop-in replacement, …' }
 *
 * A warning, never an edit: the text may describe another library, or quote
 * an old API on purpose. Checked: a component the manifest no longer lists
 * that a removed, folded or renamed step names (the step's `plain` says what to
 * do); and on a component it lists, a literal value of an enum prop that the
 * prop does not take, or a prop a prop-renamed step renamed. Unknown names
 * and props are left alone. Real JSX is code and is the codemods' and the
 * compiler's job, not this.
 *
 * Node builtins only.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maskSource } from '../unrewritable.mjs';
import { shippedSteps } from './removals.mjs';

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GONE = new Set(['removed', 'folded', 'renamed']);

let specs;
/** The manifest's componentSpecs (public/hds-manifest.json), or {} when it is not shipped. */
export function componentSpecs(pkgDir = PKG_DIR) {
  const read = () => {
    const file = join(pkgDir, 'public', 'hds-manifest.json');
    return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).componentSpecs ?? {}) : {};
  };
  if (pkgDir !== PKG_DIR) return read();
  specs ??= read();
  return specs;
}

// `<Name` or `<Ns.Name`, then attributes up to `>` on the same tag.
const TAG =
  /<((?:[A-Za-z_$][\w$]*\.)?[A-Z][\w$]*)((?:\s+[A-Za-z][\w-]*(?:\s*=\s*(?:"[^"\n]*"|'[^'\n]*'|\{[^}\n]*\}))?)*)\s*\/?>/g;
const ATTR = /([A-Za-z][\w-]*)\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)'|\{\s*(["'`])([^"'`\n]*)\4\s*\})/g;
const lineOf = (source, at) => source.slice(0, at).split('\n').length;

/**
 * @param {string} source a file's text
 * @param {{ steps?: object[], components?: Record<string, any> }} [options]
 * @returns {{ line: number, text: string }[]}
 */
export function findStringWarnings(
  source,
  { steps = shippedSteps(), components = componentSpecs() } = {},
) {
  if (!source.includes('<')) return [];
  const { code } = maskSource(source);
  const out = [];
  // Inside a string the attribute quotes may be escaped (`\"`): read them unescaped.
  const plain = source.replace(/\\(["'`])/g, ' $1');
  for (const m of plain.matchAll(TAG)) {
    // Text, not code: the masked source blanks a string, template or comment body.
    if (code[m.index] !== ' ') continue;
    const name = m[1].split('.').pop();
    const spec = Object.hasOwn(components, name) ? components[name] : null;
    const line = lineOf(source, m.index);
    if (!spec) {
      const step = steps.findLast(
        (s) => GONE.has(s.kind) && (s.detect?.imports ?? []).some((i) => i.names.includes(name)),
      );
      if (step) out.push({ line, text: `<${name}>: ${step.plain}` });
      continue;
    }
    for (const a of m[2].matchAll(ATTR)) {
      const prop = a[1];
      const value = a[2] ?? a[3] ?? a[5];
      const renamed = steps.findLast(
        (s) => s.kind === 'prop-renamed' && s.prop?.component === name && s.prop.name === prop,
      );
      const def = spec.props?.[prop];
      if (!def && renamed) {
        out.push({ line, text: `<${name} ${prop}>: ${renamed.plain}` });
        continue;
      }
      if (def?.type !== 'enum' || !Array.isArray(def.values) || def.values.includes(value))
        continue;
      const mapped = steps.findLast(
        (s) =>
          s.kind === 'prop-value-mapped' &&
          s.prop?.component === name &&
          s.prop.name === prop &&
          Object.hasOwn(s.prop.values ?? {}, value),
      );
      const use = mapped ? `; use ${mapped.prop.values[value]}` : '';
      out.push({
        line,
        text: `<${name} ${prop}="${value}">: ${name} ${prop} takes ${def.values.join(' | ')}, not ${value}${use}`,
      });
    }
  }
  return out;
}
