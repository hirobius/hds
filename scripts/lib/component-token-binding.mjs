/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * component-token-binding — does a component's source consume the
 * `component.*` token that describes the same property, and do the two agree?
 *
 * Nothing used to compare them. Button `sm` hard-coded `[&_svg]:size-3.5`
 * (14px) while `component.button.size.sm.iconSize` said 12px, and no gate
 * noticed, because no artifact records "token X is consumed by component Y's
 * property Z". `scripts/component-token-bindings.json` is that record; this
 * module is the engine that reads it, resolves what the component source says
 * (cva class strings, Tailwind utilities, token aliases, Light and Dark) and
 * classifies every `component.*` leaf:
 *
 *   BOUND             the source names `var(--component-<leaf>)`
 *   LITERAL-MATCH     the source says the same value some other way
 *                     (matchKind: alias | type-role | literal)
 *   LITERAL-MISMATCH  the source says a different value, in Light or Dark
 *   UNUSED            nothing in the source sets that property
 *
 * Pure: every input is passed in (see `analyze`), so the unit tests run it on
 * small fixtures. `scripts/check-component-token-binding.mjs` is the CLI.
 * Audit and design: hds#595 (token-binding audit, section 4).
 */

import ts from 'typescript';
import { COMMENT_LINE, varReferences } from './token-references.mjs';

export const CLASSES = ['BOUND', 'LITERAL-MATCH', 'LITERAL-MISMATCH', 'UNUSED'];

// ── Token resolution ─────────────────────────────────────────────────────────

const px = (n) => `${Math.round(n * 1000) / 1000}px`;

/** Flatten a DTCG token tree to `path -> node` (leaves have `$value`). */
export function flattenTokens(tree) {
  const out = new Map();
  const walk = (node, trail) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      out.set(trail.join('.'), node);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith('$')) walk(child, [...trail, key]);
    }
  };
  walk(tree, []);
  return out;
}

/** `--semantic-color-surface-raised` -> `semantic.color.surface.raised` (dashes in keys survive). */
export function buildVarIndex(flat) {
  const index = new Map();
  for (const key of flat.keys()) index.set(`--${key.replace(/\./g, '-')}`, key);
  return index;
}

/**
 * Build a resolver over a token tree. `resolveToken(path, mode)` follows
 * alias chains and takes each token's per-mode value, so a Dark-only
 * difference anywhere in the chain shows up.
 */
export function createTokenResolver(tree) {
  const flat = flattenTokens(tree);
  const varIndex = buildVarIndex(flat);

  const norm = (value, mode, seen) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('value' in value && 'unit' in value) {
        const n = Number(value.value);
        if (value.unit === 'px') return px(n);
        if (value.unit === 'rem') return px(n * 16);
        return `${n}${value.unit}`;
      }
      return null;
    }
    if (typeof value === 'number') return String(value);
    if (typeof value !== 'string') return null;
    const alias = /^\{([^}]+)\}$/.exec(value.trim());
    if (alias) return resolveToken(alias[1], mode, seen);
    const v = value.trim().toLowerCase();
    const rem = /^(-?\d*\.?\d+)rem$/.exec(v);
    if (rem) return px(Number(rem[1]) * 16);
    const dim = /^(-?\d*\.?\d+)px$/.exec(v);
    if (dim) return px(Number(dim[1]));
    return v;
  };

  function resolveToken(path, mode, seen = new Set()) {
    const node = flat.get(path);
    if (!node || seen.has(path)) return null;
    seen.add(path);
    const raw = node.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node.$value;
    return norm(raw, mode, seen);
  }

  /** A composite token (typography) -> its resolved fields. */
  function resolveComposite(path, mode) {
    const node = flat.get(path);
    const value = node?.$value;
    if (!value || typeof value !== 'object' || 'unit' in value) return null;
    const out = {};
    for (const [field, raw] of Object.entries(value)) out[field] = norm(raw, mode, new Set([path]));
    return out;
  }

  return { flat, varIndex, resolveToken, resolveComposite, has: (p) => flat.has(p) };
}

// ── CSS-ish value evaluation (var(), calc(), px, hex) ────────────────────────

/**
 * Evaluate a CSS value expression to a concrete string, or null when it is
 * not statically resolvable (opacity mixes, rgb(), unknown keywords).
 * Returns `{ value, ref }`; `ref` is the single token the value came from.
 */
export function evalCss(expr, env) {
  const text = String(expr).trim();
  const v = /^var\(\s*(--[\w-]+)\s*\)$/.exec(text);
  if (v) {
    const path = env.tokens.varIndex.get(v[1]);
    if (!path) return { value: null };
    return { value: env.tokens.resolveToken(path, env.mode), ref: path };
  }
  const calc = /^calc\((.+)\)$/s.exec(text);
  if (calc) {
    let bad = false;
    const flat = calc[1].replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name) => {
      const path = env.tokens.varIndex.get(name);
      const value = path ? env.tokens.resolveToken(path, env.mode) : null;
      if (!value || !/px$/.test(value)) bad = true;
      return value ?? 'NaNpx';
    });
    if (bad) return { value: null };
    const m = /^\s*(-?[\d.]+)px\s*(?:([+-])\s*(-?[\d.]+)px\s*)?$/.exec(flat);
    if (!m) return { value: null };
    const a = Number(m[1]);
    const b = m[3] === undefined ? 0 : Number(m[3]);
    return { value: px(m[2] === '-' ? a - b : a + b) };
  }
  const dim = /^(-?\d*\.?\d+)(px|rem)$/.exec(text);
  if (dim) return { value: px(Number(dim[1]) * (dim[2] === 'rem' ? 16 : 1)) };
  if (/^-?\d*\.?\d+$/.test(text)) return { value: text };
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return { value: text.toLowerCase() };
  if (/^(transparent|currentcolor|inherit)$/i.test(text)) return { value: text.toLowerCase() };
  return { value: null };
}

// ── Class parsing ────────────────────────────────────────────────────────────

/** Split on whitespace outside brackets. */
function splitClasses(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '[') depth++;
    if (ch === ']') depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/** `hover:[&_svg]:size-4` -> { variants: ['hover', '[&_svg]'], util: 'size-4' } */
export function parseClass(raw) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of raw) {
    if (ch === '[') depth++;
    if (ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ':' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  const util = cur.replace(/^!/, '');
  return { raw, variants: parts, util };
}

// ── cva extraction (classes, not just axes) ──────────────────────────────────

function nameOf(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return null;
}

function stringOf(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const l = stringOf(node.left);
    const r = stringOf(node.right);
    return l !== null && r !== null ? l + r : null;
  }
  if (ts.isParenthesizedExpression(node)) return stringOf(node.expression);
  if (ts.isArrayLiteralExpression(node)) {
    const parts = node.elements.map(stringOf);
    return parts.every((p) => p !== null) ? parts.join(' ') : null;
  }
  return null;
}

function keyOf(node) {
  if (!node) return null;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  return stringOf(node) ?? (ts.isNumericLiteral(node) ? node.text : null);
}

const unwrap = (node) => {
  let n = node;
  while (
    n &&
    (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression?.(n))
  ) {
    n = n.expression;
  }
  return n;
};

function prop(obj, name) {
  return obj.properties.find((p) => ts.isPropertyAssignment(p) && nameOf(p.name) === name);
}

function findDeclaration(sourceFile, name) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

/**
 * Read `const <name> = cva(base, { variants, compoundVariants, defaultVariants })`
 * as class strings. Returns null when the declaration or call is not found.
 *
 * @returns {{ base: string, axes: Record<string, Record<string, string>>,
 *   compound: { when: Record<string, string>, cls: string }[],
 *   defaults: Record<string, string> } | null}
 */
export function extractCvaClasses(sourceText, name) {
  const sf = ts.createSourceFile('m.tsx', sourceText, ts.ScriptTarget.Latest, true);
  const decl = findDeclaration(sf, name);
  const call = decl && unwrap(decl.initializer);
  if (!call || !ts.isCallExpression(call) || nameOf(call.expression) !== 'cva') return null;
  const base = stringOf(call.arguments[0]) ?? '';
  const config = call.arguments[1] && unwrap(call.arguments[1]);
  const axes = {};
  const compound = [];
  const defaults = {};
  if (config && ts.isObjectLiteralExpression(config)) {
    const variants = prop(config, 'variants');
    if (variants && ts.isObjectLiteralExpression(variants.initializer)) {
      for (const axis of variants.initializer.properties) {
        if (!ts.isPropertyAssignment(axis) || !ts.isObjectLiteralExpression(axis.initializer)) {
          continue;
        }
        const axisName = nameOf(axis.name);
        axes[axisName] = {};
        for (const option of axis.initializer.properties) {
          if (!ts.isPropertyAssignment(option)) continue;
          axes[axisName][nameOf(option.name)] = stringOf(option.initializer) ?? '';
        }
      }
    }
    const compoundNode = prop(config, 'compoundVariants');
    if (compoundNode && ts.isArrayLiteralExpression(compoundNode.initializer)) {
      for (const entry of compoundNode.initializer.elements) {
        if (!ts.isObjectLiteralExpression(entry)) continue;
        const when = {};
        let cls = '';
        for (const p of entry.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const key = nameOf(p.name);
          if (key === 'class' || key === 'className') cls = stringOf(p.initializer) ?? '';
          else when[key] = keyOf(p.initializer);
        }
        compound.push({ when, cls });
      }
    }
    const defaultNode = prop(config, 'defaultVariants');
    if (defaultNode && ts.isObjectLiteralExpression(defaultNode.initializer)) {
      for (const p of defaultNode.initializer.properties) {
        if (ts.isPropertyAssignment(p)) defaults[nameOf(p.name)] = keyOf(p.initializer);
      }
    }
  }
  return { base, axes, compound, defaults };
}

/**
 * Class strings found under `const <name> = { ...path... : { key: 'classes' } }`,
 * for the per-size lookup tables that sit next to a cva (Input's adornment padding).
 */
export function extractConstClasses(sourceText, name, trail, keys) {
  const sf = ts.createSourceFile('m.tsx', sourceText, ts.ScriptTarget.Latest, true);
  const decl = findDeclaration(sf, name);
  let node = decl && unwrap(decl.initializer);
  for (const step of trail) {
    if (!node || !ts.isObjectLiteralExpression(node)) return null;
    const next = prop(node, step);
    node = next && unwrap(next.initializer);
  }
  if (!node || !ts.isObjectLiteralExpression(node)) return null;
  const out = [];
  for (const key of keys) {
    const entry = prop(node, key);
    const text = entry && stringOf(entry.initializer);
    if (text) out.push(text);
  }
  return out.join(' ');
}

/** The ordered class list for one context: base, then each axis option, then compounds. */
export function composeClasses(cva, ctx) {
  const chosen = {};
  for (const axis of Object.keys(cva.axes)) chosen[axis] = ctx[axis] ?? cva.defaults[axis];
  const parts = [cva.base];
  for (const [axis, options] of Object.entries(cva.axes)) {
    if (chosen[axis] !== undefined && options[chosen[axis]] !== undefined) {
      parts.push(options[chosen[axis]]);
    }
  }
  for (const c of cva.compound) {
    const ok = Object.entries(c.when).every(([k, v]) => chosen[k] === v);
    if (ok) parts.push(c.cls);
  }
  return splitClasses(parts.join(' '));
}

// ── Utility -> property effects ──────────────────────────────────────────────

const WEIGHTS = { thin: 100, light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 };

/** Resolve the value part of a sizing utility (`4`, `3.5`, `[var(--x)]`, `scale-sm`). */
function sizeValue(key, env) {
  const arb = /^\[(.+)\]$/.exec(key);
  if (arb) {
    const inner = arb[1].replace(/^length:/, '').replace(/_/g, ' ');
    const r = evalCss(inner, env);
    const kind = /^var\(/.test(inner) || /^calc\(/.test(inner) ? 'alias' : 'literal';
    return { value: r.value, kind: r.value === null ? 'unresolvable' : kind, ref: r.ref };
  }
  const configured = env.tw.spacing?.[key];
  if (configured) {
    const r = evalCss(configured, env);
    return { value: r.value, kind: r.value === null ? 'unresolvable' : 'literal', ref: r.ref };
  }
  if (/^\d*\.?\d+$/.test(key)) return { value: px(Number(key) * 4), kind: 'literal' };
  if (key === 'px') return { value: '1px', kind: 'literal' };
  return { value: null, kind: 'unresolvable' };
}

const SIDED = {
  px: ['paddingL', 'paddingR'],
  py: ['paddingT', 'paddingB'],
  pl: ['paddingL'],
  pr: ['paddingR'],
  pt: ['paddingT'],
  pb: ['paddingB'],
  p: ['paddingL', 'paddingR', 'paddingT', 'paddingB'],
};

const colorKeyword = /^(transparent|current|inherit)$/;

/**
 * What one utility does, as `[{ prop, value, kind, ref }]`. `kind` is how the
 * value was reached: alias (role/semantic var), literal (numeric/px),
 * type-role (hds-type-*), unresolvable (opacity mixes and the like).
 * A utility that sets none of the properties this gate reads returns [].
 */
export function utilityEffects(util, env) {
  const out = [];
  const put = (propName, r) => out.push({ prop: propName, ...r });

  let m = /^hds-type-([\w-]+)$/.exec(util);
  if (m) {
    const fields = env.tokens.resolveComposite(`semantic.typography.${m[1]}`, env.mode);
    if (fields) {
      for (const [field, name] of [
        ['fontSize', 'fontSize'],
        ['fontWeight', 'fontWeight'],
        ['lineHeight', 'lineHeight'],
      ]) {
        put(name, { value: fields[field] ?? null, kind: 'type-role' });
      }
    }
    return out;
  }

  m = /^(min-h|min-w|h|w|size)-(.+)$/.exec(util);
  if (m) {
    const name = {
      'min-h': 'minHeight',
      'min-w': 'minWidth',
      h: 'height',
      w: 'width',
      size: 'size',
    }[m[1]];
    put(name, sizeValue(m[2], env));
    return out;
  }

  m = /^(px|py|pl|pr|pt|pb|p)-(.+)$/.exec(util);
  if (m) {
    const r = sizeValue(m[2], env);
    for (const side of SIDED[m[1]]) put(side, r);
    return out;
  }

  m = /^gap-(.+)$/.exec(util);
  if (m && !/^[xy]-/.test(m[1])) {
    put('gap', sizeValue(m[1], env));
    return out;
  }

  m = /^rounded(?:-(.+))?$/.exec(util);
  if (m && !/^(t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee)(-|$)/.test(m[1] ?? '')) {
    const key = m[1];
    if (key && /^\[/.test(key)) put('radius', sizeValue(key, env));
    else if (key === 'full') put('radius', { value: '9999px', kind: 'literal' });
    else if (key === 'none') put('radius', { value: '0px', kind: 'literal' });
    else if (key && env.tw.borderRadius?.[key]) {
      const r = evalCss(env.tw.borderRadius[key], env);
      put('radius', {
        value: r.value,
        kind: r.value === null ? 'unresolvable' : 'alias',
        ref: r.ref,
      });
    } else put('radius', { value: null, kind: 'unresolvable' });
    return out;
  }

  m = /^font-(thin|light|normal|medium|semibold|bold)$/.exec(util);
  if (m) {
    put('fontWeight', { value: String(WEIGHTS[m[1]]), kind: 'literal' });
    return out;
  }

  const colorOf = (name, propName) => {
    const hasOpacity = name.includes('/');
    const bare = name.split('/')[0];
    if (/^\[/.test(bare)) {
      const hint = /^\[(color|length):/.exec(bare)?.[1];
      const inner = bare
        .slice(1, -1)
        .replace(/^(color|length):/, '')
        .replace(/_/g, ' ');
      const r = evalCss(inner, env);
      const isLength = hint === 'length' || (!hint && r.value && /px$/.test(r.value));
      if (isLength) return { length: true, r, inner };
      return {
        prop: propName,
        value: hasOpacity || r.value === null ? null : r.value,
        kind: hasOpacity || r.value === null ? 'unresolvable' : 'alias',
        ref: r.ref,
      };
    }
    const cssVar = env.utilityMap.get(bare);
    if (cssVar) {
      const path = env.tokens.varIndex.get(cssVar);
      const value = path ? env.tokens.resolveToken(path, env.mode) : null;
      return {
        prop: propName,
        value: hasOpacity || value === null ? null : value,
        kind: hasOpacity || value === null ? 'unresolvable' : 'alias',
        ref: path,
      };
    }
    if (colorKeyword.test(bare) && !hasOpacity) {
      return { prop: propName, value: bare === 'current' ? 'currentcolor' : bare, kind: 'literal' };
    }
    if (hasOpacity) return { prop: propName, value: null, kind: 'unresolvable' };
    return null;
  };

  m = /^bg-(.+)$/.exec(util);
  if (m) {
    const c = colorOf(m[1], 'fill');
    if (c && !c.length) put('fill', c);
    return out;
  }
  m = /^inset-shadow-(.+)$/.exec(util);
  if (m && !/^\[/.test(m[1])) {
    const c = colorOf(m[1], 'fill');
    if (c && !c.length) put('fill', c);
    return out;
  }
  m = /^border-(.+)$/.exec(util);
  if (m) {
    const c = colorOf(m[1], 'borderColor');
    if (c && !c.length) put('borderColor', c);
    return out;
  }
  m = /^text-(.+)$/.exec(util);
  if (m) {
    const key = m[1];
    if (env.tw.fontSize?.[key]) {
      const r = evalCss(env.tw.fontSize[key], env);
      put('fontSize', {
        value: r.value,
        kind: r.value === null ? 'unresolvable' : 'literal',
        ref: r.ref,
      });
      return out;
    }
    const c = colorOf(key, 'color');
    if (c?.length)
      put('fontSize', {
        value: c.r.value,
        kind: c.r.value ? 'alias' : 'unresolvable',
        ref: c.r.ref,
      });
    else if (c) put('color', c);
  }
  return out;
}

// ── Leaf -> property inference ───────────────────────────────────────────────

/** Fixed table: leaf name -> the property it describes. */
export const PROP_BY_NAME = {
  height: 'height',
  minHeight: 'minHeight',
  minWidth: 'minWidth',
  width: 'width',
  paddingX: 'paddingX',
  paddingY: 'paddingY',
  padding: 'padding',
  itemSpacing: 'gap',
  gap: 'gap',
  iconSize: 'size',
  radius: 'radius',
  fontSize: 'fontSize',
  fontWeight: 'fontWeight',
  lineHeight: 'lineHeight',
  bg: 'fill',
  background: 'fill',
  activeBackground: 'fill',
  text: 'color',
  activeText: 'color',
  border: 'borderColor',
  borderError: 'borderColor',
  activeBorder: 'borderColor',
};

const STATE_BY_SEGMENT = {
  rest: [''],
  hover: ['hover', ''],
  pressed: ['active', 'hover', ''],
  disabled: ['disabled', ''],
};
const STATE_BY_SUFFIX = { Hover: ['hover', ''], Disabled: ['disabled', ''] };

const PROP_EXPAND = {
  paddingX: ['paddingL', 'paddingR'],
  paddingY: ['paddingT', 'paddingB'],
  padding: ['paddingL', 'paddingR', 'paddingT', 'paddingB'],
};

/** Match a dotted path against `size.*.height`; `*` captures a segment as $1, $2... */
function matchPattern(pattern, path) {
  const want = pattern.split('.');
  const have = path.split('.');
  if (want.length !== have.length) return null;
  const caps = [];
  for (let i = 0; i < want.length; i++) {
    if (want[i] === '*') caps.push(have[i]);
    else if (want[i] !== have[i]) return null;
  }
  return caps;
}

const fill = (value, caps) =>
  typeof value === 'string' ? value.replace(/\$(\d)/g, (_, i) => caps[Number(i) - 1] ?? '') : value;

/**
 * The binding spec of one leaf: which cva context it lives in, which property
 * it sets and which states to look through (most specific first).
 */
export function leafSpec(group, leafPath) {
  let rule = {};
  let caps = [];
  for (const candidate of group.rules ?? []) {
    const c = matchPattern(candidate.match, leafPath);
    if (c) {
      rule = candidate;
      caps = c;
      break;
    }
  }
  const segs = leafPath.split('.');
  let name = segs[segs.length - 1];
  let states = null;
  if (STATE_BY_SEGMENT[name] && segs.length > 1) {
    states = STATE_BY_SEGMENT[name];
    name = segs[segs.length - 2];
  }
  if (!states) {
    for (const [suffix, list] of Object.entries(STATE_BY_SUFFIX)) {
      if (name.endsWith(suffix) && name.length > suffix.length) {
        states = list;
        name = name.slice(0, -suffix.length);
        break;
      }
    }
  }
  const ctx = {};
  for (const [k, v] of Object.entries(rule.ctx ?? {})) ctx[k] = fill(v, caps);
  const propName = rule.prop ?? PROP_BY_NAME[name] ?? null;
  return {
    prop: propName,
    props: propName ? (PROP_EXPAND[propName] ?? [propName]) : [],
    states: rule.state ? [].concat(rule.state) : (states ?? ['']),
    ctx,
    cva: rule.cva ?? group.cva,
    declared: rule.declared ?? null,
    classesFrom: rule.classesFrom
      ? {
          const: rule.classesFrom.const,
          trail: rule.classesFrom.trail.map((t) => fill(t, caps)),
          keys: rule.classesFrom.keys,
        }
      : null,
    css: group.css?.leaves?.[leafPath] ?? null,
  };
}

// ── Evaluation ───────────────────────────────────────────────────────────────

const stateKey = (variants) => variants.join(':');

/** The value the source gives `props` in `states` for one mode, or null if it sets none. */
function observe(classes, spec, env) {
  const entries = [];
  for (const raw of classes) {
    const parsed = parseClass(raw);
    const isDark = parsed.variants.includes('dark');
    if (isDark && env.mode !== 'Dark') continue;
    entries.push({ ...parsed, variants: parsed.variants.filter((v) => v !== 'dark'), isDark });
  }
  // dark: classes come after (and so beat) the light ones for the same state.
  entries.sort((a, b) => Number(a.isDark) - Number(b.isDark));
  for (const state of spec.states) {
    const hits = {};
    for (const entry of entries) {
      if (stateKey(entry.variants) !== state) continue;
      for (const effect of utilityEffects(entry.util, env)) {
        if (spec.props.includes(effect.prop)) hits[effect.prop] = { ...effect, cls: entry.raw };
      }
    }
    const found = spec.props.map((p) => hits[p]).filter(Boolean);
    if (found.length) {
      const values = found.map((f) => f.value);
      const same = values.every((v) => v === values[0]);
      const unresolvable = found.some((f) => f.value === null);
      return {
        value: unresolvable ? null : same ? values[0] : values.join('/'),
        kind: unresolvable ? 'unresolvable' : found[0].kind,
        cls: [...new Set(found.map((f) => f.cls))].join(' '),
        state,
      };
    }
  }
  return null;
}

const show = (v) => (v === null || v === undefined ? 'unresolvable' : v);

/** `binding-ok: <group.leaf> <reason>` markers in a source (and in CSS comments). */
export function readMarkers(sourceText, groupNames) {
  const out = new Map();
  const bad = [];
  for (const line of String(sourceText).split('\n')) {
    const m = /binding-ok:\s*([A-Za-z][\w]*(?:\.[\w]+)+)\s*(.*)$/.exec(line);
    if (!m || !groupNames.has(m[1].split('.')[0])) continue;
    const reason = m[2].replace(/\*\/.*$/, '').trim();
    if (reason.length < 4) bad.push(m[1]);
    else out.set(m[1], reason);
  }
  return { allowed: out, missingReason: bad };
}

/**
 * Classify every `component.*` leaf.
 *
 * @param {{
 *   tokens: object,                       hirobius.tokens.json (parsed)
 *   map: object,                          scripts/component-token-bindings.json (parsed)
 *   sources: Record<string, string>,      repo-relative path -> text, for the component sources
 *   scan?: Record<string, string>,        extra files scanned for var(--component-*) borrowing
 *   css?: Record<string, string>,         repo-relative path -> text, for static.css mirrors
 *   utilityMap?: Map<string, string>,     Tailwind colour utility -> css var
 *   tailwind?: { spacing?: object, borderRadius?: object, fontSize?: object },
 * }} input
 */
export function analyze(input) {
  const { tokens: tree, map, sources = {}, scan = {}, css = {} } = input;
  const tokens = createTokenResolver(tree);
  const tw = input.tailwind ?? {};
  const utilityMap = input.utilityMap ?? new Map();
  const envFor = (mode) => ({ tokens, mode, tw, utilityMap });
  const groups = map.groups ?? {};
  const groupNames = new Set(Object.keys(groups));
  const results = [];
  const findings = [];
  const cssResults = [];

  const cvaCache = new Map();
  const cvaFor = (file, name) => {
    const key = `${file}#${name}`;
    if (!cvaCache.has(key)) {
      const text = sources[file];
      cvaCache.set(key, text === undefined ? undefined : extractCvaClasses(text, name));
    }
    return cvaCache.get(key);
  };

  // Where each component var is named, outside comments.
  const refs = new Map(); // leafId -> Set(file)
  for (const [file, text] of Object.entries({ ...sources, ...scan })) {
    for (const ref of varReferences(text)) {
      const name = /\((--[\w-]+)\)/.exec(ref.raw)[1];
      const path = tokens.varIndex.get(name);
      if (!path) {
        if (name.startsWith('--component-')) {
          findings.push({
            type: 'dangling-var',
            key: `dangling:${file}:${name}`,
            message: `${file} names ${name}, which is not a component token.`,
          });
        }
        continue;
      }
      if (!path.startsWith('component.')) continue;
      const id = path.slice('component.'.length);
      if (!refs.has(id)) refs.set(id, new Set());
      refs.get(id).add(file);
    }
  }

  const markers = new Map();
  const markerFiles = { ...sources, ...css };
  for (const [file, text] of Object.entries(markerFiles)) {
    const { allowed, missingReason } = readMarkers(text, groupNames);
    for (const [id, reason] of allowed) markers.set(id, { reason, file });
    for (const id of missingReason) {
      findings.push({
        type: 'marker-no-reason',
        key: `marker-no-reason:${id}`,
        message: `${file}: binding-ok marker for ${id} has no reason, so it allowlists nothing.`,
      });
    }
  }

  for (const [path] of tokens.flat) {
    if (!path.startsWith('component.')) continue;
    const rel = path.slice('component.'.length);
    const groupName = rel.split('.')[0];
    const leafPath = rel.split('.').slice(1).join('.');
    const id = rel;
    const group = groups[groupName];
    const row = { id, group: groupName, leaf: leafPath };

    if (!group) {
      results.push({
        ...row,
        class: 'UNMAPPED',
        detail: `No "${groupName}" group in the binding map.`,
      });
      findings.push({
        type: 'unmapped-group',
        key: `unmapped-group:${groupName}`,
        message: `component.${groupName}.* has no entry in scripts/component-token-bindings.json.`,
      });
      continue;
    }

    const spec = leafSpec(group, leafPath);
    const tokenLight = tokens.resolveToken(path, 'Light');
    const tokenDark = tokens.resolveToken(path, 'Dark');
    row.token = { Light: tokenLight, Dark: tokenDark };
    row.prop = spec.prop;

    const dashed = `--component-${groupName}-${leafPath.replace(/\./g, '-')}`;
    const sourceFile = group.source;
    const refFiles = [...(refs.get(id) ?? [])];
    const ownBound = sourceFile ? refFiles.includes(sourceFile) : false;
    const borrowed = refFiles.filter(
      (f) => f !== sourceFile && !(group.consumers ?? []).includes(f),
    );

    // Collect the classes this leaf's context sees.
    let classes = [];
    let sourceNote = null;
    if (sourceFile) {
      const cva = spec.cva ? cvaFor(sourceFile, spec.cva) : null;
      if (cva === undefined) sourceNote = `source ${sourceFile} not found`;
      else if (spec.cva && !cva) sourceNote = `cva ${spec.cva} not found in ${sourceFile}`;
      else if (cva) classes = composeClasses(cva, spec.ctx);
      if (spec.classesFrom && sources[sourceFile]) {
        const extra = extractConstClasses(
          sources[sourceFile],
          spec.classesFrom.const,
          spec.classesFrom.trail,
          spec.classesFrom.keys,
        );
        if (extra) classes = [...classes, ...splitClasses(extra)];
        else sourceNote = `const ${spec.classesFrom.const} not found in ${sourceFile}`;
      }
    }
    if (sourceNote) {
      findings.push({
        type: 'stale-map',
        key: `stale-map:${id}`,
        message: `${id}: ${sourceNote}; fix scripts/component-token-bindings.json.`,
      });
    }

    const namesVar = (cls) => cls.includes(`var(${dashed})`);
    const bound = ownBound || classes.some(namesVar);
    // Borrowing is a finding either way. It only counts as the leaf being
    // bound when the group has no component of its own (an orphan): a leaf
    // another component happens to name is not bound by the component it
    // describes (InlineCode names badge.bg while Badge renders something else).
    for (const file of borrowed) {
      findings.push({
        type: 'borrowed',
        key: `borrowed:${file}->${id}`,
        message: `${file} borrows component.${id}, which belongs to the ${groupName} group (${sourceFile ?? 'no source'}).`,
      });
    }
    if (bound || (borrowed.length && !sourceFile)) {
      results.push({
        ...row,
        class: 'BOUND',
        detail: bound ? `names var(${dashed})` : `borrowed by ${borrowed.join(', ')}`,
        code: { Light: tokenLight, Dark: tokenDark, via: `var(${dashed})` },
      });
      continue;
    }
    if (!sourceFile) {
      results.push({
        ...row,
        class: 'UNUSED',
        detail: 'orphan: no consuming component',
        note: group.orphan ?? null,
      });
      continue;
    }

    // Declared consumption (a JS lookup the class strings cannot show).
    let observed;
    if (spec.declared) {
      const text = sources[sourceFile] ?? '';
      if (!text.includes(spec.declared.evidence)) {
        findings.push({
          type: 'stale-evidence',
          key: `stale-evidence:${id}`,
          message: `${id}: declared evidence "${spec.declared.evidence}" is no longer in ${sourceFile}.`,
        });
      }
      observed = ['Light', 'Dark'].map((mode) => ({
        value: tokens.resolveToken(spec.declared.token, mode),
        kind: 'alias',
        cls: `declared: ${spec.declared.token}`,
        state: '',
      }));
    } else if (!spec.prop) {
      results.push({
        ...row,
        class: 'UNUSED',
        detail: `No property known for leaf "${leafPath}"; add a rule.`,
      });
      findings.push({
        type: 'unmappable-leaf',
        key: `unmappable:${id}`,
        message: `${id}: no property inferred; add a rule to the "${groupName}" group.`,
      });
      continue;
    } else {
      observed = ['Light', 'Dark'].map((mode) => observe(classes, spec, envFor(mode)));
    }

    const [oL, oD] = observed;
    if (!oL && !oD) {
      results.push({
        ...row,
        class: 'UNUSED',
        detail: sourceFile
          ? `nothing in ${sourceFile} sets ${spec.prop}${spec.cva ? ` (${spec.cva})` : ''}`
          : 'no consuming component',
        note: group.orphan ?? null,
      });
      continue;
    }

    const codeLight = oL ? oL.value : null;
    const codeDark = oD ? oD.value : null;
    const same =
      codeLight !== null && codeLight === tokenLight && codeDark !== null && codeDark === tokenDark;
    const kind = (oL ?? oD).kind;
    const entry = {
      ...row,
      class: same ? 'LITERAL-MATCH' : 'LITERAL-MISMATCH',
      code: { Light: show(codeLight), Dark: show(codeDark), via: (oL ?? oD).cls },
      detail: same
        ? `${(oL ?? oD).cls} = ${codeLight}`
        : `token ${tokenLight}${tokenLight !== tokenDark ? ` (Dark ${tokenDark})` : ''} vs ${(oL ?? oD).cls} = ${show(codeLight)}${codeLight !== codeDark ? ` (Dark ${show(codeDark)})` : ''}`,
    };
    if (same)
      entry.matchKind = kind === 'type-role' ? 'type-role' : kind === 'alias' ? 'alias' : 'literal';
    const marker = markers.get(id);
    if (marker) {
      entry.allowed = marker.reason;
    }
    results.push(entry);
  }

  // Markers that allow nothing (typo'd or already fixed leaves).
  const known = new Set(results.map((r) => r.id));
  for (const id of markers.keys()) {
    if (!known.has(id)) {
      findings.push({
        type: 'marker-unknown-leaf',
        key: `marker-unknown:${id}`,
        message: `binding-ok marker names ${id}, which is not a component token.`,
      });
    }
  }

  // Static CSS mirrors.
  for (const [groupName, group] of Object.entries(groups)) {
    if (!group.css) continue;
    const text = css[group.css.file];
    if (text === undefined) {
      findings.push({
        type: 'stale-map',
        key: `stale-map:css:${groupName}`,
        message: `${groupName}: css mirror ${group.css.file} not found.`,
      });
      continue;
    }
    const rules = parseCssRules(text);
    for (const [leafPath, locator] of Object.entries(group.css.leaves ?? {})) {
      const [selector, property, index] = locator.split('|').map((s) => s.trim());
      const id = `${groupName}.${leafPath}`;
      const path = `component.${id}`;
      if (!tokens.has(path)) continue;
      const decl = rules.get(selector)?.get(property);
      if (decl === undefined) {
        cssResults.push({ id, class: 'UNUSED', detail: `${selector} sets no ${property}` });
        continue;
      }
      const dashed = `--component-${groupName}-${leafPath.replace(/\./g, '-')}`;
      let value = decl;
      if (index !== undefined) {
        const parts = splitCssValue(decl);
        value = parts[Math.min(Number(index), parts.length - 1)] ?? decl;
        if (parts.length === 1) value = parts[0];
      }
      if (value.includes(`var(${dashed})`)) {
        cssResults.push({
          id,
          class: 'BOUND',
          detail: `${selector} ${property} names var(${dashed})`,
        });
        continue;
      }
      const code = {};
      let ref;
      for (const mode of ['Light', 'Dark']) {
        const r = evalCss(value, envFor(mode));
        code[mode] = r.value;
        ref = r.ref ?? ref;
      }
      const want = {
        Light: tokens.resolveToken(path, 'Light'),
        Dark: tokens.resolveToken(path, 'Dark'),
      };
      const same = code.Light !== null && code.Light === want.Light && code.Dark === want.Dark;
      cssResults.push({
        id,
        class: same ? 'LITERAL-MATCH' : 'LITERAL-MISMATCH',
        detail: `${selector} ${property}: ${value.replace(/\s+/g, ' ')} -> ${show(code.Light)}${code.Light !== code.Dark ? ` (Dark ${show(code.Dark)})` : ''}; token ${want.Light}${want.Light !== want.Dark ? ` (Dark ${want.Dark})` : ''}`,
      });
    }
  }

  return { results, cssResults, findings: dedupe(findings) };
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((f) => (seen.has(f.key) ? false : seen.add(f.key)));
}

// Tiny CSS reader: `selector { prop: value; }` with comments removed. Only
// top-level rules (no @media nesting) are read, which is all static.css's
// component blocks need. Declarations later in a rule win.
export function parseCssRules(text) {
  const stripped = String(text).replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = new Map();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(stripped))) {
    for (const selector of m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' '))) {
      if (!selector || selector.startsWith('@')) continue;
      if (!rules.has(selector)) rules.set(selector, new Map());
      for (const decl of m[2].split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        rules.get(selector).set(
          decl.slice(0, i).trim(),
          decl
            .slice(i + 1)
            .trim()
            .replace(/\s+/g, ' '),
        );
      }
    }
  }
  return rules;
}

function splitCssValue(value) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

// ── Summary, baseline ratchet, report ────────────────────────────────────────

export function summarize(results) {
  const counts = { BOUND: 0, 'LITERAL-MATCH': 0, 'LITERAL-MISMATCH': 0, UNUSED: 0, UNMAPPED: 0 };
  const matchKinds = { alias: 0, 'type-role': 0, literal: 0 };
  let allowed = 0;
  for (const r of results) {
    counts[r.class] = (counts[r.class] ?? 0) + 1;
    if (r.class === 'LITERAL-MATCH') matchKinds[r.matchKind] += 1;
    if (r.allowed) allowed += 1;
  }
  return { total: results.length, counts, matchKinds, allowed };
}

const ENFORCED = new Set(['LITERAL-MISMATCH', 'LITERAL-MATCH']);
const RANK = { 'LITERAL-MATCH': 1, 'LITERAL-MISMATCH': 2 };
/** New drift: not in the baseline, or worse than the baseline says (MATCH -> MISMATCH). */
const worse = (now, was) => was === undefined || RANK[now] > (RANK[was] ?? 0);

/**
 * Compare today's findings with the committed baseline. A finding is NEW when
 * it is a MISMATCH or LITERAL-MATCH (or a structural finding) the baseline
 * does not list, or lists as better than it is now (MATCH -> MISMATCH). A
 * baselined leaf that got fixed or improved is not an error; it is reported as
 * `fixed` so the baseline can be tightened.
 */
export function ratchet(analysis, baseline) {
  const known = baseline?.leaves ?? {};
  const knownCss = baseline?.css ?? {};
  const knownFindings = new Set(baseline?.findings ?? []);
  const fresh = [];
  const current = {};
  for (const r of analysis.results) {
    if (!ENFORCED.has(r.class)) continue;
    current[r.id] = r.class;
    if (r.allowed) continue;
    if (worse(r.class, known[r.id])) fresh.push({ key: r.id, class: r.class, message: r.detail });
  }
  const currentCss = {};
  for (const r of analysis.cssResults) {
    if (!ENFORCED.has(r.class)) continue;
    currentCss[r.id] = r.class;
    if (worse(r.class, knownCss[r.id]))
      fresh.push({ key: `css:${r.id}`, class: r.class, message: r.detail });
  }
  for (const f of analysis.findings) {
    if (!knownFindings.has(f.key)) fresh.push({ key: f.key, class: f.type, message: f.message });
  }
  const fixed = [
    ...Object.keys(known).filter((k) => current[k] !== known[k]),
    ...Object.keys(knownCss)
      .filter((k) => currentCss[k] !== knownCss[k])
      .map((k) => `css:${k}`),
    ...[...knownFindings].filter((k) => !analysis.findings.some((f) => f.key === k)),
  ];
  return {
    fresh,
    fixed,
    baseline: {
      leaves: sortObject(current),
      css: sortObject(currentCss),
      findings: analysis.findings.map((f) => f.key).sort(),
    },
  };
}

function sortObject(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

const pad = (s, n) => String(s).padEnd(n);

export function formatReport(analysis, summary) {
  const lines = [];
  const rows = analysis.results;
  const w = Math.max(...rows.map((r) => r.id.length), 4);
  lines.push(`${pad('leaf', w)}  ${pad('class', 16)}  detail`);
  for (const r of rows) {
    const kind = r.matchKind ? ` (${r.matchKind})` : '';
    const allowed = r.allowed ? `  [binding-ok: ${r.allowed}]` : '';
    lines.push(`${pad(r.id, w)}  ${pad(r.class + kind, 16)}  ${r.detail ?? ''}${allowed}`);
  }
  if (analysis.cssResults.length) {
    lines.push('', 'static.css mirrors');
    for (const r of analysis.cssResults)
      lines.push(`  ${pad(r.id, w)}  ${pad(r.class, 16)}  ${r.detail}`);
  }
  if (analysis.findings.length) {
    lines.push('', 'structural findings');
    for (const f of analysis.findings) lines.push(`  ${f.type}: ${f.message}`);
  }
  const c = summary.counts;
  lines.push(
    '',
    `${summary.total} component token leaves: ${c.BOUND} BOUND, ${c['LITERAL-MATCH']} LITERAL-MATCH ` +
      `(${summary.matchKinds.alias} alias, ${summary.matchKinds['type-role']} type-role, ${summary.matchKinds.literal} literal), ` +
      `${c['LITERAL-MISMATCH']} LITERAL-MISMATCH, ${c.UNUSED} UNUSED` +
      (c.UNMAPPED ? `, ${c.UNMAPPED} UNMAPPED` : '') +
      (summary.allowed ? `, ${summary.allowed} allowed by binding-ok` : ''),
  );
  return lines.join('\n');
}

export { COMMENT_LINE };
